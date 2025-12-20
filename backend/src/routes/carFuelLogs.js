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

// GET /api/car-fuel-logs -> list fuel logs for current owner
router.get('/', requireAuth, async (req, res) => {
  try {
    const CarFuelLog = require('../tables/carFuelLog');
    const filter = { owner: req.user.id };
    if (req.query.car) {
      filter.car = req.query.car;
    }
    const dateFilter = {};
    if (req.query.from) {
      const from = new Date(req.query.from);
      if (!isNaN(from)) dateFilter.$gte = from;
    }
    if (req.query.to) {
      const to = new Date(req.query.to);
      if (!isNaN(to)) dateFilter.$lte = to;
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.date = dateFilter;
    }

    const logs = await CarFuelLog.find(filter)
      .populate('car', 'vehicleName brand model licensePlate')
      .sort({ date: -1, createdAt: -1 });

    const summary = logs.reduce(
      (acc, l) => {
        const liters = Number(l.liters || 0);
        const cost = Number(l.totalCost || 0);
        acc.totalLiters += liters;
        acc.totalCost += cost;
        return acc;
      },
      { totalLiters: 0, totalCost: 0 }
    );

    res.json({ logs, summary });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load fuel logs', error: e.message });
  }
});

// POST /api/car-fuel-logs -> create a new fuel log
router.post('/', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const CarFuelLog = require('../tables/carFuelLog');
    const { car, date, liters, totalCost, pricePerLiter, odometerKm, stationName, note } = req.body || {};

    if (!car || !date || liters === undefined || totalCost === undefined) {
      return res.status(400).json({ message: 'car, date, liters and totalCost are required' });
    }

    const carDoc = await CarRental.findById(car).select('owner');
    if (!carDoc) return res.status(404).json({ message: 'Car not found' });
    if (String(carDoc.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const payload = {
      owner: req.user.id,
      car: carDoc._id,
      date: new Date(date),
      liters: Number(liters),
      totalCost: Number(totalCost),
      pricePerLiter: pricePerLiter !== undefined && pricePerLiter !== '' ? Number(pricePerLiter) : undefined,
      odometerKm: odometerKm !== undefined && odometerKm !== '' ? Number(odometerKm) : undefined,
      stationName: stationName || undefined,
      note: note || undefined,
    };

    const created = await CarFuelLog.create(payload);
    const populated = await CarFuelLog.findById(created._id).populate('car', 'vehicleName brand model licensePlate');
    res.status(201).json({ log: populated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create fuel log', error: e.message });
  }
});

// DELETE /api/car-fuel-logs/:id -> remove a fuel log
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const CarFuelLog = require('../tables/carFuelLog');
    const log = await CarFuelLog.findById(req.params.id).populate('car', 'owner');
    if (!log) return res.status(404).json({ message: 'Fuel log not found' });
    if (String(log.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await log.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete fuel log', error: e.message });
  }
});

module.exports = router;
