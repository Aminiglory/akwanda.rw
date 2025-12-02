const { Router } = require('express');
const mongoose = require('mongoose');
const RoomType = require('../tables/roomType');
const { authenticate: requireAuth } = require('../middleware/auth');

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user?.userType === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
}

// GET /api/room-types?active=true
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    const q = {};
    if (active != null) q.active = String(active) === 'true';
    const items = await RoomType.find(q).sort({ order: 1, name: 1 }).lean();
    res.json({ roomTypes: items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list room types', error: e.message });
  }
});

// POST /api/room-types (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, key, description = '', defaultBathroomType = 'inside', active = true, order = 0 } = req.body || {};
    if (!name || !key) return res.status(400).json({ message: 'name and key are required' });
    const doc = await RoomType.create({
      name: String(name).trim(),
      key: String(key).trim().toLowerCase(),
      description,
      defaultBathroomType,
      active: !!active,
      order: Number(order) || 0,
    });
    res.status(201).json({ roomType: doc });
  } catch (e) {
    if (e instanceof mongoose.Error && e.code === 11000) {
      return res.status(409).json({ message: 'Key already exists' });
    }
    res.status(500).json({ message: 'Failed to create room type', error: e.message });
  }
});

// PUT /api/room-types/:id (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.key) updates.key = String(updates.key).trim().toLowerCase();
    if (updates.order != null) updates.order = Number(updates.order);
    const updated = await RoomType.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: 'Room type not found' });
    res.json({ roomType: updated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update room type', error: e.message });
  }
});

// DELETE /api/room-types/:id (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleted = await RoomType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Room type not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete room type', error: e.message });
  }
});

// POST /api/room-types/seed-defaults (admin)
router.post('/seed-defaults', requireAuth, requireAdmin, async (req, res) => {
  try {
    const defaults = [
      { name: 'Double room', key: 'double', defaultBathroomType: 'inside', order: 10 },
      { name: 'Double room with private bathroom', key: 'double_private_bathroom', defaultBathroomType: 'inside', order: 20 },
      { name: 'Double room with shared bathroom', key: 'double_shared_bathroom', defaultBathroomType: 'shared', order: 30 },
      { name: 'Single room', key: 'single', defaultBathroomType: 'inside', order: 40 },
      { name: 'Single room with shared bathroom', key: 'single_shared_bathroom', defaultBathroomType: 'shared', order: 50 },
    ];

    let seeded = 0;
    const failures = [];
    for (const def of defaults) {
      try {
        await RoomType.updateOne(
          { key: def.key },
          { $set: { ...def, active: true } },
          { upsert: true }
        );
        seeded += 1;
      } catch (e) {
        failures.push({ key: def.key, error: e.message });
      }
    }

    const all = await RoomType.find({}).sort({ order: 1, name: 1 }).lean();
    res.json({ seeded, total: all.length, failures, roomTypes: all });
  } catch (e) {
    res.status(500).json({ message: 'Failed to seed room types', error: e.message });
  }
});

module.exports = router;
