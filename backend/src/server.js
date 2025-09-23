const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');

const authRouter = require('./tables/auth');
const propertiesRouter = require('./routes/properties');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');
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

app.get('/api/metrics/landing', async (req, res) => {
    try {
        const Booking = require('./tables/booking');
        const Property = require('./tables/property');
        const totalBookings = await Booking.countDocuments();
        const confirmedCount = await Booking.countDocuments({ status: 'confirmed' });
        const activeListings = await Property.countDocuments({ isActive: true });
        const distinctHappyGuests = await Booking.distinct('guest', { status: 'confirmed' });
        const satisfactionRate = totalBookings > 0 ? Math.round((confirmedCount / totalBookings) * 1000) / 10 : 0; // one decimal
        res.json({ metrics: { activeListings, happyGuests: distinctHappyGuests.length, satisfactionRate } });
    } catch (e) {
        res.status(500).json({ message: 'Failed to load metrics' });
    }
});

app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);

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


