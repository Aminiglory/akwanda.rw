const { Router } = require('express');
const jwt = require('jsonwebtoken');
const CarRental = require('../tables/carRental');
const CarRentalBooking = require('../tables/carRentalBooking');
const CarExpense = require('../tables/carExpense');

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

// Helper to resolve car and check ownership
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

// POST /api/car-finance/expenses
router.post('/expenses', requireAuth, async (req, res) => {
  try {
    const { car: carId, date, amount, category, note } = req.body || {};
    if (!carId || !date || !amount) {
      return res.status(400).json({ message: 'car, date and amount are required' });
    }

    const car = await loadCarForOwner(carId, req.user);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const expense = await CarExpense.create({
      owner: car.owner,
      car: car._id,
      date: new Date(date),
      amount: Number(amount),
      category: category || 'general',
      note: note || '',
    });

    return res.status(201).json({ expense });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    console.error('CarExpense create error', e);
    return res.status(500).json({ message: 'Failed to record car expense' });
  }
});

// GET /api/car-finance/expenses?car=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/expenses', requireAuth, async (req, res) => {
  try {
    const { car: carId, from, to } = req.query;

    let car = null;
    if (carId) {
      car = await loadCarForOwner(carId, req.user);
      if (!car) return res.json({ expenses: [], total: 0 });
    }

    const query = { owner: req.user.id };
    if (car) query.car = car._id;

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const expenses = await CarExpense.find(query).sort({ date: -1, createdAt: -1 });
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    return res.json({ expenses, total });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    console.error('CarExpense fetch error', e);
    return res.status(500).json({ message: 'Failed to load car expenses' });
  }
});

// GET /api/car-finance/summary?car=<id>&range=weekly|monthly|annual&date=YYYY-MM-DD
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { car: carId, range = 'monthly', date } = req.query;

    let car = null;
    if (carId) {
      car = await loadCarForOwner(carId, req.user);
      if (!car) return res.status(404).json({ message: 'Car not found' });
    }

    const base = date ? new Date(date) : new Date();
    let start;
    let end;

    if (range === 'weekly') {
      const day = base.getDay();
      const diffToMonday = (day + 6) % 7;
      start = new Date(base);
      start.setDate(base.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else if (range === 'annual') {
      start = new Date(base.getFullYear(), 0, 1);
      end = new Date(base.getFullYear() + 1, 0, 1);
    } else {
      start = new Date(base.getFullYear(), base.getMonth(), 1);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    }

    const carFilter = {};
    if (car) {
      carFilter.car = car._id;
    } else {
      // All cars for this owner
      const carIds = await CarRental.find({ owner: req.user.id }).distinct('_id');
      carFilter.car = { $in: carIds };
    }

    const bookings = await CarRentalBooking.find({
      ...carFilter,
      status: { $nin: ['cancelled'] },
      pickupDate: { $lt: end },
      returnDate: { $gt: start },
    }).select('totalAmount');

    const revenueTotal = bookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);

    const expenseQuery = {
      owner: req.user.id,
    };
    if (car) expenseQuery.car = car._id;
    expenseQuery.date = { $gte: start, $lt: end };

    const expenses = await CarExpense.find(expenseQuery).select('amount');
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const profit = revenueTotal - expenseTotal;

    return res.json({
      range,
      period: { start, end },
      revenueTotal,
      expenseTotal,
      profit,
      counts: {
        bookings: bookings.length,
        expenses: expenses.length,
      },
    });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    console.error('CarFinance summary error', e);
    return res.status(500).json({ message: 'Failed to load car finance summary' });
  }
});

module.exports = router;
