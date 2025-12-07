const { Router } = require('express');
const mongoose = require('mongoose');
const PropertyType = require('../tables/propertyType');
const Property = require('../tables/property');
const { authenticate: requireAuth } = require('../middleware/auth');

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user?.userType === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
}

// Public: GET /api/property-types?active=true
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    const q = {};
    if (active != null) q.active = String(active) === 'true';
    else q.active = true; // default only active types for public consumers
    const items = await PropertyType.find(q).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ propertyTypes: items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list property types', error: e.message });
  }
});

// Admin: GET /api/admin/property-types
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const items = await PropertyType.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ propertyTypes: items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list property types', error: e.message });
  }
});

// Admin: POST /api/admin/property-types
router.post('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, key, description = '', active = true, sortOrder = 0 } = req.body || {};
    if (!name || !key) return res.status(400).json({ message: 'name and key are required' });
    const doc = await PropertyType.create({
      name: String(name).trim(),
      key: String(key).trim().toLowerCase(),
      description,
      active: !!active,
      sortOrder: Number(sortOrder) || 0,
    });
    res.status(201).json({ propertyType: doc });
  } catch (e) {
    if (e instanceof mongoose.Error && e.code === 11000) {
      return res.status(409).json({ message: 'Key already exists' });
    }
    res.status(500).json({ message: 'Failed to create property type', error: e.message });
  }
});

// Admin: PUT /api/admin/property-types/:id
router.put('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.key) updates.key = String(updates.key).trim().toLowerCase();
    if (updates.sortOrder != null) updates.sortOrder = Number(updates.sortOrder);
    const updated = await PropertyType.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: 'Property type not found' });
    res.json({ propertyType: updated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update property type', error: e.message });
  }
});

// Admin: DELETE /api/admin/property-types/:id
router.delete('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const type = await PropertyType.findById(req.params.id);
    if (!type) return res.status(404).json({ message: 'Property type not found' });

    // Prevent deleting a type currently used by any property
    const inUse = await Property.exists({ $or: [
      { category: type.key },
      { propertyType: type._id },
    ] });
    if (inUse) {
      return res.status(400).json({ message: 'Cannot delete property type that is assigned to properties' });
    }

    await type.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete property type', error: e.message });
  }
});

// Admin: POST /api/admin/property-types/seed-defaults
router.post('/admin/seed-defaults', requireAuth, requireAdmin, async (req, res) => {
  try {
    const defaults = [
      { name: 'Apartment', key: 'apartment', description: 'Furnished apartment, typically in a residential building', sortOrder: 10 },
      { name: 'Hotel', key: 'hotel', description: 'Professional hotel with daily housekeeping', sortOrder: 20 },
      { name: 'Villa', key: 'villa', description: 'Private villa or house, often with garden or pool', sortOrder: 30 },
      { name: 'Hostel', key: 'hostel', description: 'Budget accommodation with shared facilities', sortOrder: 40 },
      { name: 'Resort', key: 'resort', description: 'All-inclusive resort with amenities and activities', sortOrder: 50 },
      { name: 'Guesthouse', key: 'guesthouse', description: 'Small accommodation, often family-run', sortOrder: 60 },
    ];

    let seeded = 0;
    const failures = [];
    for (const def of defaults) {
      try {
        await PropertyType.updateOne(
          { key: def.key },
          { $set: { ...def, active: true } },
          { upsert: true }
        );
        seeded += 1;
      } catch (e) {
        failures.push({ key: def.key, error: e.message });
      }
    }

    const all = await PropertyType.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ seeded, total: all.length, failures, propertyTypes: all });
  } catch (e) {
    res.status(500).json({ message: 'Failed to seed property types', error: e.message });
  }
});

module.exports = router;
