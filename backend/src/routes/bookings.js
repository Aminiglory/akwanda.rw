const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Commission = require('../tables/commission');
const Notification = require('../tables/notification');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Host confirms a booking, notifies guest
router.post('/:id/confirm', requireAuth, async (req, res) => {
	const booking = await Booking.findById(req.params.id).populate('property').populate('guest');
	if (!booking) return res.status(404).json({ message: 'Booking not found' });
	// Only property owner can confirm
	if (!booking.property || String(booking.property.host) !== String(req.user.id)) {
		return res.status(403).json({ message: 'Only property owner can confirm booking.' });
	}
	booking.status = 'confirmed';
	await booking.save();
	// Notify guest
	await Notification.create({
		type: 'booking_confirmed',
		title: 'Your booking is confirmed!',
		message: `Your booking for ${booking.property.title} has been confirmed by the owner.`,
		booking: booking._id,
		property: booking.property._id,
		recipientUser: booking.guest._id
	});
	res.json({ booking });
});
// ...existing code...

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

// Submit a rating for a booking
router.post('/:id/rate', requireAuth, async (req, res) => {
	const { rating, comment } = req.body;
	if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Invalid rating' });
	const booking = await Booking.findById(req.params.id).populate('property');
	if (!booking) return res.status(404).json({ message: 'Booking not found' });
	// Only guest can rate their booking
	if (String(booking.guest) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden'});
	booking.rating = rating;
	booking.comment = comment;
	await booking.save();
	// Add rating to property
	if (booking.property) {
		booking.property.ratings.push({ guest: req.user.id, rating, comment });
		await booking.property.save();
		// Notify property owner
		await Notification.create({
			type: 'property_rated',
			title: 'Your property received a new rating',
			message: `Rating: ${rating}/5\nComment: ${comment || 'No comment'}`,
			booking: booking._id,
			property: booking.property._id,
			recipientUser: booking.property.host
		});
	}
	res.json({ booking });
});

// Mark booking as ended (completed)
router.post('/:id/end', requireAuth, async (req, res) => {
	const booking = await Booking.findById(req.params.id).populate('property');
	if (!booking) return res.status(404).json({ message: 'Booking not found' });
	// Only guest or property owner can end booking
	const isGuest = String(booking.guest) === String(req.user.id);
	const isHost = booking.property && String(booking.property.host) === String(req.user.id);
	if (!isGuest && !isHost && req.user.userType !== 'admin') {
		return res.status(403).json({ message: 'Forbidden'});
	}
	booking.status = 'ended';
	await booking.save();
	res.json({ booking });
});

router.post('/', requireAuth, async (req, res) => {
	const { propertyId, checkIn, checkOut } = req.body;
	const property = await Property.findById(propertyId);
	if (!property || !property.isActive) return res.status(404).json({ message: 'Property not found' });
	const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
    const base = property.pricePerNight * nights;
    const totalAmount = Math.round(base * (1 - (property.discountPercent || 0) / 100));
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
  // Create admin notification (recipient null => admin scope)
  await Notification.create({
    type: 'booking_created',
    title: 'New booking created',
    message: `A booking was created for ${property.title}`,
    booking: booking._id,
    property: property._id,
    recipientUser: null
  });
  // Create host notification
  await Notification.create({
    type: 'booking_created',
    title: 'Your property was booked',
    message: `A guest booked ${property.title}`,
    booking: booking._id,
    property: property._id,
    recipientUser: property.host
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

// Get single booking (guest or admin only)
router.get('/:id', requireAuth, async (req, res) => {
    const b = await Booking.findById(req.params.id).populate('property').populate('guest', 'firstName lastName email phone');
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    const guestId = (b.guest && b.guest._id) ? String(b.guest._id) : String(b.guest);
    if (guestId !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ booking: b });
});

module.exports = router;


