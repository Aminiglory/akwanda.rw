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

// Admin-only: seed a default set of add-on catalog items
// POST /api/add-ons/admin/seed-defaults
router.post('/admin/seed-defaults', requireAuth, async (req, res) => {
  try {
    if (req.user?.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const defaults = [
      { key: 'breakfast_continental_standard', name: 'Continental breakfast – standard', description: 'Light continental breakfast with bread, spreads, juice, and hot drink.', defaultPrice: 6000, defaultScope: 'per-guest', active: true, order: 10 },
      { key: 'breakfast_english_classic', name: 'English breakfast – classic', description: 'Eggs, sausages, bacon, beans, toast, and hot drink.', defaultPrice: 9000, defaultScope: 'per-guest', active: true, order: 20 },
      { key: 'breakfast_buffet_basic', name: 'Breakfast buffet – basic', description: 'Buffet with standard hot and cold options and beverages.', defaultPrice: 12000, defaultScope: 'per-guest', active: true, order: 40 },
      { key: 'breakfast_healthy_vegan', name: 'Healthy breakfast – vegan', description: 'Plant-based breakfast with fruit, grains, and dairy alternatives.', defaultPrice: 9000, defaultScope: 'per-guest', active: true, order: 50 },
      { key: 'lunch_standard', name: 'Standard lunch', description: 'Main course, side dish, salad, and soft drink.', defaultPrice: 12000, defaultScope: 'per-guest', active: true, order: 100 },
      { key: 'lunch_box_standard', name: 'Lunch box – standard', description: 'Packed lunch box with sandwich, snack, and drink.', defaultPrice: 8000, defaultScope: 'per-guest', active: true, order: 104 },
      { key: 'dinner_standard', name: 'Standard dinner', description: 'Main dish, side, and soft drink.', defaultPrice: 15000, defaultScope: 'per-guest', active: true, order: 150 },
      { key: 'dinner_theme_bbq', name: 'Theme dinner – barbeque night', description: 'Grill and barbeque-focused dinner event.', defaultPrice: 22000, defaultScope: 'per-guest', active: true, order: 154 },
      { key: 'room_extra_bed', name: 'Extra bed', description: 'Additional bed added to the room.', defaultPrice: 15000, defaultScope: 'per-night', active: true, order: 200 },
      { key: 'room_baby_crib', name: 'Baby crib', description: 'Baby crib placed in the room.', defaultPrice: 5000, defaultScope: 'per-night', active: true, order: 201 },
      { key: 'stay_late_checkout_2h', name: 'Late check-out – 2 hours', description: 'Check-out up to 2 hours after standard time.', defaultPrice: 8000, defaultScope: 'per-booking', active: true, order: 213 },
      { key: 'transport_airport_pickup', name: 'Airport pick-up', description: 'Private transfer from airport to property.', defaultPrice: 20000, defaultScope: 'per-booking', active: true, order: 300 },
      { key: 'transport_airport_dropoff', name: 'Airport drop-off', description: 'Private transfer from property to airport.', defaultPrice: 20000, defaultScope: 'per-booking', active: true, order: 301 },
      { key: 'service_laundry', name: 'Laundry service', description: 'Wash and fold laundry service.', defaultPrice: 5000, defaultScope: 'per-booking', active: true, order: 350 },
      { key: 'occasion_birthday_setup', name: 'Birthday room setup', description: 'Birthday room decoration with balloons and décor.', defaultPrice: 20000, defaultScope: 'per-booking', active: true, order: 400 },
      { key: 'occasion_honeymoon_setup', name: 'Honeymoon setup', description: 'Honeymoon room decoration with flowers and special touches.', defaultPrice: 25000, defaultScope: 'per-booking', active: true, order: 402 },
      { key: 'spa_full_body_massage', name: 'Full body massage', description: 'Relaxing full-body massage session.', defaultPrice: 30000, defaultScope: 'per-guest', active: true, order: 450 },
      { key: 'recreation_pool_pass', name: 'Swimming pool pass', description: 'Access to the swimming pool.', defaultPrice: 5000, defaultScope: 'per-guest', active: true, order: 550 },
      { key: 'tour_city', name: 'City tour', description: 'Guided city sightseeing tour.', defaultPrice: 25000, defaultScope: 'per-guest', active: true, order: 600 },
      { key: 'tech_high_speed_wifi', name: 'High-speed WiFi', description: 'Premium high-speed WiFi internet package.', defaultPrice: 5000, defaultScope: 'per-night', active: true, order: 700 }
    ];

    let created = 0;
    for (const def of defaults) {
      const existing = await AddOnCatalog.findOne({ key: def.key });
      if (!existing) {
        await AddOnCatalog.create(def);
        created += 1;
      }
    }

    res.json({
      message: `Seeded default add-ons (created: ${created}, total defaults: ${defaults.length})`,
      created,
      totalDefaults: defaults.length
    });
  } catch (e) {
    console.error('AddOn seed-defaults error:', e);
    res.status(500).json({ message: 'Failed to seed default add-ons' });
  }
});

module.exports = router;
