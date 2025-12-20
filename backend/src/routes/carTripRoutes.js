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

// GET /api/car-trip-routes -> list routes for current owner, optional filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const CarTripRoute = require('../tables/carTripRoute');
    const filter = { owner: req.user.id };
    if (req.query.car) {
      filter.car = req.query.car;
    }
    if (req.query.booking) {
      filter.booking = req.query.booking;
    }

    const dateFilter = {};
    if (req.query.from) {
      const from = new Date(req.query.from);
      if (!isNaN(from)) dateFilter.$gte = from;
    }
    if (req.query.to) {
      const to = new Date(req.query.to);
      if (!isNaN(to)) dateFilter.$lte = to;
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.date = dateFilter;
    }

    const routes = await CarTripRoute.find(filter)
      .populate('car', 'vehicleName brand model licensePlate')
      .populate('booking')
      .sort({ date: -1, createdAt: -1 });
    res.json({ routes });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load trip routes', error: e.message });
  }
});

// POST /api/car-trip-routes -> create or update route info for a booking
router.post('/', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const CarRentalBooking = require('../tables/carRentalBooking');
    const CarTripRoute = require('../tables/carTripRoute');

    const { booking, car, date, distanceKm, startOdometer, endOdometer, startLocation, endLocation, polyline, points } = req.body || {};
    if (!booking) {
      return res.status(400).json({ message: 'booking is required' });
    }

    const b = await CarRentalBooking.findById(booking).populate('car');
    if (!b) return res.status(404).json({ message: 'Booking not found' });

    const carDoc = await CarRental.findById(b.car || car).select('owner');
    if (!carDoc) return res.status(404).json({ message: 'Car not found for booking' });
    if (String(carDoc.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const payload = {
      owner: req.user.id,
      car: carDoc._id,
      booking: b._id,
      date: date ? new Date(date) : (b.pickupDate || undefined),
      distanceKm: distanceKm !== undefined && distanceKm !== null && distanceKm !== '' ? Number(distanceKm) : undefined,
      startOdometer: startOdometer !== undefined && startOdometer !== null && startOdometer !== '' ? Number(startOdometer) : undefined,
      endOdometer: endOdometer !== undefined && endOdometer !== null && endOdometer !== '' ? Number(endOdometer) : undefined,
      startLocation: startLocation || undefined,
      endLocation: endLocation || undefined,
      polyline: polyline || undefined,
      points: Array.isArray(points) ? points.map(p => ({
        lat: p.lat !== undefined ? Number(p.lat) : undefined,
        lng: p.lng !== undefined ? Number(p.lng) : undefined,
        timestamp: p.timestamp ? new Date(p.timestamp) : undefined,
      })) : undefined,
    };

    let route = await CarTripRoute.findOne({ owner: req.user.id, booking: b._id });
    if (route) {
      Object.assign(route, payload);
      await route.save();
    } else {
      route = await CarTripRoute.create(payload);
    }

    const populated = await CarTripRoute.findById(route._id)
      .populate('car', 'vehicleName brand model licensePlate')
      .populate('booking');

    res.status(201).json({ route: populated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save trip route', error: e.message });
  }
});

module.exports = router;
