const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');
const Property = require('../tables/property');

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

module.exports = router;
