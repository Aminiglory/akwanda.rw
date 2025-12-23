const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Attraction = require('../tables/attraction');
const AttractionBooking = require('../tables/attractionBooking');
const AttractionExpense = require('../tables/attractionExpense');

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

async function loadAttractionForOwner(attractionId, user) {
  if (!attractionId) return null;
  const a = await Attraction.findById(attractionId).select('owner name');
  if (!a) return null;
  const isOwner = String(a.owner) === String(user.id);
  const isAdmin = user.userType === 'admin';
  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  return a;
}

function computeRange(range, date) {
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

  return { start, end };
}

function buildDateQuery(from, to) {
  if (!from && !to) return null;
  const q = {};
  if (from) q.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    q.$lte = end;
  }
  return q;
}

router.post('/expenses', requireAuth, async (req, res) => {
  try {
    const { attraction: attractionId, date, amount, category, note } = req.body || {};
    if (!attractionId || !date || amount === undefined || amount === null) {
      return res.status(400).json({ message: 'attraction, date and amount are required' });
    }

    const a = await loadAttractionForOwner(attractionId, req.user);
    if (!a) return res.status(404).json({ message: 'Attraction not found' });

    const ownerId = a.owner;

    const exp = await AttractionExpense.create({
      owner: ownerId,
      attraction: a._id,
      date: new Date(date),
      amount: Number(amount),
      category: category || 'general',
      note: note || ''
    });

    return res.status(201).json({ expense: exp });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    return res.status(500).json({ message: 'Failed to record attraction expense' });
  }
});

router.get('/expenses', requireAuth, async (req, res) => {
  try {
    const { attraction: attractionId, from, to } = req.query;

    let ownerId = req.user.id;
    let attractionIds = [];

    if (attractionId) {
      const a = await loadAttractionForOwner(attractionId, req.user);
      if (!a) return res.json({ expenses: [], total: 0 });
      ownerId = a.owner;
      attractionIds = [a._id];
    } else {
      attractionIds = await Attraction.find({ owner: ownerId }).distinct('_id');
      if (!Array.isArray(attractionIds) || attractionIds.length === 0) {
        return res.json({ expenses: [], total: 0 });
      }
    }

    const query = {
      owner: ownerId,
      attraction: { $in: attractionIds },
    };

    const dateQuery = buildDateQuery(from, to);
    if (dateQuery) query.date = dateQuery;

    const expenses = await AttractionExpense.find(query)
      .populate('attraction', 'name')
      .sort({ date: -1, createdAt: -1 });

    const total = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);

    return res.json({ expenses, total });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    return res.status(500).json({ message: 'Failed to load attraction expenses' });
  }
});

router.delete('/expenses/:id', requireAuth, async (req, res) => {
  try {
    const exp = await AttractionExpense.findById(req.params.id).populate('attraction', 'owner');
    if (!exp) return res.status(404).json({ message: 'Expense not found' });

    const isOwner = String(exp.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    await exp.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to delete expense' });
  }
});

router.patch('/expenses/:id', requireAuth, async (req, res) => {
  try {
    const exp = await AttractionExpense.findById(req.params.id).populate('attraction', 'owner');
    if (!exp) return res.status(404).json({ message: 'Expense not found' });

    const isOwner = String(exp.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const { date, amount, category, note } = req.body || {};
    if (date !== undefined) exp.date = new Date(date);
    if (amount !== undefined) exp.amount = Number(amount);
    if (category !== undefined) exp.category = category || 'general';
    if (note !== undefined) exp.note = note || '';

    await exp.save();
    return res.json({ expense: exp });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to update expense' });
  }
});

router.get('/categories', requireAuth, async (req, res) => {
  try {
    const { attraction: attractionId, from, to } = req.query;

    let ownerId = req.user.id;
    let attractionIds = [];

    if (attractionId) {
      const a = await loadAttractionForOwner(attractionId, req.user);
      if (!a) return res.json({ categories: [] });
      ownerId = a.owner;
      attractionIds = [a._id];
    } else {
      attractionIds = await Attraction.find({ owner: ownerId }).distinct('_id');
      if (!Array.isArray(attractionIds) || attractionIds.length === 0) return res.json({ categories: [] });
    }

    const match = {
      owner: ownerId,
      attraction: { $in: attractionIds },
    };

    const dateQuery = buildDateQuery(from, to);
    if (dateQuery) match.date = dateQuery;

    const rows = await AttractionExpense.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id', total: 1, count: 1 } },
      { $sort: { total: -1, category: 1 } },
    ]);

    return res.json({ categories: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    return res.status(500).json({ message: 'Failed to load categories' });
  }
});

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { attraction: attractionId, range = 'monthly', date } = req.query;

    let ownerId = req.user.id;
    let attractionIds = [];

    if (attractionId) {
      const a = await loadAttractionForOwner(attractionId, req.user);
      if (!a) return res.status(404).json({ message: 'Attraction not found' });
      ownerId = a.owner;
      attractionIds = [a._id];
    } else {
      attractionIds = await Attraction.find({ owner: ownerId }).distinct('_id');
      if (!Array.isArray(attractionIds) || attractionIds.length === 0) {
        return res.json({
          range,
          period: { start: null, end: null },
          revenueTotal: 0,
          expenseTotal: 0,
          profit: 0,
          counts: { bookings: 0, expenses: 0 },
          byCategory: []
        });
      }
    }

    const { start, end } = computeRange(String(range || 'monthly'), date);

    const bookings = await AttractionBooking.find({
      attraction: { $in: attractionIds },
      status: { $nin: ['cancelled'] },
      visitDate: { $gte: start, $lt: end },
    }).select('totalAmount');

    const revenueTotal = bookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);

    const expenseMatch = {
      owner: ownerId,
      attraction: { $in: attractionIds },
      date: { $gte: start, $lt: end },
    };

    const expenses = await AttractionExpense.find(expenseMatch).select('amount category');
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const byCategoryMap = new Map();
    expenses.forEach(e => {
      const key = String(e.category || 'general');
      const prev = byCategoryMap.get(key) || { category: key, total: 0, count: 0 };
      prev.total += Number(e.amount || 0);
      prev.count += 1;
      byCategoryMap.set(key, prev);
    });
    const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => (b.total - a.total) || String(a.category).localeCompare(String(b.category)));

    const profit = revenueTotal - expenseTotal;

    return res.json({
      range,
      period: { start, end },
      revenueTotal,
      expenseTotal,
      profit,
      counts: { bookings: bookings.length, expenses: expenses.length },
      byCategory,
    });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    return res.status(500).json({ message: 'Failed to load finance summary' });
  }
});

module.exports = router;
