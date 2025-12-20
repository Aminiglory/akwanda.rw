const { Router } = require('express');
const jwt = require('jsonwebtoken');
const CarRental = require('../tables/carRental');
const CarIncome = require('../tables/carIncome');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function loadCarForOwner(carId, user) {
  if (!carId) return null;
  const car = await CarRental.findById(carId).select('owner vehicleName brand model');
  if (!car) return null;
  const isOwner = String(car.owner) === String(user.id);
  const isAdmin = user.userType === 'admin';
  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  return car;
}

// POST /api/car-income
router.post('/', requireAuth, async (req, res) => {
  try {
    const { car: carId, booking, date, amount, source, method, reference, note } = req.body || {};
    if (!carId || !date || !amount) {
      return res.status(400).json({ message: 'car, date and amount are required' });
    }

    const car = await loadCarForOwner(carId, req.user);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const income = await CarIncome.create({
      owner: car.owner,
      car: car._id,
      booking: booking || undefined,
      date: new Date(date),
      amount: Number(amount),
      source: source || 'booking',
      method: method || '',
      reference: reference || '',
      note: note || ''
    });

    return res.status(201).json({ income });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    console.error('CarIncome create error', e);
    return res.status(500).json({ message: 'Failed to record income' });
  }
});

// GET /api/car-income?car=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD&source=&method=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { car: carId, from, to, source, method } = req.query;

    let car = null;
    if (carId) {
      car = await loadCarForOwner(carId, req.user);
      if (!car) return res.json({ incomes: [], total: 0 });
    }

    const query = { owner: req.user.id };
    if (car) query.car = car._id;
    if (source) query.source = source;
    if (method) query.method = method;

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const incomes = await CarIncome.find(query).sort({ date: -1, createdAt: -1 }).populate('car', 'vehicleName brand model');
    const total = incomes.reduce((s, i) => s + Number(i.amount || 0), 0);

    return res.json({ incomes, total });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    console.error('CarIncome fetch error', e);
    return res.status(500).json({ message: 'Failed to load income records' });
  }
});

// PATCH /api/car-income/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const inc = await CarIncome.findById(req.params.id).populate('car', 'owner');
    if (!inc) return res.status(404).json({ message: 'Income not found' });
    const isOwner = String(inc.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { date, amount, source, method, reference, note } = req.body || {};
    if (date !== undefined) inc.date = new Date(date);
    if (amount !== undefined) inc.amount = Number(amount);
    if (source !== undefined) inc.source = source || 'booking';
    if (method !== undefined) inc.method = method || '';
    if (reference !== undefined) inc.reference = reference || '';
    if (note !== undefined) inc.note = note || '';

    await inc.save();
    return res.json({ income: inc });
  } catch (e) {
    console.error('CarIncome update error', e);
    return res.status(500).json({ message: 'Failed to update income record' });
  }
});

// DELETE /api/car-income/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const inc = await CarIncome.findById(req.params.id).populate('car', 'owner');
    if (!inc) return res.status(404).json({ message: 'Income not found' });
    const isOwner = String(inc.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await inc.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    console.error('CarIncome delete error', e);
    return res.status(500).json({ message: 'Failed to delete income record' });
  }
});

module.exports = router;
