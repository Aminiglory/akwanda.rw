const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Worker = require('../tables/worker');
const Commission = require('../tables/commission');
const Notification = require('../tables/notification');
const User = require('../tables/user');
const bcrypt = require('bcryptjs');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// If caller is a worker, ensure they have the required privilege; hosts and admins bypass
function requireWorkerPrivilege(privKey) {
  return async function(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      if (req.user.userType === 'admin' || req.user.userType === 'host') return next();
      if (req.user.userType !== 'worker') return res.status(403).json({ message: 'Not allowed' });
      const worker = await Worker.findOne({ userAccount: req.user.id, isActive: true });
      if (!worker) return res.status(403).json({ message: 'Worker profile not found' });
      if (!worker.privileges || worker.privileges[privKey] !== true) {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }
      return next();
    } catch (e) {
      return res.status(500).json({ message: 'Privilege check failed' });
    }
  };
}

// Normalize a YYYY-MM-DD (or ISO) to a local date at 12:00 to avoid TZ edge cases
function normalizeYMDToLocal(dateLike) {
  if (!dateLike) return new Date(NaN);
  const s = String(dateLike);
  // If it's a pure date (YYYY-MM-DD), parse components to local date
  const m = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (m) {
    const [y, mm, dd] = s.split('-').map(Number);
    const d = new Date(y, mm - 1, dd, 12, 0, 0, 0);
    return d;
  }
  // Fallback: rely on Date parsing, then shift to midday local to remove DST/TZ midnight flips
  const d = new Date(s);
  if (!isNaN(d.getTime())) d.setHours(12, 0, 0, 0);
  return d;
}

// Host confirms a booking, notifies guest
router.post('/:id/confirm', requireAuth, requireWorkerPrivilege('canConfirmBookings'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('property').populate('guest');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    // Only property owner or admin can confirm
    const isPropertyOwner = booking.property && String(booking.property.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isPropertyOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only property owner or admin can confirm booking.' });
    }
    // Ensure booking is in a confirmable state (pending or awaiting)
    if (!['pending', 'awaiting'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking cannot be confirmed in its current state.' });
    }
    booking.status = 'confirmed';
    await booking.save();
    // Notify guest
    const confirmedBy = isAdmin ? 'admin' : 'owner';
    await Notification.create({
      type: 'booking_confirmed',
      title: 'Your booking is confirmed!',
      message: `Your booking for ${booking.property.title} has been confirmed by the ${confirmedBy}.`,
      booking: booking._id,
      property: booking.property._id,
      recipientUser: booking.guest._id
    });
    // Notify property owner about commission obligation
    if (booking.commissionAmount > 0) {
      await Notification.create({
        type: 'commission_due',
        title: 'Commission Payment Due',
        message: `Commission of RWF ${booking.commissionAmount.toLocaleString()} is due for confirmed booking ${booking.confirmationCode}. Rate: ${booking.property.commissionRate || 10}%`,
        booking: booking._id,
        property: booking.property._id,
        recipientUser: booking.property.host
      });
    }
    res.json({ booking });
  } catch (e) {
    return res.status(500).json({ message: 'Confirmation failed' });
  }
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
			paymentMethod = 'mtn_mobile_money',
			couponCode,
			guestInfo,
			markPaid,
			directBooking
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

		// Prevent property owner from booking their own property
		if (String(property.host) === String(req.user.id)) {
			return res.status(403).json({ message: 'Owners cannot book their own properties' });
		}

		// Prevent overlapping bookings for the same room/property
		const start = normalizeYMDToLocal(checkIn);
		const end = normalizeYMDToLocal(checkOut);
		if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
			return res.status(400).json({ message: 'Invalid check-in/check-out dates' });
		}
		// If room specified, ensure it exists under property
		let roomDoc = null;
		if (room) {
			roomDoc = (property.rooms || []).id(room);
			if (!roomDoc) return res.status(400).json({ message: 'Selected room not found in property' });
			// Check room closedDates overlap
			const roomClosed = Array.isArray(roomDoc.closedDates) && roomDoc.closedDates.some(cd => {
				if (!cd || !cd.startDate || !cd.endDate) return false;
				const cs = new Date(cd.startDate); const ce = new Date(cd.endDate);
				return cs < end && ce > start;
			});
			if (roomClosed) return res.status(409).json({ message: 'Room is locked for selected dates' });
		}
		// Overlap query: any booking on this property (and same room if provided) overlapping dates and not cancelled/ended
		const overlapQuery = {
			property: property._id,
			status: { $nin: ['cancelled', 'ended'] },
			$or: [ { checkIn: { $lt: end }, checkOut: { $gt: start } } ]
		};
		if (room) overlapQuery.room = room;
		const conflict = await Booking.findOne(overlapQuery).lean();
		if (conflict) {
			return res.status(409).json({ message: 'Selected dates are no longer available' });
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

		// Guest breakdown (adults/children/infants) and capacity checks
		const gb = {
			adults: Math.max(1, Number(req.body?.guestBreakdown?.adults || req.body?.numberOfGuests || 1)),
			children: Math.max(0, Number(req.body?.guestBreakdown?.children || 0)),
			infants: Math.max(0, Number(req.body?.guestBreakdown?.infants || 0))
		};
		const totalGuests = gb.adults + gb.children + gb.infants;
		// Room capacity and per-type limits if room is specified
		if (roomDoc) {
			const withinCapacity = totalGuests <= Number(roomDoc.capacity || 0);
			const withinTypes = gb.adults <= (roomDoc.maxAdults || gb.adults)
				&& gb.children <= (roomDoc.maxChildren ?? gb.children)
				&& gb.infants <= (roomDoc.maxInfants ?? gb.infants);
			if (!withinCapacity || !withinTypes) {
				return res.status(400).json({ message: 'Guest count exceeds room capacity or policy limits' });
			}
		} else {
			if (totalGuests > Number(property.bedrooms || 1) * 3) {
				return res.status(400).json({ message: 'Guest count too large for selected property' });
			}
		}

		// Calculate pricing
		const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
		// Determine nightly base from room if provided
		let nightlyBase = property.pricePerNight;
		if (roomDoc) nightlyBase = roomDoc.pricePerNight || nightlyBase;
		// Apply simple guest-type pricing: adults 100%, children policy percent, infants free
		const childPercent = roomDoc && roomDoc.childrenPolicy && typeof roomDoc.childrenPolicy.chargePercent === 'number'
			? roomDoc.childrenPolicy.chargePercent : 50;
		const infantsChargePercent = 0;
		const perNightFactor = Math.max(1,
			gb.adults + (gb.children * (childPercent / 100)) + (gb.infants * (infantsChargePercent / 100))
		);
		let basePrice = Math.round(nightlyBase * perNightFactor) * nights;

		// Apply best active promotion (last-minute, advance-purchase, coupon, member rate)
		try {
			const nowTs = new Date();
			const withinDateRange = (promo) => {
				const sOk = !promo.startDate || nowTs >= new Date(promo.startDate);
				const eOk = !promo.endDate || nowTs <= new Date(promo.endDate);
				return sOk && eOk;
			};
			const daysUntilCheckIn = Math.max(0, Math.ceil((new Date(checkIn) - nowTs) / (1000 * 60 * 60 * 24)));
			const promos = Array.isArray(property.promotions) ? property.promotions.filter(p => p && p.active) : [];
			let bestPercent = 0;
			for (const p of promos) {
				if (!withinDateRange(p)) continue;
				if (p.type === 'coupon') {
					if (!couponCode || !p.couponCode || String(p.couponCode).toLowerCase() !== String(couponCode).toLowerCase()) continue;
				}
				if (p.type === 'last_minute') {
					const within = p.lastMinuteWithinDays != null ? daysUntilCheckIn <= Number(p.lastMinuteWithinDays) : false;
					if (!within) continue;
				}
				if (p.type === 'advance_purchase') {
					const meets = p.minAdvanceDays != null ? daysUntilCheckIn >= Number(p.minAdvanceDays) : false;
					if (!meets) continue;
				}
				if (typeof p.discountPercent === 'number') {
					bestPercent = Math.max(bestPercent, Math.min(90, Math.max(1, Number(p.discountPercent))));
				}
			}
			if (bestPercent > 0) {
				basePrice = Math.round(basePrice * (1 - (bestPercent / 100)));
			}
		} catch (_) {}

		// Apply group discount if applicable
		let discountAmount = 0;
		if (groupBooking && groupSize >= 4 && property.groupBookingEnabled) {
			discountAmount = Math.round((basePrice * property.groupBookingDiscount) / 100);
		}

		const amountBeforeTax = Math.round(basePrice - discountAmount);
		
		const taxRate = 3;
		const taxAmount = Math.round((amountBeforeTax * taxRate) / (100 + taxRate));
		const totalAmount = amountBeforeTax; // remains gross
		// Use property-specific commission rate, fallback to global rate if not set
		let rate = property.commissionRate;
		if (!rate || rate < 8 || rate > 12) {
			const commissionDoc = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
			rate = commissionDoc ? Math.min(12, Math.max(8, commissionDoc.ratePercent)) : 10;
		}
		const commissionAmount = Math.round((amountBeforeTax * rate) / 100);

		let guestId = req.user.id;
		const isAdmin = req.user.userType === 'admin';
		const isPropertyOwner = String(property.host) === String(req.user.id);
		if (guestInfo && (isAdmin || isPropertyOwner)) {
			const emailLower = (guestInfo.email || '').toLowerCase();
			let guestUser = emailLower ? await User.findOne({ email: emailLower }) : null;
			if (!guestUser) {
				const pwd = Math.random().toString(36).slice(2, 10);
				const passwordHash = await bcrypt.hash(pwd, 10);
				guestUser = await User.create({
					firstName: guestInfo.firstName || 'Guest',
					lastName: guestInfo.lastName || 'User',
					email: emailLower || `guest_${Date.now()}@example.com`,
					phone: guestInfo.phone || 'N/A',
					passwordHash,
					userType: 'guest'
				});
			}
			guestId = guestUser._id;
		}

		const shouldMarkPaid = paymentMethod === 'cash' && !!markPaid;

		const booking = await Booking.create({
			property: property._id,
			room: room || null,
			guest: guestId,
			checkIn: start,
			checkOut: end,
			numberOfGuests,
			amountBeforeTax,
			taxAmount,
			taxRate,
			totalAmount,
			status: shouldMarkPaid ? 'confirmed' : 'pending',
			commissionAmount,
			commissionPaid: false,
			paymentMethod: paymentMethod || 'cash',
			paymentStatus: paymentMethod === 'mtn_mobile_money' ? 'pending' : (shouldMarkPaid ? 'paid' : 'unpaid'),
			contactPhone: contactInfo?.phone,
			specialRequests,
			groupBooking: groupBooking || false,
			groupSize: groupSize || numberOfGuests,
			discountApplied: discountAmount,
			guestBreakdown: gb,
			guestContact: {
				phone: contactInfo?.phone,
				email: contactInfo?.email,
				emergencyContact: contactInfo?.emergencyContact
			},
			isDirect: !!directBooking
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

// Export RRA receipt as CSV
router.get('/:id/rra-receipt.csv', requireAuth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('property')
            .populate('guest', 'firstName lastName email phone');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const isPropertyOwner = booking.property && String(booking.property.host) === String(req.user.id);
        const isGuest = String(booking.guest._id) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';
        if (!isPropertyOwner && !isGuest && !isAdmin) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const headers = [
            'receiptNumber','bookingId','confirmationCode','issueDate','taxpayerName','taxpayerTIN','propertyTitle','propertyAddress','propertyCity','guestName','guestEmail','guestPhone','checkIn','checkOut','nights','amountBeforeTax','taxRate','taxAmount','totalAmount','discountApplied','paymentMethod','paymentStatus','transactionId','status','createdAt'
        ];
        const row = [
            `RRA-${booking.confirmationCode}`,
            String(booking._id),
            String(booking.confirmationCode || ''),
            new Date().toISOString(),
            'AKWANDA.rw',
            '123456789',
            String(booking.property?.title || ''),
            String(booking.property?.address || ''),
            String(booking.property?.city || ''),
            `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim(),
            String(booking.guest?.email || ''),
            String(booking.guest?.phone || ''),
            new Date(booking.checkIn).toISOString(),
            new Date(booking.checkOut).toISOString(),
            String(Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))),
            String(booking.amountBeforeTax || 0),
            String(booking.taxRate || 3),
            String(booking.taxAmount || 0),
            String(booking.totalAmount || 0),
            String(booking.discountApplied || 0),
            String(booking.paymentMethod || ''),
            String(booking.paymentStatus || ''),
            String(booking.transactionId || 'N/A'),
            String(booking.status || ''),
            new Date(booking.createdAt).toISOString()
        ];

        const csv = [headers.join(','), row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=rra-receipt-${booking.confirmationCode || booking._id}.csv`);
        return res.send(csv);
    } catch (error) {
        console.error('RRA receipt CSV error:', error);
        return res.status(500).json({ message: 'Failed to export RRA CSV', error: error.message });
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

// Export property owner receipt as CSV
router.get('/:id/receipt.csv', requireAuth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('property')
            .populate('guest', 'firstName lastName email phone');

        // ... (rest of the code remains the same)
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const isPropertyOwner = booking.property && String(booking.property.host) === String(req.user.id);
        const isGuest = String(booking.guest._id) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';
        if (!isPropertyOwner && !isGuest && !isAdmin) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const propertyOwnerAmount = Math.max(0, (booking.totalAmount || 0) - (booking.commissionAmount || 0) - (booking.taxAmount || 0));

        const headers = [
            'bookingId','confirmationCode','propertyTitle','propertyAddress','propertyCity','guestName','guestEmail','guestPhone','checkIn','checkOut','nights','guests','amountBeforeTax','taxAmount','taxRate','totalAmount','commissionAmount','propertyOwnerAmount','discountApplied','paymentMethod','paymentStatus','transactionId','status','createdAt'
        ];
        const row = [
            String(booking._id),
            String(booking.confirmationCode || ''),
            String(booking.property?.title || ''),
            String(booking.property?.address || ''),
            String(booking.property?.city || ''),
            `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim(),
            String(booking.guest?.email || ''),
            String(booking.guest?.phone || ''),
            new Date(booking.checkIn).toISOString(),
            new Date(booking.checkOut).toISOString(),
            String(Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))),
            String(booking.numberOfGuests || ''),
            String(booking.amountBeforeTax || 0),
            String(booking.taxAmount || 0),
            String(booking.taxRate || 3),
            String(booking.totalAmount || 0),
            String(booking.commissionAmount || 0),
            String(propertyOwnerAmount || 0),
            String(booking.discountApplied || 0),
            String(booking.paymentMethod || ''),
            String(booking.paymentStatus || ''),
            String(booking.transactionId || 'N/A'),
            String(booking.status || ''),
            new Date(booking.createdAt).toISOString()
        ];

        const csv = [headers.join(','), row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=booking-receipt-${booking.confirmationCode || booking._id}.csv`);
        return res.send(csv);
    } catch (error) {
        console.error('Receipt CSV error:', error);
        return res.status(500).json({ message: 'Failed to export CSV', error: error.message });
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
	// Notify owner and admin (admin-wide) that commission was paid
	try {
		await Notification.create({
			type: 'commission_paid',
			title: 'Commission paid',
			message: `Commission has been marked as paid for booking ${booking.confirmationCode || booking._id}.`,
			booking: booking._id,
			recipientUser: null
		});
		const prop = await Property.findById(booking.property).select('host');
		if (prop?.host) {
			await Notification.create({
				type: 'commission_paid',
				title: 'Commission settled',
				message: 'Commission on your booking has been settled by admin.',
				booking: booking._id,
				recipientUser: prop.host
			});
		}
	} catch (_) {}
	res.json({ booking });
});

// Cancel a booking (guest who made it, property owner, or admin). Not allowed after end date or if already cancelled.
router.post('/:id/cancel', requireAuth, requireWorkerPrivilege('canCancelBookings'), async (req, res) => {
    try {
        const b = await Booking.findById(req.params.id).populate('property').populate('guest');
        if (!b) return res.status(404).json({ message: 'Booking not found' });

        const isGuest = String(b.guest?._id || b.guest) === String(req.user.id);
        const isOwner = b.property && String(b.property.host) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';
        if (!isGuest && !isOwner && !isAdmin) return res.status(403).json({ message: 'Unauthorized' });

        if (b.status === 'cancelled' || b.status === 'ended') {
            return res.status(400).json({ message: 'Cannot cancel this booking' });
        }
        // Simple policy: cannot cancel after check-in date starts
        const now = new Date();
        if (b.checkIn && now >= new Date(b.checkIn) && !isAdmin) {
            return res.status(400).json({ message: 'Cannot cancel after check-in' });
        }

        b.status = 'cancelled';
        await b.save();

        // Notify parties
        try {
            await Notification.create({
                type: 'booking_cancelled',
                title: 'Booking cancelled',
                message: `Booking ${b.confirmationCode || b._id} was cancelled.`,
                booking: b._id,
                property: b.property?._id,
                recipientUser: null
            });
            if (b.property?.host) {
                await Notification.create({
                    type: 'booking_cancelled',
                    title: 'Your booking was cancelled',
                    message: `A booking at your property was cancelled.`,
                    booking: b._id,
                    property: b.property._id,
                    recipientUser: b.property.host
                });
            }
            await Notification.create({
                type: 'booking_cancelled',
                title: 'Your booking was cancelled',
                message: `Your booking was cancelled.`,
                booking: b._id,
                property: b.property?._id,
                recipientUser: b.guest?._id || b.guest
            });
        } catch (_) {}

        return res.json({ booking: b });
    } catch (error) {
        console.error('Cancel booking error:', error);
        return res.status(500).json({ message: 'Failed to cancel booking', error: error.message });
    }
});

// List all bookings (admin only)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { propertyId, month, year } = req.query;
        // If propertyId filter is provided, allow property owner or admin to view; also allow owner of that property
        let query = {};
        if (propertyId) {
            query.property = propertyId;
            // Date window if month/year provided
            if (month && year) {
                const m = Number(month) - 1; // JS months 0-based
                const y = Number(year);
                const start = new Date(y, m, 1);
                const end = new Date(y, m + 1, 1);
                query.$or = [ { checkIn: { $lt: end }, checkOut: { $gt: start } } ];
            }
            // Access control: guest can view their own bookings; property owner and admin can view property bookings
            const property = await Property.findById(propertyId).select('host');
            const isOwner = property && String(property.host) === String(req.user.id);
            const isAdmin = req.user.userType === 'admin';
            const isGuest = !isOwner && !isAdmin; // fall back to guest scope
            if (!isOwner && !isAdmin && !isGuest) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            if (isGuest) {
                query.guest = req.user.id;
            }
        } else {
            // No property filter: admin only
            if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
        }

        const bookings = await Booking.find(query)
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
        const validStatuses = ['pending', 'awaiting', 'confirmed', 'cancelled', 'ended'];
        
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

// Visitors analytics for property owners
// GET /api/bookings/owner/visitors-analytics?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/owner/visitors-analytics', requireAuth, async (req, res) => {
    try {
        // Identify properties owned by the current user
        const properties = await Property.find({ host: req.user.id }).select('_id rooms');
        if (!properties.length) return res.json({ kpis: { uniqueGuests: 0, totalBookings: 0, totalNights: 0, occupancyPercent: 0 } });

        const ids = properties.map(p => p._id);
        const roomsCount = properties.reduce((sum, p) => sum + (Array.isArray(p.rooms) ? p.rooms.length : 0), 0) || 1;

        // Date range (defaults last 30 days)
        const now = new Date();
        const defaultStart = new Date(now); defaultStart.setDate(now.getDate() - 29);
        const start = req.query.start ? new Date(req.query.start) : defaultStart;
        const end = req.query.end ? new Date(req.query.end) : now;
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return res.status(400).json({ message: 'Invalid date range' });
        }

        // Get bookings overlapping the range (exclude cancelled)
        const bookings = await Booking.find({
            property: { $in: ids },
            status: { $nin: ['cancelled'] },
            $or: [ { checkIn: { $lt: end }, checkOut: { $gt: start } } ]
        }).select('guest checkIn checkOut');

        const uniqueGuestsSet = new Set(bookings.map(b => String(b.guest)));
        const totalBookings = bookings.length;
        // Compute booked room nights within range
        let totalNights = 0;
        for (const b of bookings) {
            const s = new Date(Math.max(new Date(b.checkIn).getTime(), new Date(start).getTime()));
            const e = new Date(Math.min(new Date(b.checkOut).getTime(), new Date(end).getTime()));
            const nights = Math.max(0, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
            totalNights += nights;
        }
        const rangeDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        const capacityRoomNights = roomsCount * rangeDays;
        const occupancyPercent = capacityRoomNights ? Math.round((totalNights / capacityRoomNights) * 1000) / 10 : 0;

        res.json({ kpis: {
            uniqueGuests: uniqueGuestsSet.size,
            totalBookings,
            totalNights,
            occupancyPercent
        }});
    } catch (error) {
        console.error('Visitors analytics error:', error);
        res.status(500).json({ message: 'Failed to compute visitors analytics', error: error.message });
    }
});

// Post review to a booking (guest or admin). Stores on Booking.rating/comment
router.post('/:id/review', requireAuth, async (req, res) => {
    try {
        const { rating, comment } = req.body || {};
        const booking = await Booking.findById(req.params.id).populate('property');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const isGuest = String(booking.guest) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';
        if (!isGuest && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

        // Optional: only allow review after checkout date
        if (booking.checkOut && new Date() < new Date(booking.checkOut)) {
            return res.status(400).json({ message: 'You can only review after your stay' });
        }

        const r = Number(rating);
        if (!(r >= 1 && r <= 5)) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

        booking.rating = r;
        booking.comment = String(comment || '').slice(0, 2000);
        await booking.save();

        // Notify the property owner about the new review
        try {
            if (booking.property?.host) {
                await Notification.create({
                    type: 'review_received',
                    title: 'New review received',
                    message: `A guest left a rating of ${r}/5 on a recent stay.`,
                    booking: booking._id,
                    property: booking.property._id,
                    recipientUser: booking.property.host
                });
            }
        } catch (_) { /* ignore notification errors */ }

        return res.json({ bookingId: booking._id, rating: booking.rating, comment: booking.comment });
    } catch (error) {
        console.error('Post review error:', error);
        res.status(500).json({ message: 'Failed to post review', error: error.message });
    }
});

// Get reviews for properties owned by the authenticated host
router.get('/owner/reviews', requireAuth, async (req, res) => {
    try {
        const myProps = await Property.find({ host: req.user.id }).select('_id title');
        const ids = myProps.map(p => String(p._id));
        if (!ids.length) return res.json({ reviews: [], avgRating: 0, count: 0 });

        const bookings = await Booking.find({ property: { $in: ids }, rating: { $exists: true, $ne: null } })
            .select('property rating comment guest createdAt')
            .populate('guest', 'firstName lastName');

        const byPropTitle = new Map(myProps.map(p => [String(p._id), p.title]));
        const reviews = bookings.map(b => ({
            propertyId: String(b.property),
            propertyTitle: byPropTitle.get(String(b.property)) || '',
            rating: b.rating,
            comment: b.comment,
            guest: b.guest,
            createdAt: b.createdAt
        }));

        const count = reviews.length;
        const avgRating = count ? Math.round((reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count) * 10) / 10 : 0;
        return res.json({ reviews, avgRating, count });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// List bookings for the authenticated guest
router.get('/mine', requireAuth, async (req, res) => {
    try {
        const list = await Booking.find({ guest: req.user.id })
            .sort({ createdAt: -1 })
            .select('property checkIn checkOut totalAmount status paymentStatus rating comment createdAt confirmationCode')
            .populate('property', 'title images city address');
        res.json({ bookings: list });
    } catch (error) {
        console.error('List my bookings error:', error);
        res.status(500).json({ message: 'Failed to fetch your bookings', error: error.message });
    }
});

module.exports = router;
