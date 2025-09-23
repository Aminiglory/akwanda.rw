const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const authRouter = require('./tables/auth');
const propertiesRouter = require('./routes/properties');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
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

app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);

async function seedAdminIfNeeded() {
	const adminEmail = process.env.ADMIN_EMAIL;
	const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH; // pre-hash recommended
	if (!adminEmail || !adminPasswordHash) return;
	const existing = await User.findOne({ email: adminEmail.toLowerCase() });
	if (existing) return;
	await User.create({
		firstName: 'Super',
		lastName: 'Admin',
		email: adminEmail.toLowerCase(),
		phone: '0000000000',
		passwordHash: adminPasswordHash,
		userType: 'admin'
	});
	console.log('Seeded super admin account');
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


