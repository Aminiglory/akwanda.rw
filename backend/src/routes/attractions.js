const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');
const Attraction = require('../tables/attraction');

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
    const { visitDate, tickets } = req.body || {};
    if (!visitDate) return res.status(400).json({ message: 'visitDate required' });
    const a = await Attraction.findById(req.params.id).select('isActive');
    if (!a || !a.isActive) return res.json({ available: false });
    // For MVP: always available when active (capacity logic can be added later)
    return res.json({ available: true });
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
