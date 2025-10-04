const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Commission = require('../tables/commission');
const Notification = require('../tables/notification');
const User = require('../tables/user');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Auth middleware
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
			paymentMethod = 'mtn_mobile_money'
		} = req.body;

		// Validate required fields
		if (!propertyId || !checkIn || !checkOut || !numberOfGuests) {
			return res.status(400).json({ message: 'Missing required fields' });
		}

		// Validate payment method (only MTN Mobile Money and cash on arrival)
		const validPaymentMethods = ['mtn_mobile_money', 'cash'];
		if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
			return res.status(400).json({ message: 'Invalid payment method. Please choose MTN Mobile Money or Pay on Arrival.' });
		}

		// Blocked user cannot create bookings (auto-expire if punishment ended)
		const currentUser = await User.findById(req.user.id);
		if (!currentUser) return res.status(401).json({ message: 'Unauthorized' });
		if (currentUser.isBlocked) {
			const now = new Date();
			if (currentUser.blockedUntil && new Date(currentUser.blockedUntil) < now) {
				currentUser.isBlocked = false;
				currentUser.blockedUntil = null;
				await currentUser.save();
			} else {
				return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
			}
		}

		const property = await Property.findById(propertyId);
		if (!property || !property.isActive) {
			return res.status(404).json({ message: 'Property not found or inactive' });
		}

		// Prevent bookings when host is blocked (auto-expire if punishment ended)
		const hostUser = await User.findById(property.host);
		if (hostUser && hostUser.isBlocked) {
			const now = new Date();
			if (hostUser.blockedUntil && new Date(hostUser.blockedUntil) < now) {
				hostUser.isBlocked = false;
				hostUser.blockedUntil = null;
				await hostUser.save();
			} else {
				return res.status(403).json({ message: 'This property is temporarily unavailable.' });
			}
		}

		// Calculate pricing
		const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
		let basePrice = property.pricePerNight * nights;

		// Apply group discount if applicable
		let discountAmount = 0;
		if (groupBooking && groupSize >= 4 && property.groupBookingEnabled) {
			discountAmount = Math.round((basePrice * property.groupBookingDiscount) / 100);
		}

		const amountBeforeTax = Math.round(basePrice - discountAmount);
		
		// Calculate 3% RRA tax as INCLUDED in the paid amount (deducted from gross, not added)
		const taxRate = 3;
		// amountBeforeTax here is treated as the gross paid amount
		const taxAmount = Math.round((amountBeforeTax * taxRate) / (100 + taxRate));
		// Total paid amount remains the gross value (no extra added)
		const totalAmount = amountBeforeTax;

		// Calculate commission
		const commissionDoc = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
		const rate = commissionDoc ? commissionDoc.ratePercent : 10;
		const commissionAmount = Math.round((amountBeforeTax * rate) / 100);

		// Create booking
		const booking = await Booking.create({
			property: property._id,
			room: room || null,
			guest: req.user.id,
			checkIn: new Date(checkIn),
			checkOut: new Date(checkOut),
			numberOfGuests,
			amountBeforeTax,
			taxAmount,
			taxRate,
			totalAmount,
			status: 'pending',
			commissionAmount,
			commissionPaid: false,
			paymentMethod: paymentMethod || 'cash',
			paymentStatus: paymentMethod === 'mtn_mobile_money' ? 'pending' : 'unpaid',
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
		const { paymentMethod } = req.body;

		// Validate payment method
		if (paymentMethod !== 'mtn_mobile_money' && paymentMethod !== 'cash') {
			return res.status(400).json({ message: 'Invalid payment method. Please choose MTN Mobile Money or Pay on Arrival.' });
		}

		const booking = await Booking.findById(req.params.id).populate('property');
		if (!booking) return res.status(404).json({ message: 'Booking not found' });

		// Only the guest who made the booking can process payment
		if (String(booking.guest) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Unauthorized' });
		}

		booking.paymentMethod = paymentMethod;
		
		if (paymentMethod === 'cash') {
			// For cash payment, just update the method
			booking.paymentStatus = 'unpaid';
			await booking.save();
			res.json({ 
				success: true, 
				booking,
				message: 'Booking confirmed. Payment will be collected on arrival.' 
			});
		} else {
			// For MTN Mobile Money, redirect to payment
			await booking.save();
			res.json({ 
				success: true, 
				booking,
				message: 'Proceed to MTN Mobile Money payment',
				requiresPayment: true
			});
		}
	} catch (error) {
		console.error('Payment processing error:', error);
		res.status(500).json({ message: 'Payment processing failed', error: error.message });
	}
});
// Generate RRA tax receipt
router.get('/:id/rra-receipt', requireAuth, async (req, res) => {
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

		// Generate RRA receipt
		const rraReceipt = {
			receiptNumber: `RRA-${booking.confirmationCode}`,
			bookingId: booking._id,
			confirmationCode: booking.confirmationCode,
			issueDate: new Date().toISOString(),
			taxpayerName: 'AKWANDA.rw',
			taxpayerTIN: '123456789', // Replace with actual TIN
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
			pricing: {
				amountBeforeTax: booking.amountBeforeTax || 0,
				taxRate: booking.taxRate || 3,
				taxAmount: booking.taxAmount || 0,
				totalAmount: booking.totalAmount,
				discountApplied: booking.discountApplied || 0
			},
			payment: {
				method: booking.paymentMethod,
				status: booking.paymentStatus,
				transactionId: booking.transactionId || 'N/A'
			},
			taxDetails: {
				taxType: 'VAT',
				taxRate: `${booking.taxRate || 3}%`,
				taxableAmount: Math.max(0, (booking.totalAmount || 0) - (booking.taxAmount || 0)),
				taxAmount: booking.taxAmount || 0,
				description: 'Value Added Tax on accommodation services'
			},
			createdAt: booking.createdAt,
			status: booking.status
		};

		res.json({ rraReceipt });
	} catch (error) {
		console.error('RRA receipt generation error:', error);
		res.status(500).json({ message: 'Failed to generate RRA receipt', error: error.message });
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

		// Calculate commission for property owner (commission and tax deducted from the paid total)
		const propertyOwnerAmount = Math.max(0, (booking.totalAmount || 0) - (booking.commissionAmount || 0) - (booking.taxAmount || 0));

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
				amountBeforeTax: booking.amountBeforeTax || 0,
				taxAmount: booking.taxAmount || 0,
				taxRate: booking.taxRate || 3,
				totalAmount: booking.totalAmount,
				commissionAmount: booking.commissionAmount,
				propertyOwnerAmount: propertyOwnerAmount,
				discountApplied: booking.discountApplied || 0
			},
			payment: {
				method: booking.paymentMethod,
				status: booking.paymentStatus,
				transactionId: booking.transactionId || 'N/A'
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

// List all bookings (admin only)
router.get('/', requireAuth, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
        const bookings = await Booking.find({})
            .populate('property', 'title city address images host')
            .populate('guest', 'firstName lastName email phone')
            .sort({ createdAt: -1 });
        res.json({ bookings });
    } catch (error) {
        console.error('List bookings error:', error);
        res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
    }
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

// Get single booking (guest, property owner, or admin)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const b = await Booking.findById(req.params.id).populate('property').populate('guest', 'firstName lastName email phone');
        if (!b) return res.status(404).json({ message: 'Booking not found' });
        
        const guestId = (b.guest && b.guest._id) ? String(b.guest._id) : String(b.guest);
        const isGuest = guestId === req.user.id;
        const isAdmin = req.user.userType === 'admin';
        const isPropertyOwner = b.property && String(b.property.host) === String(req.user.id);
        
        if (!isGuest && !isAdmin && !isPropertyOwner) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        
        res.json({ booking: b });
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ message: 'Failed to fetch booking', error: error.message });
    }
});

// Update booking status (property owner or admin only)
router.patch('/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'ended'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const booking = await Booking.findById(req.params.id).populate('property');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Check if user is property owner or admin
        const isPropertyOwner = booking.property && String(booking.property.host) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';

        if (!isPropertyOwner && !isAdmin) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        booking.status = status;
        await booking.save();

        // Create notification for guest
        const Notification = require('../tables/notification');
        await Notification.create({
            type: 'booking_status_updated',
            title: 'Booking Status Updated',
            message: `Your booking ${booking.confirmationCode} has been ${status}`,
            booking: booking._id,
            recipientUser: booking.guest
        });

        res.json({ 
            success: true, 
            message: `Booking ${status} successfully`,
            booking 
        });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ message: 'Failed to update booking status', error: error.message });
    }
});

module.exports = router;


