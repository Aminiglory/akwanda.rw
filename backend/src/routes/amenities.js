const { Router } = require('express');
const mongoose = require('mongoose');
const Amenity = require('../tables/amenity');
const { authenticate: requireAuth } = require('../middleware/auth');

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user?.userType === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
}

// List amenities/services (optionally filter by scope/type/active)
router.get('/', async (req, res) => {
  try {
    const { scope, type, active } = req.query;
    const q = {};
    if (scope) q.scope = scope;
    if (type) q.type = type;
    if (active != null) q.active = String(active) === 'true';
    const items = await Amenity.find(q).sort({ order: 1, name: 1 }).lean();
    res.json({ amenities: items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list amenities', error: e.message });
  }
});

// Create amenity/service (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, type = 'amenity', scope, icon, active = true, order = 0 } = req.body || {};
    if (!name || !slug || !scope) return res.status(400).json({ message: 'name, slug, scope are required' });
    const created = await Amenity.create({ name: String(name).trim(), slug: String(slug).trim().toLowerCase(), type, scope, icon, active: !!active, order: Number(order)||0 });
    res.status(201).json({ amenity: created });
  } catch (e) {
    if (e instanceof mongoose.Error && e.code === 11000) {
      return res.status(409).json({ message: 'Slug already exists' });
    }
    res.status(500).json({ message: 'Failed to create amenity', error: e.message });
  }
});

// Update amenity/service (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.slug) updates.slug = String(updates.slug).trim().toLowerCase();
    if (updates.order != null) updates.order = Number(updates.order);
    const updated = await Amenity.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: 'Amenity not found' });
    res.json({ amenity: updated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update amenity', error: e.message });
  }
});

// Delete amenity/service (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleted = await Amenity.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Amenity not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete amenity', error: e.message });
  }
});

module.exports = router;
