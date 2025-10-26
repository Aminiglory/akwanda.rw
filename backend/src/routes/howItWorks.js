const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const HowItWorksMedia = require('../tables/howItWorksMedia');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAdmin(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Public: list enabled media, optional audience filter
router.get('/', async (req, res) => {
  try {
    const audience = String(req.query.audience || '').toLowerCase();
    const q = { enabled: true };
    if (audience === 'guests' || audience === 'hosts') {
      q.$or = [{ audience }, { audience: 'all' }];
    }
    const items = await HowItWorksMedia.find(q).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch media' });
  }
});

// Admin: list all
router.get('/admin', requireAdmin, async (_req, res) => {
  const items = await HowItWorksMedia.find({}).sort({ order: 1, createdAt: 1 }).lean();
  res.json({ items });
});

// Admin: create
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.image) return res.status(400).json({ message: 'image is required' });
    const created = await HowItWorksMedia.create({
      image: payload.image,
      title: payload.title || '',
      description: payload.description || '',
      audience: payload.audience || 'all',
      order: Number.isFinite(payload.order) ? payload.order : 0,
      enabled: payload.enabled !== false,
    });
    res.status(201).json({ item: created });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create item' });
  }
});

// Admin: update
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    const item = await HowItWorksMedia.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    if (payload.image !== undefined) item.image = payload.image;
    if (payload.title !== undefined) item.title = payload.title;
    if (payload.description !== undefined) item.description = payload.description;
    if (payload.audience !== undefined) item.audience = payload.audience;
    if (payload.order !== undefined) item.order = Number(payload.order) || 0;
    if (payload.enabled !== undefined) item.enabled = !!payload.enabled;
    await item.save();
    res.json({ item });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// Admin: delete
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const item = await HowItWorksMedia.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    await HowItWorksMedia.deleteOne({ _id: item._id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

module.exports = router;
