const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Expense = require('../tables/expense');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); } catch (e) { return res.status(401).json({ message: 'Invalid token' }); }
}

// GET /api/finance/ledger?property=<id>&month=1-12&year=YYYY
router.get('/ledger', requireAuth, async (req, res) => {
  try {
    const { property: propertyId, month, year } = req.query;
    if (!propertyId) return res.json({ entries: [] });

    const property = await Property.findById(propertyId).select('host title');
    if (!property) return res.json({ entries: [] });

    const isOwner = String(property.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const now = new Date();
    const m = month ? Number(month) - 1 : now.getMonth();
    const y = year ? Number(year) : now.getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);

    const list = await Booking.find({
      property: propertyId,
      $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }]
    }).select('confirmationCode totalAmount commissionAmount status paymentStatus createdAt');

    const entries = list.map(b => ({
      code: b.confirmationCode || String(b._id),
      totalAmount: Number(b.totalAmount || 0),
      commissionAmount: Number(b.commissionAmount || 0),
      status: b.status,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt
    }));

    res.json({ entries, period: { month: m + 1, year: y }, property: { _id: property._id, title: property.title } });
  } catch (e) { res.status(500).json({ message: 'Failed to load ledger' }); }
});

// GET /api/finance/invoices?property=<id>&month=&year=
router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const { property: propertyId, month, year } = req.query;
    if (!propertyId) return res.json({ invoices: [] });

    const property = await Property.findById(propertyId).select('host title');
    if (!property) return res.json({ invoices: [] });
    const isOwner = String(property.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const now = new Date();
    const m = month ? Number(month) - 1 : now.getMonth();
    const y = year ? Number(year) : now.getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);

    const list = await Booking.find({
      property: propertyId,
      status: { $nin: ['cancelled'] },
      $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }]
    }).select('totalAmount commissionAmount');

    const total = list.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const commission = list.reduce((s, b) => s + Number(b.commissionAmount || 0), 0);

    const code = `${propertyId}-${y}-${String(m + 1).padStart(2, '0')}`;
    const invoices = [{
      _id: code,
      code,
      period: { month: m + 1, year: y },
      amount: commission,
      gross: total,
      property: { _id: property._id, title: property.title }
    }];

    res.json({ invoices });
  } catch (e) { res.status(500).json({ message: 'Failed to load invoices' }); }
});

// GET /api/finance/invoices/:id/download
router.get('/invoices/:id/download', requireAuth, async (req, res) => {
  try {
    const id = req.params.id; // expected format: <propertyId>-YYYY-MM
    const [propertyId, y, m] = String(id).split('-');
    const property = await Property.findById(propertyId).select('host title');
    if (!property) return res.status(404).json({ message: 'Invoice not found' });
    const isOwner = String(property.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const month = Number(m); const year = Number(y);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const list = await Booking.find({
      property: propertyId,
      status: { $nin: ['cancelled'] },
      $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }]
    }).select('confirmationCode totalAmount commissionAmount');

    const total = list.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const commission = list.reduce((s, b) => s + Number(b.commissionAmount || 0), 0);

    const lines = [
      `INVOICE SUMMARY`,
      `Property: ${property.title}`,
      `Period: ${year}-${String(month).padStart(2, '0')}`,
      `Gross: RWF ${total.toLocaleString()}`,
      `Commission: RWF ${commission.toLocaleString()}`,
      `Bookings: ${list.length}`
    ];

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.txt`);
    return res.send(lines.join('\n'));
  } catch (e) { return res.status(500).json({ message: 'Failed to download invoice' }); }
});

// GET /api/finance/payouts?property=&month=&year=
router.get('/payouts', requireAuth, async (req, res) => {
  try {
    // No dedicated payout model yet; return placeholder list
    res.json({ payouts: [] });
  } catch (e) { res.status(500).json({ message: 'Failed to load payouts' }); }
});

// POST /api/finance/expenses
router.post('/expenses', requireAuth, async (req, res) => {
  try {
    const { property: propertyId, date, amount, category, note } = req.body || {};
    if (!propertyId || !date || !amount) {
      return res.status(400).json({ message: 'property, date and amount are required' });
    }

    const property = await Property.findById(propertyId).select('host title');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const isOwner = String(property.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const exp = await Expense.create({
      host: property.host,
      property: property._id,
      date: new Date(date),
      amount: Number(amount),
      category: category || 'general',
      note: note || ''
    });

    return res.status(201).json({ expense: exp });
  } catch (e) {
    console.error('Expense create error', e);
    return res.status(500).json({ message: 'Failed to record expense' });
  }
});

// GET /api/finance/expenses?property=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/expenses', requireAuth, async (req, res) => {
  try {
    const { property: propertyId, from, to } = req.query;
    if (!propertyId) return res.json({ expenses: [] });

    const property = await Property.findById(propertyId).select('host title');
    if (!property) return res.json({ expenses: [] });
    const isOwner = String(property.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const query = { property: propertyId };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    return res.json({ expenses, total });
  } catch (e) {
    console.error('Expenses fetch error', e);
    return res.status(500).json({ message: 'Failed to load expenses' });
  }
});

// GET /api/finance/summary?property=<id>&range=weekly|monthly|annual&date=YYYY-MM-DD
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { property: propertyId, range = 'monthly', date } = req.query;
    if (!propertyId) return res.status(400).json({ message: 'property is required' });

    const property = await Property.findById(propertyId).select('host title');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const isOwner = String(property.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const base = date ? new Date(date) : new Date();
    let start;
    let end;

    if (range === 'weekly') {
      // Use Monday as start of week
      const day = base.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = (day + 6) % 7; // 0 if Monday
      start = new Date(base);
      start.setDate(base.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else if (range === 'annual') {
      start = new Date(base.getFullYear(), 0, 1);
      end = new Date(base.getFullYear() + 1, 0, 1);
    } else {
      // monthly
      start = new Date(base.getFullYear(), base.getMonth(), 1);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    }

    // Bookings in period
    const bookings = await Booking.find({
      property: propertyId,
      status: { $nin: ['cancelled'] },
      checkIn: { $lt: end },
      checkOut: { $gt: start }
    }).select('totalAmount amountBeforeTax commissionAmount');

    const revenueTotal = bookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const earningsTotal = bookings.reduce((s, b) => {
      const baseAmount = Number(b.amountBeforeTax || b.totalAmount || 0);
      const commission = Number(b.commissionAmount || 0);
      return s + (baseAmount - commission);
    }, 0);

    // Expenses in period
    const expenses = await Expense.find({
      property: propertyId,
      date: { $gte: start, $lt: end }
    }).select('amount');

    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const grossProfit = revenueTotal - expensesTotal;
    const netProfit = earningsTotal - expensesTotal;

    return res.json({
      period: {
        range,
        start: start.toISOString(),
        end: end.toISOString()
      },
      property: { _id: property._id, title: property.title },
      revenueTotal,
      earningsTotal,
      expensesTotal,
      grossProfit,
      netProfit
    });
  } catch (e) {
    console.error('Finance summary error', e);
    return res.status(500).json({ message: 'Failed to load finance summary' });
  }
});

module.exports = router;
