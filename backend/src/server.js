const express = require('express');
require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');

const authRouter = require('./tables/auth');
const propertiesRouter = require('./routes/properties');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');
const paymentsRouter = require('./routes/payments');
const billingRouter = require('./routes/billing');
const supportRouter = require('./routes/support');
const messagesRouter = require('./routes/messages');
const User = require('./tables/user');

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/akwandadb';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', require('express').static(require('path').join(process.cwd(), 'uploads')));

app.get('/health', (req, res) => {
	res.json({ status: 'ok' }); 
});

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
        const Booking = require('./tables/booking');
        const Property = require('./tables/property');
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

async function start() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log('Connected to MongoDB');
		await seedAdminIfNeeded();
		app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
	} catch (err) {
		console.error('Failed to start server', err);
		process.exit(1);
	}
}

start();


