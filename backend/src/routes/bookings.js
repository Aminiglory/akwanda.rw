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
	try {
		const { 
			propertyId, 
			room, 
			checkIn, 
			checkOut, 
			numberOfGuests, 
			contactInfo, 
			specialRequests, 
			groupBooking, 
			groupSize,
			paymentMethod = 'cash'
		} = req.body;

		// Validate required fields
		if (!propertyId || !checkIn || !checkOut || !numberOfGuests) {
			return res.status(400).json({ message: 'Missing required fields' });
		}

		const property = await Property.findById(propertyId);
		if (!property || !property.isActive) {
			return res.status(404).json({ message: 'Property not found or inactive' });
		}

		// Calculate pricing
		const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
		let basePrice = property.pricePerNight * nights;

		// If specific room is selected, use room pricing
		if (room) {
			const selectedRoom = property.rooms?.find(r => r._id.toString() === room);
			if (selectedRoom) {
				basePrice = selectedRoom.pricePerNight * nights;
			}
		}

		// Apply group discount if applicable
		let discountAmount = 0;
		if (groupBooking && groupSize >= 4 && property.groupBookingEnabled) {
			discountAmount = Math.round((basePrice * property.groupBookingDiscount) / 100);
		}

		const totalAmount = Math.round(basePrice - discountAmount);

		// Calculate commission
		const commissionDoc = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
		const rate = commissionDoc ? commissionDoc.ratePercent : 10;
		const commissionAmount = Math.round((totalAmount * rate) / 100);

		// Create booking
		const booking = await Booking.create({
			property: property._id,
			room: room || null,
			guest: req.user.id,
			checkIn: new Date(checkIn),
			checkOut: new Date(checkOut),
			numberOfGuests,
			totalAmount,
			status: 'pending',
			commissionAmount,
			commissionPaid: false,
			paymentMethod,
			paymentStatus: 'pending',
			contactPhone: contactInfo?.phone,
			specialRequests,
			groupBooking: groupBooking || false,
			groupSize: groupSize || numberOfGuests,
			discountApplied: discountAmount,
			guestContact: {
				phone: contactInfo?.phone,
				email: contactInfo?.email,
				emergencyContact: contactInfo?.emergencyContact
			}
		});

		// Create notifications
		await Notification.create({
			type: 'booking_created',
			title: 'New booking created',
			message: `A booking was created for ${property.title}`,
			booking: booking._id,
			property: property._id,
			recipientUser: null
		});

		await Notification.create({
			type: 'booking_created',
			title: 'Your property was booked',
			message: `A guest booked ${property.title} for ${nights} nights`,
			booking: booking._id,
			property: property._id,
			recipientUser: property.host
		});

		res.status(201).json({ booking });
	} catch (error) {
		console.error('Booking creation error:', error);
		res.status(500).json({ message: 'Failed to create booking', error: error.message });
	}
});

// Process payment for a booking
router.post('/:id/payment', requireAuth, async (req, res) => {
	try {
		const { paymentMethod, paymentDetails } = req.body;
		const booking = await Booking.findById(req.params.id).populate('property');
		
		if (!booking) return res.status(404).json({ message: 'Booking not found' });
		
		// Only the guest who made the booking can process payment
		if (String(booking.guest) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Unauthorized' });
		}

		// Update payment method and status
		booking.paymentMethod = paymentMethod;
		booking.paymentStatus = 'paid';
		booking.status = 'confirmed';
		await booking.save();

		// Notify property owner about payment
		await Notification.create({
			type: 'payment_received',
			title: 'Payment received for booking',
			message: `Payment of RWF ${booking.totalAmount.toLocaleString()} has been received for booking ${booking.confirmationCode}`,
			booking: booking._id,
			property: booking.property._id,
			recipientUser: booking.property.host
		});

		res.json({ 
			success: true, 
			booking,
			message: 'Payment processed successfully' 
		});
	} catch (error) {
		console.error('Payment processing error:', error);
		res.status(500).json({ message: 'Payment processing failed', error: error.message });
	}
});

// Generate receipt for property owner
router.get('/:id/receipt', requireAuth, async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id)
			.populate('property')
			.populate('guest', 'firstName lastName email phone');

		if (!booking) return res.status(404).json({ message: 'Booking not found' });

		// Only property owner, guest, or admin can view receipt
		const isPropertyOwner = booking.property && String(booking.property.host) === String(req.user.id);
		const isGuest = String(booking.guest._id) === String(req.user.id);
		const isAdmin = req.user.userType === 'admin';

		if (!isPropertyOwner && !isGuest && !isAdmin) {
			return res.status(403).json({ message: 'Unauthorized' });
		}

		// Calculate commission for property owner
		const propertyOwnerAmount = booking.totalAmount - booking.commissionAmount;

		const receipt = {
			bookingId: booking._id,
			confirmationCode: booking.confirmationCode,
			property: {
				title: booking.property.title,
				address: booking.property.address,
				city: booking.property.city
			},
			guest: {
				name: `${booking.guest.firstName} ${booking.guest.lastName}`,
				email: booking.guest.email,
				phone: booking.guest.phone
			},
			dates: {
				checkIn: booking.checkIn,
				checkOut: booking.checkOut,
				nights: Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
			},
			guests: booking.numberOfGuests,
			pricing: {
				totalAmount: booking.totalAmount,
				commissionAmount: booking.commissionAmount,
				propertyOwnerAmount: propertyOwnerAmount,
				discountApplied: booking.discountApplied || 0
			},
			payment: {
				method: booking.paymentMethod,
				status: booking.paymentStatus
			},
			createdAt: booking.createdAt,
			status: booking.status
		};

		res.json({ receipt });
	} catch (error) {
		console.error('Receipt generation error:', error);
		res.status(500).json({ message: 'Failed to generate receipt', error: error.message });
	}
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

// Get bookings for property owners
router.get('/property-owner', requireAuth, async (req, res) => {
	try {
		// Find all properties owned by the user
		const properties = await Property.find({ host: req.user.id }).select('_id');
		const propertyIds = properties.map(p => p._id);
		
		// Find all bookings for these properties
		const bookings = await Booking.find({ property: { $in: propertyIds } })
			.populate('property', 'title city address')
			.populate('guest', 'firstName lastName email phone')
			.sort({ createdAt: -1 });
		
		res.json({ bookings });
	} catch (error) {
		console.error('Property owner bookings error:', error);
		res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
	}
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


