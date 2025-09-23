const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Commission = require('../tables/commission');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
	const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
	if (!token) return res.status(401).json({ message: 'Unauthorized' });
	try {
		req.user = jwt.verify(token, JWT_SECRET);
		return next();
	} catch (e) {
		return res.status(401).json({ message: 'Invalid token' });
	}
}

router.post('/', requireAuth, async (req, res) => {
	const { propertyId, checkIn, checkOut } = req.body;
	const property = await Property.findById(propertyId);
	if (!property || !property.isActive) return res.status(404).json({ message: 'Property not found' });
	const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
	const totalAmount = property.pricePerNight * nights;
	const commissionDoc = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
	const rate = commissionDoc ? commissionDoc.ratePercent : 10;
	const commissionAmount = Math.round((totalAmount * rate) / 100);
	const booking = await Booking.create({
		property: property._id,
		guest: req.user.id,
		checkIn,
		checkOut,
		totalAmount,
		status: 'commission_due',
		commissionAmount,
		commissionPaid: false
	});
	res.status(201).json({ booking });
});

router.post('/:id/commission/confirm', requireAuth, async (req, res) => {
	// Only admin can mark commission as paid
	if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
	const booking = await Booking.findById(req.params.id);
	if (!booking) return res.status(404).json({ message: 'Booking not found' });
	booking.commissionPaid = true;
	booking.status = 'confirmed';
	await booking.save();
	res.json({ booking });
});

router.get('/mine', requireAuth, async (req, res) => {
	const query = { guest: req.user.id };
	const list = await Booking.find(query).populate('property');
	res.json({ bookings: list });
});

module.exports = router;


