const express = require('express');
require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRouter = require('./src/tables/auth');
const propertiesRouter = require('./src/routes/properties');
const bookingsRouter = require('./src/routes/bookings');
const adminRouter = require('./src/routes/admin');
const userRouter = require('./src/routes/user');
const paymentsRouter = require('./src/routes/payments');
const billingRouter = require('./src/routes/billing');
const supportRouter = require('./src/routes/support');
const messagesRouter = require('./src/routes/messages');
const contentRouter = require('./src/routes/content');
const notificationsRouter = require('./src/routes/notifications');
const carsRouter = require('./src/routes/cars');
const carBookingsRouter = require('./src/routes/carBookings');
const adminUserManagementRouter = require('./src/routes/admin-user-management');
const reportsRouter = require('./src/routes/reports');
const workersRouter = require('./src/routes/workers');
const User = require('./src/tables/user');
const Worker = require('./src/tables/worker');
const Notification = require('./src/tables/notification');

const app = express();

// Ensure secure cookies and protocol detection work behind Render/Proxies
app.set('trust proxy', 1);

// Function to find an available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();
    server.listen(startPort, (err) => {
      if (err) {
        server.close();
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        const port = server.address().port;
        server.close(() => resolve(port));
      }
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
};

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/akwandadb';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || CLIENT_URL).split(',').map(s => s.trim()).filter(Boolean);
let DB_READY = false;

// CORS: allow configured origins, localhost, and Vercel preview subdomains
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow same-origin/non-browser
    try {
      const o = new URL(origin);
      const allowed =
        CORS_ORIGINS.includes(origin) ||
        CORS_ORIGINS.includes(`${o.protocol}//${o.host}`) ||
        o.hostname === 'localhost' ||
        /\.vercel\.app$/.test(o.hostname);
      return cb(null, !!allowed);
    } catch (_) {
      return cb(null, false);
    }
  },
  credentials: true,
}));
app.options('*', cors());
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', require('express').static(require('path').join(process.cwd(), 'uploads')));

app.get('/health', (req, res) => {
	res.json({ status: 'ok', db: DB_READY ? 'connected' : 'connecting' }); 
});

// Payroll reminder scheduler: runs hourly, notifies owners if worker nextPayDate is due
function addMonths(date, m) { const d = new Date(date); d.setMonth(d.getMonth() + m); return d; }
function addDays(date, d) { const n = new Date(date); n.setDate(n.getDate() + d); return n; }
function nextByFreq(from, freq) {
  switch (freq) {
    case 'weekly': return addDays(from, 7);
    case 'biweekly': return addDays(from, 14);
    case 'quarterly': return addMonths(from, 3);
    case 'monthly':
    default: return addMonths(from, 1);
  }
}

async function runPayrollReminderCycle(io) {
  try {
    const now = new Date();
    const dueWorkers = await Worker.find({ 'salary.nextPayDate': { $lte: now }, status: { $in: ['active','inactive'] } });
    for (const w of dueWorkers) {
      try {
        await Notification.create({
          type: 'payroll_due',
          title: 'Payroll Due Reminder',
          message: `Salary payment is due for ${w.firstName} ${w.lastName} (${w.position}).`,
          recipientUser: w.employerId,
          worker: w._id
        });
        io.to(`user:${w.employerId}`).emit('notification', {
          type: 'payroll_due',
          title: 'Payroll Due Reminder',
          message: `Salary payment is due for ${w.firstName} ${w.lastName} (${w.position}).`,
          workerId: String(w._id)
        });
        // advance next pay date
        const from = w.salary?.nextPayDate || now;
        w.salary.nextPayDate = nextByFreq(from, w.salary?.paymentFrequency || 'monthly');
        await w.save();
      } catch (_) {}
    }
  } catch (e) {
    console.warn('Payroll reminder cycle failed:', e?.message || e);
  }
}

// Start scheduler after DB connection
// Test endpoint for debugging
app.get('/api/test', (req, res) => {
	res.json({ 
		message: 'API is working',
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || 'development'
	}); 
});

app.get('/api/metrics/landing', async (req, res) => {
    try {
        const Booking = require('./src/tables/booking');
        const Property = require('./src/tables/property');
        // Active Listings: properties with isActive true
        const activeListings = await Property.countDocuments({ isActive: true });
        // Happy Guests: unique users who have made at least one booking
        const allGuestIds = await Booking.distinct('guest');
        const happyGuests = allGuestIds.length;
        // Satisfaction Rate: percent of confirmed bookings out of all bookings
        const totalBookings = await Booking.countDocuments();
        const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
        const satisfactionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 1000) / 10 : 0; // one decimal
        res.json({ metrics: { activeListings, happyGuests, satisfactionRate } });
    } catch (e) {
        res.json({ metrics: { activeListings: 0, happyGuests: 0, satisfactionRate: 0 } });
    }
});

app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/support', supportRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/content', contentRouter);
app.use('/api/cars', carsRouter);
app.use('/api/car-bookings', carBookingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin/user-management', adminUserManagementRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/workers', workersRouter);

// Create HTTP server and bind Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const o = new URL(origin);
        const allowed =
          CORS_ORIGINS.includes(origin) ||
          CORS_ORIGINS.includes(`${o.protocol}//${o.host}`) ||
          o.hostname === 'localhost' ||
          /\.vercel\.app$/.test(o.hostname);
        return cb(null, !!allowed);
      } catch (_) {
        return cb(null, false);
      }
    },
    credentials: true,
  }
});

// Expose io to routes (e.g., messages.js)
app.set('io', io);

// Socket auth helper
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function getTokenFromHandshake(handshake) {
  // Prefer cookie, fallback to auth header
  const cookieHeader = handshake.headers.cookie || '';
  const match = cookieHeader.match(/akw_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  const auth = handshake.auth?.token || handshake.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
}

io.use((socket, next) => {
  try {
    const token = getTokenFromHandshake(socket.handshake);
    if (!token) return next(new Error('Unauthorized'));
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user;
    // Join personal room for direct notifications
    socket.join(`user:${user.id}`);
    return next();
  } catch (e) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  // Join a booking room after validation
  socket.on('join_booking', async ({ bookingId }) => {
    try {
      const Booking = require('./src/tables/booking');
      const Property = require('./src/tables/property');
      const b = await Booking.findById(bookingId).populate('property');
      if (!b) return;
      const isGuest = String(b.guest) === String(socket.user.id);
      const isOwner = b.property && String(b.property.host) === String(socket.user.id);
      const isAdmin = socket.user.userType === 'admin';
      if (!isGuest && !isOwner && !isAdmin) return;
      socket.join(`booking:${bookingId}`);
      io.to(socket.id).emit('joined_booking', { bookingId });
    } catch (_) {}
  });

  // Typing indicator within a booking room
  socket.on('typing', ({ bookingId, typing }) => {
    io.to(`booking:${bookingId}`).emit('typing', { bookingId, userId: socket.user.id, typing: !!typing });
  });

  // Optional: simple ping
  socket.on('ping', () => socket.emit('pong'));
});

async function seedAdminIfNeeded() {
    const adminEmail = process.env.ADMIN_EMAIL;
    let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH; // pre-hash recommended
    const adminPasswordPlain = process.env.ADMIN_PASSWORD; // fallback plain password
    if (!adminEmail || (!adminPasswordHash && !adminPasswordPlain)) return;
    const existing = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existing) {
        if (process.env.ADMIN_FORCE_RESET === '1' && adminPasswordPlain) {
            const newHash = await bcrypt.hash(adminPasswordPlain, 10);
            existing.passwordHash = newHash;
            existing.userType = 'admin';
            await existing.save();
            console.log('Admin password reset for', adminEmail.toLowerCase());
        }
        return;
    }
    if (!adminPasswordHash && adminPasswordPlain) {
        adminPasswordHash = await bcrypt.hash(adminPasswordPlain, 10);
    }
	await User.create({
		firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.ADMIN_LAST_NAME || 'Admin',
		email: adminEmail.toLowerCase(),
		phone: process.env.ADMIN_PHONE || '0000000000',
		passwordHash: adminPasswordHash,
		userType: 'admin'
	});
	console.log('Seeded admin account:', adminEmail.toLowerCase());
}

// Start server immediately (non-blocking) so platform marks service healthy
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Connect to Mongo asynchronously with retry to improve cold-start on platforms like Render
async function connectMongo(retryDelayMs = 5000) {
    try {
        await mongoose.connect(MONGO_URI);
        DB_READY = true;
        console.log('Connected to MongoDB');
        await seedAdminIfNeeded();

        // Run post-connect data maintenance tasks (avoid pre-connection buffering timeouts)
        if (typeof propertiesRouter?.sanitizeCommissionRates === 'function') {
          try {
            await propertiesRouter.sanitizeCommissionRates();
          } catch (e) {
            console.warn('Commission sanitize after connect failed:', e?.message || e);
          }
        }

        // Start payroll reminder scheduler (hourly) and run once at startup
        runPayrollReminderCycle(io).catch(() => {});
        setInterval(() => runPayrollReminderCycle(io), 60 * 60 * 1000);

    } catch (err) {
        DB_READY = false;
        console.error('MongoDB connection failed:', err?.message || err);
        setTimeout(() => connectMongo(retryDelayMs), Math.min(retryDelayMs, 30000));
    }
}

// Kick off initial connection (do not await)
connectMongo();
