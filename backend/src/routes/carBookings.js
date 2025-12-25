const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const CommissionSettings = require('../tables/commissionSettings');
const CommissionLevel = require('../tables/commissionLevel');

function requireAuth(req, res, next) {
  const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Create car booking (online flow)
router.post('/', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const CarRentalBooking = require('../tables/carRentalBooking');
    const { carId, pickupDate, returnDate, pickupLocation, returnLocation, withDriver, contactPhone, specialRequests, driverAge, paymentMethod } = req.body || {};
    if (!carId || !pickupDate || !returnDate || !pickupLocation) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const car = await CarRental.findById(carId).select('owner pricePerDay pricePerWeek pricePerMonth commissionLevel');
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    // Overlap check
    const overlapping = await CarRentalBooking.find({
      car: car._id,
      status: { $in: ['pending', 'confirmed', 'active'] },
      $or: [ { pickupDate: { $lt: end }, returnDate: { $gt: start } } ]
    }).countDocuments();
    if (overlapping > 0) return res.status(409).json({ message: 'Car not available for these dates' });

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const numberOfDays = Math.ceil((end - start) / MS_PER_DAY);
    const base = (car.pricePerDay || 0) * numberOfDays;
    // Simple weekly/monthly discount logic
    let total = base;
    if (car.pricePerWeek && numberOfDays >= 7) {
      const weeks = Math.floor(numberOfDays / 7);
      const remainder = numberOfDays % 7;
      total = weeks * car.pricePerWeek + remainder * car.pricePerDay;
    }
    if (car.pricePerMonth && numberOfDays >= 30) {
      const months = Math.floor(numberOfDays / 30);
      const rem = numberOfDays % 30;
      total = months * car.pricePerMonth + rem * (car.pricePerWeek || car.pricePerDay * 7) / 7;
    }

    const normalizedPaymentMethod = (() => {
      if (!paymentMethod) return undefined;
      const m = String(paymentMethod).toLowerCase();
      if (m === 'mtn_mobile_money' || m === 'mtn-momo' || m === 'mtnmomo' || m === 'mobile_money' || m === 'momo') return 'mobile_money';
      if (['cash', 'card', 'bank_transfer'].includes(m)) return m;
      return undefined;
    })();

    // Determine commission for online car bookings
    let commissionRate = 0;
    try {
      if (car && car.commissionLevel) {
        const level = await CommissionLevel.findById(car.commissionLevel).lean();
        if (level) {
          commissionRate = Number(level.onlineRate || 0);
        }
      }
    } catch (_) {}

    if (!commissionRate || commissionRate <= 0 || commissionRate > 100) {
      try {
        const settings = await CommissionSettings.getSingleton();
        commissionRate = Number(settings.premiumRate || settings.baseRate || 0);
      } catch (_) {
        commissionRate = 0;
      }
    }

    const commissionAmount = commissionRate > 0 ? Math.round(total * (commissionRate / 100)) : 0;

    const booking = await CarRentalBooking.create({
      car: car._id,
      guest: req.user.id,
      pickupDate: start,
      returnDate: end,
      pickupLocation,
      returnLocation: returnLocation || pickupLocation,
      numberOfDays,
      totalAmount: total,
      status: 'pending',
      channel: 'online',
      withDriver: !!withDriver,
      driverAge: driverAge || undefined,
      contactPhone: contactPhone || '',
      specialRequests: specialRequests || '',
      paymentMethod: normalizedPaymentMethod || undefined,
      commissionRate: commissionRate || undefined,
      commissionAmount,
      commissionPaid: false,
    });

    res.status(201).json({ booking });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create booking', error: e.message });
  }
});

// Create direct car booking (host-side, with final agreed price)
router.post('/direct', requireAuth, async (req, res) => {
  try {
    if (!req.user || (req.user.userType !== 'host' && req.user.userType !== 'admin')) {
      return res.status(403).json({ message: 'Only hosts can create direct car bookings' });
    }

    const CarRental = require('../tables/carRental');
    const CarRentalBooking = require('../tables/carRentalBooking');

    const {
      carId,
      pickupDate,
      returnDate,
      pickupLocation,
      returnLocation,
      guestName,
      guestEmail,
      guestPhone,
      paymentMethod,
      finalPrice,
      withDriver,
      contactPhone,
      specialRequests,
      driverAge,
    } = req.body || {};

    if (!carId || !pickupDate || !returnDate || !pickupLocation) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const car = await CarRental.findById(carId).select('owner pricePerDay pricePerWeek pricePerMonth commissionLevel');
    if (!car) return res.status(404).json({ message: 'Car not found' });
    if (String(car.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'You can only create direct bookings for your own vehicles' });
    }

    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const numberOfDays = Math.ceil((end - start) / MS_PER_DAY);

    const normalizedPaymentMethod = (() => {
      if (!paymentMethod) return undefined;
      const m = String(paymentMethod).toLowerCase();
      if (m === 'mtn_mobile_money' || m === 'mtn-momo' || m === 'mtnmomo' || m === 'mobile_money' || m === 'momo') return 'mobile_money';
      if (['cash', 'card', 'bank_transfer'].includes(m)) return m;
      return undefined;
    })();

    const price = Number(finalPrice);
    if (!price || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: 'Final agreed price is required for direct bookings' });
    }

    // Load commission rate: prefer per-vehicle level (directRate), fall back to global baseRate
    let commissionRate = 0;
    try {
      if (car && car.commissionLevel) {
        const level = await CommissionLevel.findById(car.commissionLevel).lean();
        if (level) {
          commissionRate = Number(level.directRate || 0);
        }
      }
    } catch (_) {}

    if (!commissionRate || commissionRate <= 0 || commissionRate > 100) {
      try {
        const settings = await CommissionSettings.getSingleton();
        commissionRate = Number(settings.baseRate || 0);
      } catch (_) {
        commissionRate = 0;
      }
    }
    const commissionAmount = commissionRate > 0 ? Math.round(price * (commissionRate / 100)) : 0;

    // Overlap check (same as online flow)
    const overlapping = await CarRentalBooking.find({
      car: car._id,
      status: { $in: ['pending', 'confirmed', 'active'] },
      $or: [{ pickupDate: { $lt: end }, returnDate: { $gt: start } }],
    }).countDocuments();
    if (overlapping > 0) return res.status(409).json({ message: 'Car not available for these dates' });

    const booking = await CarRentalBooking.create({
      car: car._id,
      guest: req.user.id, // host user recorded as creator; guestName/phone/email stored separately
      pickupDate: start,
      returnDate: end,
      pickupLocation,
      returnLocation: returnLocation || pickupLocation,
      numberOfDays,
      totalAmount: price,
      finalAgreedAmount: price,
      status: 'pending',
      channel: 'direct',
      paymentMethod: normalizedPaymentMethod || undefined,
      withDriver: !!withDriver,
      driverAge: driverAge || undefined,
      contactPhone: contactPhone || guestPhone || '',
      specialRequests: specialRequests || '',
      commissionRate: commissionRate || undefined,
      commissionAmount,
      commissionPaid: false,
      guestName: guestName || '',
      guestEmail: guestEmail || '',
      guestPhone: guestPhone || '',
    });

    return res.status(201).json({ booking });
  } catch (e) {
    console.error('[CarBookings][direct] error', e);
    return res.status(500).json({ message: 'Failed to create direct car booking', error: e.message });
  }
});

// My bookings (guest)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const CarRentalBooking = require('../tables/carRentalBooking');
    const list = await CarRentalBooking.find({ guest: req.user.id })
      .sort({ createdAt: -1 })
      .populate('car');
    res.json({ bookings: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Owner: bookings for my cars
router.get('/for-my-cars', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const CarRentalBooking = require('../tables/carRentalBooking');
    const myCarIds = await CarRental.find({ owner: req.user.id }).distinct('_id');
    const list = await CarRentalBooking.find({ car: { $in: myCarIds } })
      .sort({ createdAt: -1 })
      .populate('car')
      .populate('guest', 'firstName lastName email phone');
    res.json({ bookings: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch owner bookings' });
  }
});

// Update booking status (owner or admin)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const CarRentalBooking = require('../tables/carRentalBooking');
    const b = await CarRentalBooking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    const car = await CarRental.findById(b.car).select('owner');
    if (String(car.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { status } = req.body || {};
    const allowed = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    b.status = status;
    await b.save();
    res.json({ booking: b });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// Simple invoice PDF for car bookings (owner / guest / admin)
router.get('/:id/invoice', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const CarRentalBooking = require('../tables/carRentalBooking');

    const b = await CarRentalBooking.findById(req.params.id).populate('car').populate('guest');
    if (!b) return res.status(404).json({ message: 'Booking not found' });

    const car = b.car;
    if (!car) return res.status(404).json({ message: 'Vehicle not found for this booking' });

    const isOwner = String(car.owner) === String(req.user.id);
    const isGuest = b.guest && String(b.guest._id || b.guest) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isGuest && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const doc = new PDFDocument({ margin: 50 });
    const code = String(b._id).slice(-8);
    const filename = `car-invoice-${code}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(18).text('AKWANDA.rw', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(14).text('Vehicle Booking Invoice', { align: 'left' });
    doc.moveDown();

    const createdAt = b.createdAt ? new Date(b.createdAt) : new Date();
    doc.fontSize(10);
    doc.text(`Invoice #: ${code}`);
    doc.text(`Date: ${createdAt.toLocaleDateString()}`);
    doc.moveDown();

    // Vehicle details
    const vehicleName = car.vehicleName || `${car.brand || ''} ${car.model || ''}`.trim() || 'Vehicle';
    doc.text(`Vehicle: ${vehicleName}`);
    doc.text(`Category: ${car.category || 'car'}`);
    if (car.registrationNumber) doc.text(`Registration: ${car.registrationNumber}`);
    doc.moveDown();

    // Guest / renter details (prefer linked guest user, fallback to direct fields)
    const guestName = b.guest
      ? `${b.guest.firstName || ''} ${b.guest.lastName || ''}`.trim() || 'Guest'
      : (b.guestName || 'Guest');
    const guestEmail = (b.guest && b.guest.email) || b.guestEmail || '';
    const guestPhone = (b.guest && b.guest.phone) || b.guestPhone || b.contactPhone || '';

    doc.text(`Renter: ${guestName}`);
    if (guestEmail) doc.text(`Email: ${guestEmail}`);
    if (guestPhone) doc.text(`Phone: ${guestPhone}`);
    doc.moveDown();

    // Booking details
    const pickup = b.pickupDate ? new Date(b.pickupDate) : null;
    const ret = b.returnDate ? new Date(b.returnDate) : null;
    doc.text(`Pickup date: ${pickup ? pickup.toLocaleDateString() : '-'}`);
    doc.text(`Return date: ${ret ? ret.toLocaleDateString() : '-'}`);
    doc.text(`Days: ${b.numberOfDays || ''}`);
    doc.moveDown();

    // Amounts
    const totalAmount = Number(b.totalAmount || 0);
    const commissionAmount = Number(b.commissionAmount || 0);
    doc.text(`Total amount: RWF ${totalAmount.toLocaleString()}`);
    doc.text(`Commission amount: RWF ${commissionAmount.toLocaleString()}`);
    if (typeof b.commissionRate === 'number') {
      doc.text(`Commission rate: ${b.commissionRate}%`);
    }
    doc.moveDown();

    doc.text(`Status: ${b.status || 'pending'}`);
    doc.text(`Channel: ${b.channel || 'online'}`);

    doc.end();
  } catch (e) {
    console.error('Car booking invoice error:', e && e.message);
    return res.status(500).json({ message: 'Failed to generate invoice' });
  }
});

module.exports = router;
