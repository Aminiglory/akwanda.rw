const express = require('express');
const jwt = require('jsonwebtoken');
const FlightBooking = require('../tables/flightBooking');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Helper to ensure only hosts/admins access owner flights data
function requireHost(req, res, next) {
  if (!req.user || (req.user.userType !== 'host' && req.user.userType !== 'admin')) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}

// POST /api/flights/owner/bookings
// Host creates a simple flight booking/listing entry that will appear in the
// Flights dashboard. This is mainly to let hosts seed data and test flows.
router.post('/bookings', requireAuth, requireHost, async (req, res) => {
  try {
    const {
      airline,
      flightNumber,
      from,
      to,
      departure,
      arrival,
      duration,
      price,
      status,
      cabinClass,
      channel,
      groupBooking,
      groupSize,
    } = req.body || {};

    if (!airline || !flightNumber || !from || !to || !departure || !arrival || !price) {
      return res.status(400).json({ message: 'airline, flightNumber, from, to, departure, arrival and price are required' });
    }

    const dep = new Date(departure);
    const arr = new Date(arrival);
    if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
      return res.status(400).json({ message: 'Invalid departure or arrival date' });
    }

    const booking = await FlightBooking.create({
      host: req.user.id,
      airline,
      flightNumber,
      from,
      to,
      departure: dep,
      arrival: arr,
      duration: duration || '',
      price: Number(price),
      status: (status || 'upcoming').toLowerCase(),
      cabinClass: cabinClass || undefined,
      channel: channel || 'direct',
      groupBooking: !!groupBooking,
      groupSize: groupSize || undefined,
    });

    return res.status(201).json({ booking });
  } catch (e) {
    console.error('Owner flights create booking error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to create flight booking' });
  }
});

// GET /api/flights/owner/bookings
router.get('/bookings', requireAuth, requireHost, async (req, res) => {
  try {
    const { status, filter, airline, from, to } = req.query || {};

    const q = { host: req.user.id };

    if (status) {
      q.status = String(status).toLowerCase();
    }
    if (airline) {
      q.airline = new RegExp(String(airline).trim(), 'i');
    }

    if (from || to) {
      q.departure = {};
      if (from) q.departure.$gte = new Date(from);
      if (to) q.departure.$lte = new Date(to);
    }

    let bookings = await FlightBooking.find(q).sort({ departure: -1 }).lean();

    if (filter === 'high-value' && bookings.length) {
      const avg =
        bookings.reduce((sum, b) => sum + Number(b.price || 0), 0) /
        Math.max(bookings.length, 1);
      bookings = bookings.filter((b) => Number(b.price || 0) >= avg);
    }

    return res.json({ bookings });
  } catch (e) {
    console.error('Owner flights bookings error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to load flight bookings' });
  }
});

// GET /api/flights/owner/analytics
router.get('/analytics', requireAuth, requireHost, async (req, res) => {
  try {
    const { from, to, range } = req.query || {};
    const now = new Date();

    let start;
    let end;
    if (from || to) {
      start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = to ? new Date(to) : now;
    } else if (range === 'day' || range === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = now;
    } else if (range === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
    } else {
      // Default monthly-style window (last 30 days)
      end = now;
      start = new Date(now);
      start.setDate(now.getDate() - 30);
    }

    const q = { host: req.user.id };
    q.departure = { $gte: start, $lte: end };

    const bookings = await FlightBooking.find(q).lean();

    const totals = {
      totalBookings: bookings.length,
      completed: 0,
      cancelled: 0,
      upcoming: 0,
      revenueTotal: 0,
    };

    const byRoute = new Map();
    const byAirline = new Map();

    const bookingWindowBuckets = {
      '<7': 0,
      '7-30': 0,
      '>30': 0,
    };

    const dailyMap = new Map(); // date (YYYY-MM-DD) -> { bookings, completed, cancelled, revenue }
    const monthlyMap = new Map(); // month (YYYY-MM) -> { bookings, completed, cancelled, revenue }

    bookings.forEach((b) => {
      const status = String(b.status || '').toLowerCase();
      if (status === 'completed') totals.completed += 1;
      else if (status === 'cancelled') totals.cancelled += 1;
      else totals.upcoming += 1;

      if (status === 'completed') {
        totals.revenueTotal += Number(b.price || 0);
      }

      const depDate = new Date(b.departure || b.createdAt || now);
      const dayKey = depDate.toISOString().slice(0, 10);
      const monthKey = dayKey.slice(0, 7);

      const daily = dailyMap.get(dayKey) || { bookings: 0, completed: 0, cancelled: 0, revenue: 0 };
      daily.bookings += 1;
      if (status === 'completed') daily.completed += 1;
      if (status === 'cancelled') daily.cancelled += 1;
      if (status === 'completed') daily.revenue += Number(b.price || 0);
      dailyMap.set(dayKey, daily);

      const monthly = monthlyMap.get(monthKey) || { bookings: 0, completed: 0, cancelled: 0, revenue: 0 };
      monthly.bookings += 1;
      if (status === 'completed') monthly.completed += 1;
      if (status === 'cancelled') monthly.cancelled += 1;
      if (status === 'completed') monthly.revenue += Number(b.price || 0);
      monthlyMap.set(monthKey, monthly);

      const routeKey = `${b.from} -> ${b.to}`;
      const rPrev = byRoute.get(routeKey) || { count: 0, revenue: 0 };
      byRoute.set(routeKey, {
        count: rPrev.count + 1,
        revenue: rPrev.revenue + Number(b.price || 0),
      });

      const airlineKey = b.airline || 'Unknown';
      const aPrev = byAirline.get(airlineKey) || { count: 0, revenue: 0 };
      byAirline.set(airlineKey, {
        count: aPrev.count + 1,
        revenue: aPrev.revenue + Number(b.price || 0),
      });

      if (b.createdAt && b.departure) {
        const created = new Date(b.createdAt).getTime();
        const dep = new Date(b.departure).getTime();
        const days = Math.max(0, Math.round((dep - created) / (1000 * 60 * 60 * 24)));
        if (days < 7) bookingWindowBuckets['<7'] += 1;
        else if (days <= 30) bookingWindowBuckets['7-30'] += 1;
        else bookingWindowBuckets['>30'] += 1;
      }
    });

    const routes = Array.from(byRoute.entries()).map(([route, stats]) => ({
      route,
      count: stats.count,
      revenue: stats.revenue,
    }));

    const airlines = Array.from(byAirline.entries()).map(([airline, stats]) => ({
      airline,
      count: stats.count,
      revenue: stats.revenue,
    }));

    const bookingWindow = [
      { bucket: '<7', count: bookingWindowBuckets['<7'] },
      { bucket: '7-30', count: bookingWindowBuckets['7-30'] },
      { bucket: '>30', count: bookingWindowBuckets['>30'] },
    ];

    const completion = {
      completed: totals.completed,
      cancelled: totals.cancelled,
    };

    const daily = Array.from(dailyMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, stats]) => ({ date, ...stats }));

    const monthly = Array.from(monthlyMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, stats]) => ({ month, ...stats }));

    return res.json({ totals, routes, airlines, bookingWindow, completion, daily, monthly });
  } catch (e) {
    console.error('Owner flights analytics error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to load flight analytics' });
  }
});

// GET /api/flights/owner/expenses
router.get('/expenses', requireAuth, requireHost, async (req, res) => {
  try {
    const { from, to, range } = req.query || {};
    const now = new Date();

    let start;
    let end;
    if (from || to) {
      start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = to ? new Date(to) : now;
    } else if (range === 'day' || range === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = now;
    } else if (range === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
    } else {
      // Default monthly-style window (last 30 days)
      end = now;
      start = new Date(now);
      start.setDate(now.getDate() - 30);
    }

    const q = { host: req.user.id };
    q.departure = { $gte: start, $lte: end };

    const bookings = await FlightBooking.find(q).lean();
    const revenue = bookings
      .filter((b) => String(b.status || '').toLowerCase() === 'completed')
      .reduce((sum, b) => sum + Number(b.price || 0), 0);

    const commission = Math.round(revenue * 0.15);
    const processing = Math.round(revenue * 0.05);
    const marketing = Math.round(revenue * 0.03);

    const summary = {
      commission,
      processing,
      marketing,
      total: commission + processing + marketing,
    };

    return res.json({ summary });
  } catch (e) {
    console.error('Owner flights expenses error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to load flight expenses' });
  }
});

module.exports = router;
