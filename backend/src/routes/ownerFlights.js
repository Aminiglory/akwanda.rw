const express = require('express');
const jwt = require('jsonwebtoken');
const FlightBooking = require('../tables/flightBooking');
const FlightExpense = require('../tables/flightExpense');
const CommissionLevel = require('../tables/commissionLevel');
const CommissionSettings = require('../tables/commissionSettings');
const CommissionUpgradeLog = require('../tables/commissionUpgradeLog');

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
      commissionLevelId,
    } = req.body || {};

    if (!airline || !flightNumber || !from || !to || !departure || !arrival || !price) {
      return res.status(400).json({ message: 'airline, flightNumber, from, to, departure, arrival and price are required' });
    }

    const dep = new Date(departure);
    const arr = new Date(arrival);
    if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
      return res.status(400).json({ message: 'Invalid departure or arrival date' });
    }

    const bookingChannel = (channel || 'direct').toLowerCase();
    const bookingPrice = Number(price);

    // Calculate commission based on commission level
    let commissionRate = 0;
    let commissionLevel = null;
    
    if (commissionLevelId) {
      try {
        commissionLevel = await CommissionLevel.findOne({ 
          _id: commissionLevelId, 
          scope: 'flight',
          active: true 
        }).lean();
        if (commissionLevel) {
          commissionRate = bookingChannel === 'online' 
            ? Number(commissionLevel.onlineRate || 0)
            : Number(commissionLevel.directRate || 0);
        }
      } catch (_) {}
    }

    // Fallback to default commission settings if no level found
    if (!commissionRate || commissionRate <= 0 || commissionRate > 100) {
      try {
        const settings = await CommissionSettings.getSingleton();
        commissionRate = Number(settings.premiumRate || settings.baseRate || 10);
      } catch (_) {
        commissionRate = 10; // Default 10%
      }
    }

    const commissionAmount = commissionRate > 0 ? Math.round(bookingPrice * (commissionRate / 100)) : 0;

    const booking = await FlightBooking.create({
      host: req.user.id,
      airline,
      flightNumber,
      from,
      to,
      departure: dep,
      arrival: arr,
      duration: duration || '',
      price: bookingPrice,
      status: (status || 'upcoming').toLowerCase(),
      cabinClass: cabinClass || undefined,
      channel: bookingChannel,
      groupBooking: !!groupBooking,
      groupSize: groupSize || undefined,
      commissionLevel: commissionLevelId || undefined,
      commissionRate: commissionRate || undefined,
      commissionAmount,
      commissionPaid: false,
    });

    return res.status(201).json({ booking });
  } catch (e) {
    console.error('Owner flights create booking error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to create flight booking' });
  }
});

// GET /api/flights/owner/commission-levels
// Get available commission levels for flights
router.get('/commission-levels', requireAuth, requireHost, async (req, res) => {
  try {
    const levels = await CommissionLevel.find({ 
      scope: 'flight', 
      active: true 
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return res.json({ commissionLevels: levels });
  } catch (e) {
    console.error('Get flight commission levels error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to load commission levels', commissionLevels: [] });
  }
});

// GET /api/flights/owner/has-flights
// Check if user has any flight bookings
router.get('/has-flights', requireAuth, requireHost, async (req, res) => {
  try {
    const count = await FlightBooking.countDocuments({ host: req.user.id });
    return res.json({ hasFlights: count > 0, count });
  } catch (e) {
    console.error('Check has flights error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to check flights', hasFlights: false });
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

    let bookings = await FlightBooking.find(q)
      .populate('commissionLevel', 'name directRate onlineRate isPremium isDefault')
      .sort({ departure: -1 })
      .lean();

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

// CRUD and paginated listing for individual flight expenses

// POST /api/flights/owner/expenses-log
router.post('/expenses-log', requireAuth, requireHost, async (req, res) => {
  try {
    const { date, amount, category, note, flightBookingId } = req.body || {};
    if (!date || !amount) {
      return res.status(400).json({ message: 'date and amount are required' });
    }

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    let bookingRef = null;
    if (flightBookingId) {
      const fb = await FlightBooking.findOne({ _id: flightBookingId, host: req.user.id }).select('_id');
      if (fb) bookingRef = fb._id;
    }

    const exp = await FlightExpense.create({
      host: req.user.id,
      flightBooking: bookingRef,
      date: d,
      amount: Number(amount),
      category: category || 'general',
      note: note || '',
    });

    return res.status(201).json({ expense: exp });
  } catch (e) {
    console.error('Owner flights create expense error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to create flight expense' });
  }
});

// GET /api/flights/owner/expenses-log?page=1&limit=10
router.get('/expenses-log', requireAuth, requireHost, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const query = { host: req.user.id };

    const [items, total] = await Promise.all([
      FlightExpense.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FlightExpense.countDocuments(query),
    ]);

    return res.json({
      expenses: items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    console.error('Owner flights list expenses error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to list flight expenses' });
  }
});

// PATCH /api/flights/owner/expenses-log/:id
router.patch('/expenses-log/:id', requireAuth, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, category, note } = req.body || {};

    const exp = await FlightExpense.findOne({ _id: id, host: req.user.id });
    if (!exp) return res.status(404).json({ message: 'Expense not found' });

    if (date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid date' });
      exp.date = d;
    }
    if (amount != null) exp.amount = Number(amount);
    if (category != null) exp.category = category;
    if (note != null) exp.note = note;

    await exp.save();
    return res.json({ expense: exp });
  } catch (e) {
    console.error('Owner flights update expense error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to update flight expense' });
  }
});

// DELETE /api/flights/owner/expenses-log/:id
router.delete('/expenses-log/:id', requireAuth, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const exp = await FlightExpense.findOneAndDelete({ _id: id, host: req.user.id });
    if (!exp) return res.status(404).json({ message: 'Expense not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('Owner flights delete expense error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to delete flight expense' });
  }
});

// POST /api/flights/owner/bookings/:id/upgrade-commission-level
// Upgrade commission level for a specific flight booking
router.post('/bookings/:id/upgrade-commission-level', requireAuth, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionLevelId } = req.body || {};
    
    if (!commissionLevelId) {
      return res.status(400).json({ message: 'commissionLevelId is required' });
    }
    
    // Verify the commission level exists and is for flights
    const level = await CommissionLevel.findById(commissionLevelId);
    if (!level) {
      return res.status(404).json({ message: 'Commission level not found' });
    }
    if (level.scope !== 'flight') {
      return res.status(400).json({ message: 'This commission level is not for flights' });
    }
    if (!level.active) {
      return res.status(400).json({ message: 'This commission level is not active' });
    }
    
    const booking = await FlightBooking.findOne({ _id: id, host: req.user.id });
    if (!booking) {
      return res.status(404).json({ message: 'Flight booking not found' });
    }
    
    // Store old values for logging
    const oldCommissionLevel = booking.commissionLevel;
    const oldCommissionLevelName = oldCommissionLevel 
      ? (await CommissionLevel.findById(oldCommissionLevel).select('name').lean())?.name 
      : null;
    const oldCommissionRate = booking.commissionRate;
    const oldCommissionAmount = booking.commissionAmount;
    
    // Update commission level and recalculate commission
    booking.commissionLevel = commissionLevelId;
    const bookingChannel = (booking.channel || 'direct').toLowerCase();
    const commissionRate = bookingChannel === 'online' 
      ? Number(level.onlineRate || 0)
      : Number(level.directRate || 0);
    
    booking.commissionRate = commissionRate;
    booking.commissionAmount = commissionRate > 0 
      ? Math.round(Number(booking.price || 0) * (commissionRate / 100)) 
      : 0;
    
    await booking.save();
    await booking.populate('commissionLevel', 'name directRate onlineRate isPremium isDefault');
    
    // Log the upgrade for admin tracking
    try {
      const itemName = `${booking.airline} ${booking.flightNumber} (${booking.from} → ${booking.to})`;
      await CommissionUpgradeLog.create({
        performedBy: req.user.id,
        performedByType: 'owner',
        itemType: 'flight',
        itemId: booking._id,
        itemName,
        oldCommissionLevel,
        oldCommissionLevelName,
        oldCommissionRate,
        oldCommissionAmount,
        newCommissionLevel: commissionLevelId,
        newCommissionLevelName: level.name,
        newCommissionRate: commissionRate,
        newCommissionAmount: booking.commissionAmount,
        bookingPrice: booking.price,
        channel: bookingChannel,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        description: `Flight owner upgraded commission level from "${oldCommissionLevelName || 'None'}" to "${level.name}"`
      });
    } catch (logError) {
      console.error('Failed to log commission upgrade:', logError);
      // Don't fail the request if logging fails
    }
    
    return res.json({ 
      booking, 
      message: 'Commission level upgraded successfully' 
    });
  } catch (e) {
    console.error('Upgrade flight commission level error:', e);
    return res.status(500).json({ message: 'Failed to upgrade commission level', error: e.message });
  }
});

// DELETE /api/flights/owner/bookings/:id
router.delete('/bookings/:id', requireAuth, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await FlightBooking.findOneAndDelete({ _id: id, host: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Flight booking not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('Owner flights delete booking error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to delete flight booking' });
  }
});

// POST /api/flights/owner/seed-demo
// Seed demo flight bookings for testing purposes
router.post('/seed-demo', requireAuth, requireHost, async (req, res) => {
  try {
    const now = new Date();
    const demoFlights = [
      {
        airline: 'RwandAir',
        flightNumber: 'WB 400',
        from: 'Kigali',
        to: 'Nairobi',
        departure: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        arrival: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000), // 1.5 hours later
        duration: '1h 30m',
        price: 450000,
        status: 'upcoming',
        cabinClass: 'economy',
        channel: 'online',
        groupBooking: false,
      },
      {
        airline: 'Ethiopian Airlines',
        flightNumber: 'ET 801',
        from: 'Kigali',
        to: 'Addis Ababa',
        departure: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        arrival: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 2.25 * 60 * 60 * 1000), // 2.25 hours later
        duration: '2h 15m',
        price: 520000,
        status: 'upcoming',
        cabinClass: 'business',
        channel: 'direct',
        groupBooking: true,
        groupSize: 4,
      },
      {
        airline: 'Kenya Airways',
        flightNumber: 'KQ 410',
        from: 'Kigali',
        to: 'Kampala',
        departure: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        arrival: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 1.75 * 60 * 60 * 1000), // 1.75 hours later
        duration: '1h 45m',
        price: 380000,
        status: 'completed',
        cabinClass: 'economy',
        channel: 'online',
        groupBooking: false,
      },
      {
        airline: 'RwandAir',
        flightNumber: 'WB 500',
        from: 'Kigali',
        to: 'Dubai',
        departure: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        arrival: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 hours later
        duration: '5h 0m',
        price: 1200000,
        status: 'completed',
        cabinClass: 'business',
        channel: 'direct',
        groupBooking: false,
      },
      {
        airline: 'Turkish Airlines',
        flightNumber: 'TK 608',
        from: 'Kigali',
        to: 'Istanbul',
        departure: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        arrival: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 6.5 * 60 * 60 * 1000), // 6.5 hours later
        duration: '6h 30m',
        price: 980000,
        status: 'upcoming',
        cabinClass: 'premium',
        channel: 'online',
        groupBooking: false,
      },
      {
        airline: 'Air France',
        flightNumber: 'AF 745',
        from: 'Kigali',
        to: 'Paris',
        departure: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        arrival: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 hours later
        duration: '8h 0m',
        price: 1500000,
        status: 'completed',
        cabinClass: 'business',
        channel: 'direct',
        groupBooking: true,
        groupSize: 2,
      },
      {
        airline: 'Qatar Airways',
        flightNumber: 'QR 842',
        from: 'Kigali',
        to: 'Doha',
        departure: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        arrival: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 4.5 * 60 * 60 * 1000), // 4.5 hours later
        duration: '4h 30m',
        price: 1100000,
        status: 'upcoming',
        cabinClass: 'economy',
        channel: 'online',
        groupBooking: false,
      },
      {
        airline: 'Emirates',
        flightNumber: 'EK 728',
        from: 'Kigali',
        to: 'Dubai',
        departure: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        arrival: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 5.5 * 60 * 60 * 1000), // 5.5 hours later
        duration: '5h 30m',
        price: 1350000,
        status: 'completed',
        cabinClass: 'first',
        channel: 'direct',
        groupBooking: false,
      },
    ];

    const createdFlights = [];
    for (const flight of demoFlights) {
      const bookingChannel = (flight.channel || 'direct').toLowerCase();
      const bookingPrice = Number(flight.price);
      
      // Calculate commission
      let commissionRate = 0;
      if (flight.commissionLevel) {
        try {
          const level = await CommissionLevel.findById(flight.commissionLevel).lean();
          if (level) {
            commissionRate = bookingChannel === 'online' 
              ? Number(level.onlineRate || 0)
              : Number(level.directRate || 0);
          }
        } catch (_) {}
      }
      
      if (!commissionRate || commissionRate <= 0) {
        try {
          const settings = await CommissionSettings.getSingleton();
          commissionRate = Number(settings.premiumRate || settings.baseRate || 10);
        } catch (_) {
          commissionRate = 10;
        }
      }
      
      const commissionAmount = commissionRate > 0 ? Math.round(bookingPrice * (commissionRate / 100)) : 0;
      
      const booking = await FlightBooking.create({
        host: req.user.id,
        ...flight,
        commissionLevel: defaultCommissionLevel?._id || undefined,
        commissionRate,
        commissionAmount,
        commissionPaid: false,
      });
      createdFlights.push(booking);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdFlights.length} demo flight bookings`,
      bookings: createdFlights,
      count: createdFlights.length,
    });
  } catch (e) {
    console.error('Owner flights seed demo error:', e?.message || e);
    return res.status(500).json({ message: 'Failed to seed demo flights', error: e?.message });
  }
});

module.exports = router;
