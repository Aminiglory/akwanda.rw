const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Attraction = require('../tables/attraction');
const AttractionBooking = require('../tables/attractionBooking');
const User = require('../tables/user');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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
      notes,
      contactPhone,
      paymentMethod,
      guestInfo,
      directBooking,
      paymentStatus
    } = req.body || {};
    if (!attractionId || !visitDate) return res.status(400).json({ message: 'Missing required fields' });
    const a = await Attraction.findById(attractionId);
    if (!a || !a.isActive) return res.status(404).json({ message: 'Attraction not found' });

    const when = new Date(visitDate);
    if (isNaN(when)) return res.status(400).json({ message: 'Invalid visit date' });

    const qty = Math.max(1, Number(tickets || 1));
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
      numberOfPeople: qty,
      totalAmount: total,
      status: 'pending',
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

module.exports = router;
