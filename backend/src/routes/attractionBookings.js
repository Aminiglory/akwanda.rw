const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Attraction = require('../tables/attraction');
const AttractionBooking = require('../tables/attractionBooking');
const User = require('../tables/user');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function normalizeDay(v) {
  return String(v || '').trim().toLowerCase();
}

function parseTimeSlots(a) {
  const raw = (a && a.timeSlots != null) ? String(a.timeSlots) : '';
  const s = raw.trim();
  if (!s) {
    const open = String(a?.operatingHours?.open || '').trim();
    const close = String(a?.operatingHours?.close || '').trim();
    if (open && close) return [`${open}-${close}`];
    return [];
  }

  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr.map(x => String(x || '').trim()).filter(Boolean);
      }
    } catch (_) {
      // ignore
    }
  }

  return s
    .split(/[\n,;]+/)
    .map(x => String(x || '').trim())
    .filter(Boolean);
}

async function computeAvailability({ attractionId, visitDate, tickets, timeSlot }) {
  const a = await Attraction.findById(attractionId).select('isActive capacity operatingHours owner price timeSlots');
  if (!a || !a.isActive) return { ok: false, status: 404, message: 'Attraction not found' };

  let when;
  const vd = String(visitDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(vd)) {
    const [y, m, d] = vd.split('-').map(n => Number(n));
    when = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  } else {
    when = new Date(visitDate);
  }
  if (Number.isNaN(when.getTime())) return { ok: false, status: 400, message: 'Invalid visit date' };

  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][when.getUTCDay()];
  const allowedDays = Array.isArray(a.operatingHours?.days) ? a.operatingHours.days.map(normalizeDay) : [];
  if (allowedDays.length > 0 && !allowedDays.includes(normalizeDay(day))) {
    return { ok: false, status: 400, message: 'Attraction is closed on selected date' };
  }

  const slots = parseTimeSlots(a);
  const requestedSlot = String(timeSlot || '').trim();
  if (slots.length > 0 && !requestedSlot) {
    return { ok: false, status: 400, message: 'Time slot required', reason: 'slot_required', slots };
  }
  if (slots.length > 0 && requestedSlot && !slots.includes(requestedSlot)) {
    return { ok: false, status: 400, message: 'Invalid time slot', reason: 'invalid_slot', slots };
  }

  const qty = Math.max(1, Number(tickets || 1));
  const capacity = Math.max(1, Number(a.capacity || 0) || 50);

  const start = new Date(when);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(when);
  end.setUTCHours(23, 59, 59, 999);

  const slotFilter = requestedSlot
    ? { $or: [{ timeSlot: requestedSlot }, { timeSlot: { $exists: false } }, { timeSlot: null }, { timeSlot: '' }] }
    : {};

  const booked = await AttractionBooking.find({
    attraction: a._id,
    visitDate: { $gte: start, $lte: end },
    status: { $ne: 'cancelled' },
    ...slotFilter
  }).select('numberOfPeople').lean();

  const alreadyBooked = (booked || []).reduce((sum, b) => sum + Number(b.numberOfPeople || 0), 0);
  const remaining = Math.max(0, capacity - alreadyBooked);
  const available = remaining >= qty;
  if (!available) {
    return { ok: false, status: 409, message: 'Not enough remaining capacity', remaining, capacity };
  }
  return { ok: true, attraction: a, when, qty, remaining, capacity, requestedSlot, slots };
}

function requireAuth(req, res, next) {
  const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Create attraction booking
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      attractionId,
      visitDate,
      tickets = 1,
      timeSlot,
      notes,
      contactPhone,
      paymentMethod,
      guestInfo,
      directBooking,
      paymentStatus
    } = req.body || {};
    if (!attractionId || !visitDate) return res.status(400).json({ message: 'Missing required fields' });
    const availability = await computeAvailability({ attractionId, visitDate, tickets, timeSlot });
    if (!availability.ok) {
      return res.status(availability.status).json({
        message: availability.message,
        remaining: availability.remaining,
        capacity: availability.capacity,
        reason: availability.reason,
        slots: availability.slots
      });
    }

    const a = availability.attraction;
    const when = availability.when;
    const qty = availability.qty;
    const requestedSlot = availability.requestedSlot;
    const unit = Number(a.price || 0);
    const total = unit * qty;

    const isOwner = String(a.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    const wantsDirect = !!directBooking;

    let guestId = req.user.id;
    if (guestInfo && (isOwner || isAdmin)) {
      const emailLower = (guestInfo.email || '').toLowerCase();
      let guestUser = emailLower ? await User.findOne({ email: emailLower }) : null;
      if (!guestUser) {
        const pwd = Math.random().toString(36).slice(2, 10);
        const passwordHash = await bcrypt.hash(pwd, 10);
        guestUser = await User.create({
          firstName: guestInfo.firstName || 'Guest',
          lastName: guestInfo.lastName || 'User',
          email: emailLower || `guest_${Date.now()}@example.com`,
          phone: guestInfo.phone || 'N/A',
          passwordHash,
          userType: 'guest'
        });
      }
      guestId = guestUser._id;
    }

    if (String(guestId) === String(a.owner) && !isAdmin) {
      return res.status(403).json({ message: 'Owners cannot book their own attraction' });
    }

    const validPaymentStatus = ['pending', 'paid', 'failed', 'refunded', 'unpaid'];
    const ps = validPaymentStatus.includes(String(paymentStatus || '').toLowerCase())
      ? String(paymentStatus).toLowerCase()
      : (wantsDirect ? 'paid' : 'pending');

    const pmRaw = String(paymentMethod || '').toLowerCase();
    const pm = pmRaw === 'mtn_mobile_money' ? 'mobile_money' : pmRaw;
    const validPaymentMethods = ['cash', 'card', 'mobile_money', 'bank_transfer'];
    const finalPaymentMethod = validPaymentMethods.includes(pm) ? pm : 'cash';

    const booking = await AttractionBooking.create({
      attraction: a._id,
      guest: guestId,
      visitDate: when,
      timeSlot: requestedSlot || '',
      numberOfPeople: qty,
      totalAmount: total,
      status: (wantsDirect && (isOwner || isAdmin)) ? 'confirmed' : 'pending',
      isDirect: wantsDirect && (isOwner || isAdmin),
      contactPhone: contactPhone || '',
      specialRequests: notes || '',
      paymentMethod: finalPaymentMethod,
      paymentStatus: ps
    });

    res.status(201).json({ booking });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create booking', error: e.message });
  }
});

// My attraction bookings (guest)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const list = await AttractionBooking.find({ guest: req.user.id })
      .sort({ createdAt: -1 })
      .populate('attraction');
    res.json({ bookings: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Owner: bookings for my attractions
router.get('/for-my-attractions', requireAuth, async (req, res) => {
  try {
    const myAttractionIds = await Attraction.find({ owner: req.user.id }).distinct('_id');
    const list = await AttractionBooking.find({ attraction: { $in: myAttractionIds } })
      .sort({ createdAt: -1 })
      .populate('attraction')
      .populate('guest', 'firstName lastName email phone');
    res.json({ bookings: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch owner bookings' });
  }
});

// Update booking status (owner or admin)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const b = await AttractionBooking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    const a = await Attraction.findById(b.attraction).select('owner');
    if (String(a.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { status } = req.body || {};
    const allowed = ['pending','confirmed','completed','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    b.status = status;
    await b.save();
    res.json({ booking: b });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// Booking details (guest, owner, or admin)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const b = await AttractionBooking.findById(req.params.id)
      .populate('attraction')
      .populate('guest', 'firstName lastName email phone userType')
      .lean();
    if (!b) return res.status(404).json({ message: 'Booking not found' });

    const ownerId = b?.attraction?.owner;
    const isGuest = String(b.guest?._id || b.guest) === String(req.user.id);
    const isOwner = ownerId && String(ownerId) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isGuest && !isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });
    return res.json({ booking: b });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load booking' });
  }
});

module.exports = router;
