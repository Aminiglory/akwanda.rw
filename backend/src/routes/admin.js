const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Commission = require('../tables/commission');
const Booking = require('../tables/booking');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAdmin(req, res, next) {
	const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
	if (!token) return res.status(401).json({ message: 'Unauthorized' });
	try {
		const user = jwt.verify(token, JWT_SECRET);
		if (user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
		req.user = user;
		return next();
	} catch (e) {
		return res.status(401).json({ message: 'Invalid token' });
	}
}

router.get('/overview', requireAdmin, async (req, res) => {
	const totalBookings = await Booking.countDocuments();
	const pendingCommissions = await Booking.countDocuments({ commissionPaid: false, status: 'commission_due' });
	const confirmed = await Booking.countDocuments({ status: 'confirmed' });
	res.json({ metrics: { totalBookings, pendingCommissions, confirmed } });
});

router.post('/commission', requireAdmin, async (req, res) => {
	const { ratePercent } = req.body;
	if (!ratePercent || ratePercent <= 0 || ratePercent >= 100) {
		return res.status(400).json({ message: 'Invalid rate' });
	}
	const created = await Commission.create({ ratePercent, setBy: req.user.id });
	res.status(201).json({ commission: created });
});

router.get('/commission', requireAdmin, async (req, res) => {
	const current = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
	res.json({ commission: current });
});

module.exports = router;


