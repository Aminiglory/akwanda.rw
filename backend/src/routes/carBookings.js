const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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

// Create car booking
router.post('/', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const CarRentalBooking = require('../tables/carRentalBooking');
    const { carId, pickupDate, returnDate, pickupLocation, returnLocation, withDriver, contactPhone, specialRequests, driverAge, paymentMethod } = req.body || {};
    if (!carId || !pickupDate || !returnDate || !pickupLocation) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const car = await CarRental.findById(carId);
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
      withDriver: !!withDriver,
      driverAge: driverAge || undefined,
      contactPhone: contactPhone || '',
      specialRequests: specialRequests || '',
      paymentMethod: normalizedPaymentMethod || undefined
    });

    res.status(201).json({ booking });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create booking', error: e.message });
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

module.exports = router;
