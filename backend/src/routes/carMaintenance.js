const express = require('express');
const jwt = require('jsonwebtoken');
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

// GET /api/car-maintenance?car=ID -> list maintenance for current owner, optional car filter
router.get('/', requireAuth, async (req, res) => {
  try {
    const CarMaintenance = require('../tables/carMaintenance');
    const filter = { owner: req.user.id };
    if (req.query.car) {
      filter.car = req.query.car;
    }
    const records = await CarMaintenance.find(filter)
      .populate('car', 'vehicleName brand model licensePlate')
      .sort({ date: -1, createdAt: -1 });
    res.json({ maintenance: records });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load maintenance', error: e.message });
  }
});

// POST /api/car-maintenance
router.post('/', requireAuth, async (req, res) => {
  try {
    const CarMaintenance = require('../tables/carMaintenance');
    const { car, date, type, mileage, cost, note } = req.body || {};
    if (!car || !date || !type) {
      return res.status(400).json({ message: 'car, date and type are required' });
    }
    const payload = {
      owner: req.user.id,
      car,
      date: new Date(date),
      type: String(type),
      mileage: mileage !== undefined && mileage !== null && mileage !== '' ? Number(mileage) : undefined,
      cost: cost !== undefined && cost !== null && cost !== '' ? Number(cost) : 0,
      note: note || undefined,
    };
    const created = await CarMaintenance.create(payload);
    const populated = await CarMaintenance.findById(created._id)
      .populate('car', 'vehicleName brand model licensePlate');
    res.status(201).json({ maintenance: populated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create maintenance record', error: e.message });
  }
});

module.exports = router;
