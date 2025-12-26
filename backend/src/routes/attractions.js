const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');
const Attraction = require('../tables/attraction');
const AttractionBooking = require('../tables/attractionBooking');

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

function requireOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId) return res.status(404).json({ message: 'Not found' });
      if (String(ownerId) === String(req.user.id) || req.user.userType === 'admin') return next();
      return res.status(403).json({ message: 'Forbidden' });
    } catch (e) {
      return res.status(500).json({ message: 'Auth check failed' });
    }
  };
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Check availability for a given date and tickets (simple acceptance for now)
router.post('/:id/availability', async (req, res) => {
  try {
    const { visitDate, tickets, timeSlot } = req.body || {};
    if (!visitDate) return res.status(400).json({ message: 'visitDate required' });
    const a = await Attraction.findById(req.params.id).select('isActive capacity operatingHours timeSlots');
    if (!a || !a.isActive) return res.json({ available: false });

    let when;
    const vd = String(visitDate || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(vd)) {
      const [y, m, d] = vd.split('-').map(n => Number(n));
      when = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    } else {
      when = new Date(visitDate);
    }
    if (Number.isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid visit date' });

    const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][when.getUTCDay()];
    const allowedDays = Array.isArray(a.operatingHours?.days) ? a.operatingHours.days.map(normalizeDay) : [];
    if (allowedDays.length > 0 && !allowedDays.includes(normalizeDay(day))) {
      return res.json({ available: false, reason: 'closed' });
    }

    const slots = parseTimeSlots(a);
    const requestedSlot = String(timeSlot || '').trim();
    if (slots.length > 0 && !requestedSlot) {
      return res.json({ available: false, reason: 'slot_required', slots });
    }
    if (slots.length > 0 && requestedSlot && !slots.includes(requestedSlot)) {
      return res.json({ available: false, reason: 'invalid_slot', slots });
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
    return res.json({ available, remaining, capacity, slots: slots.length > 0 ? slots : undefined });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to check availability' });
  }
});

// Public: list attractions (Rwanda by default)
router.get('/', async (req, res) => {
  try {
    const { q, city, category, country, owner } = req.query;
    const filter = { isActive: true };
    filter.country = country || 'Rwanda';
    if (owner) filter.owner = owner;
    if (q) {
      const rx = new RegExp(String(q).trim(), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { location: rx }, { city: rx }];
    }
    if (city) filter.city = new RegExp(String(city).trim(), 'i');
    if (category) filter.category = category;
    const list = await Attraction.find(filter).sort({ createdAt: -1 });
    res.json({ attractions: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list attractions' });
  }
});

// Owner/Admin: list my attractions (must be declared before /:id so "/mine" isn't treated as an ID)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const list = await Attraction.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ attractions: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load my attractions' });
  }
});

// Owner/Admin: details (including inactive)
router.get('/:id/manage', requireAuth, async (req, res) => {
  try {
    const a = await Attraction.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Attraction not found' });
    if (!(req.user?.userType === 'admin' || String(a.owner) === String(req.user.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ attraction: a });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load attraction' });
  }
});

// Public: details
router.get('/:id', async (req, res) => {
  try {
    const a = await Attraction.findById(req.params.id);
    if (!a || !a.isActive) return res.status(404).json({ message: 'Attraction not found' });
    res.json({ attraction: a });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load attraction' });
  }
});

// Owner/Admin: create
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!(req.user?.userType === 'host' || req.user?.userType === 'admin')) {
      return res.status(403).json({ message: 'Host or admin required' });
    }
    const payload = { ...(req.body || {}), country: req.body?.country || 'Rwanda', owner: req.user.id };
    const created = await Attraction.create(payload);
    res.status(201).json({ attraction: created });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create attraction', error: e.message });
  }
});

// Owner/Admin: update
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const a = await Attraction.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Attraction not found' });
    if (!(req.user?.userType === 'admin' || String(a.owner) === String(req.user.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    Object.assign(a, req.body || {});
    await a.save();
    res.json({ attraction: a });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update attraction' });
  }
});

// Owner/Admin: delete
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const a = await Attraction.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Attraction not found' });
    if (!(req.user?.userType === 'admin' || String(a.owner) === String(req.user.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await a.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete attraction' });
  }
});

// Images upload
router.post('/:id/images', requireAuth, upload.array('images', 12), async (req, res) => {
  try {
    const a = await Attraction.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Attraction not found' });
    if (!(req.user?.userType === 'admin' || String(a.owner) === String(req.user.id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const uploaded = (req.files && req.files.length)
      ? (await Promise.all(req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'attractions')))).map(r => r.secure_url || r.url)
      : [];
    a.images = [...(a.images || []), ...uploaded];
    await a.save();
    res.json({ attraction: a, images: uploaded });
  } catch (e) {
    res.status(500).json({ message: 'Failed to upload images' });
  }
});

module.exports = router;
