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

function normalizeYMD(dateStr, def = null) {
  if (!dateStr) return def;
  const d = new Date(dateStr);
  if (isNaN(d)) return def;
  d.setHours(0,0,0,0);
  return d;
}

// GET /api/analytics/owner?property=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/owner', requireAuth, async (req, res) => {
  try {
    const { property: propertyId } = req.query;
    let from = normalizeYMD(req.query.from);
    let to = normalizeYMD(req.query.to);
    const today = new Date(); today.setHours(0,0,0,0);
    if (!from) { from = new Date(today); from.setDate(today.getDate() - 29); }
    if (!to) { to = today; }
    if (to < from) return res.status(400).json({ message: 'Invalid date range' });

    // Scope properties by owner
    let propertyIds = [];
    if (propertyId) {
      const p = await Property.findById(propertyId).select('host');
      if (!p) return res.json({ occupancyDaily: [], adrDaily: [], revparDaily: [], totals: { occupancyAvg: 0, adrAvg: 0, revparAvg: 0, conversions: 0, cancellations: 0 } });
      const ok = String(p.host) === String(req.user.id) || req.user.userType === 'admin';
      if (!ok) return res.status(403).json({ message: 'Forbidden' });
      propertyIds = [p._id];
    } else {
      const props = await Property.find({ host: req.user.id }).select('_id');
      propertyIds = props.map(p => p._id);
    }

    if (!propertyIds.length) {
      return res.json({ occupancyDaily: [], adrDaily: [], revparDaily: [], totals: { occupancyAvg: 0, adrAvg: 0, revparAvg: 0, conversions: 0, cancellations: 0 } });
    }

    // Fetch bookings overlapping range
    const bookings = await Booking.find({
      property: { $in: propertyIds },
      $or: [{ checkIn: { $lt: to } , checkOut: { $gt: from } }]
    }).select('checkIn checkOut totalAmount status');

    // Count rooms
    const props = await Property.find({ _id: { $in: propertyIds } }).select('rooms');
    const roomsCount = props.reduce((sum, p) => sum + (Array.isArray(p.rooms) ? p.rooms.length : 0), 0) || 1;

    // Build daily buckets
    const days = [];
    const map = new Map(); // dateKey -> { occupiedNights, revenue }
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0,10);
      days.push(key);
      map.set(key, { occupied: 0, revenue: 0 });
    }

    // Distribute bookings into daily buckets (simple split)
    bookings.forEach(b => {
      const s = new Date(b.checkIn); s.setHours(0,0,0,0);
      const e = new Date(b.checkOut); e.setHours(0,0,0,0);
      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        if (d < from || d > to) continue;
        const key = d.toISOString().slice(0,10);
        const entry = map.get(key);
        if (!entry) continue;
        entry.occupied += 1; // per booked room-night; assumes one room per booking
        // allocate uniform revenue across nights if multi-night
        const nights = Math.max(1, Math.ceil((e - s) / (1000*60*60*24)));
        entry.revenue += Number(b.totalAmount || 0) / nights;
      }
    });

    const occupancyDaily = days.map(key => {
      const { occupied } = map.get(key);
      const capacity = roomsCount; // one room-night per day per room
      const pct = capacity ? Math.round((occupied / capacity) * 1000) / 10 : 0;
      return { date: key, occupancyPercent: pct };
    });

    const adrDaily = days.map(key => {
      const { occupied, revenue } = map.get(key);
      const adr = occupied ? Math.round(revenue / occupied) : 0;
      return { date: key, value: adr };
    });

    const revparDaily = days.map(key => {
      const { revenue } = map.get(key);
      const revpar = roomsCount ? Math.round(revenue / roomsCount) : 0;
      return { date: key, value: revpar };
    });

    // Totals
    const occAvg = occupancyDaily.length ? Math.round((occupancyDaily.reduce((s, d) => s + d.occupancyPercent, 0) / occupancyDaily.length) * 10) / 10 : 0;
    const adrAvg = adrDaily.length ? Math.round((adrDaily.reduce((s, d) => s + d.value, 0) / adrDaily.length)) : 0;
    const revparAvg = revparDaily.length ? Math.round((revparDaily.reduce((s, d) => s + d.value, 0) / revparDaily.length)) : 0;

    // Conversions and cancellations in range
    const convCanc = await Booking.aggregate([
      { $match: { property: { $in: propertyIds }, createdAt: { $gte: from, $lte: new Date(to.getTime() + 24*60*60*1000) } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byStatus = Object.fromEntries(convCanc.map(x => [x._id, x.count]));

    res.json({
      occupancyDaily,
      adrDaily,
      revparDaily,
      totals: {
        occupancyAvg: occAvg,
        adrAvg,
        revparAvg,
        conversions: Number(byStatus.confirmed || 0),
        cancellations: Number(byStatus.cancelled || 0)
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load analytics' });
  }
});

module.exports = router;
