const { Router } = require('express');
const AddOnCatalog = require('../tables/addOnCatalog');
const { authenticate: requireAuth } = require('../middleware/auth');

const router = Router();

// Public/host-facing: list active add-on types (no pagination needed for owners)
// GET /api/add-ons/catalog
router.get('/catalog', async (req, res) => {
  try {
    const items = await AddOnCatalog.find({ active: true }).sort({ order: 1, name: 1 });
    res.json({ items });
  } catch (e) {
    console.error('AddOn catalog fetch error:', e);
    res.status(500).json({ message: 'Failed to load add-on catalog' });
  }
});

// Admin-only: paginated catalog listing including inactive items
// GET /api/add-ons/admin/catalog?page=1&limit=20&includeInactive=true
router.get('/admin/catalog', requireAuth, async (req, res) => {
  try {
    if (req.user?.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';

    const filter = includeInactive ? {} : { active: true };

    const [items, totalItems] = await Promise.all([
      AddOnCatalog.find(filter)
        .sort({ order: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AddOnCatalog.countDocuments(filter)
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    res.json({
      items,
      page,
      limit,
      totalItems,
      totalPages
    });
  } catch (e) {
    console.error('AddOn admin catalog fetch error:', e);
    res.status(500).json({ message: 'Failed to load admin add-on catalog' });
  }
});

// Admin-only: create a new add-on type
// POST /api/add-ons/catalog
router.post('/catalog', requireAuth, async (req, res) => {
  try {
    if (req.user?.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { key, name, description, defaultPrice, defaultScope, active, order } = req.body || {};
    if (!key || !name) {
      return res.status(400).json({ message: 'key and name are required' });
    }
    const existing = await AddOnCatalog.findOne({ key });
    if (existing) {
      return res.status(409).json({ message: 'Add-on key already exists' });
    }
    const item = await AddOnCatalog.create({
      key,
      name,
      description: description || '',
      defaultPrice: Number(defaultPrice || 0),
      defaultScope: defaultScope || 'per-booking',
      active: active !== undefined ? !!active : true,
      order: order != null ? Number(order) : 0
    });
    res.status(201).json({ item });
  } catch (e) {
    console.error('AddOn catalog create error:', e);
    res.status(500).json({ message: 'Failed to create add-on type' });
  }
});

module.exports = router;
