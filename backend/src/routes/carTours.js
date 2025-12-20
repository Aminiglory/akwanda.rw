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

// GET /api/car-tours -> list tours for current owner (optional primaryCar filter)
router.get('/', requireAuth, async (req, res) => {
  try {
    const CarTour = require('../tables/carTour');
    const filter = { owner: req.user.id };
    if (req.query.car) {
      filter.primaryCar = req.query.car;
    }
    if (req.query.active === '1') {
      filter.isActive = true;
    }
    const tours = await CarTour.find(filter)
      .sort({ createdAt: -1 });
    res.json({ tours });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load tours', error: e.message });
  }
});

// POST /api/car-tours -> create a new tour for current owner
router.post('/', requireAuth, async (req, res) => {
  try {
    const CarTour = require('../tables/carTour');
    const { primaryCar, title, description, startLocation, endLocation, durationHours, basePrice, currency, stops, tags } = req.body || {};
    if (!title || !startLocation || !endLocation || !basePrice) {
      return res.status(400).json({ message: 'title, startLocation, endLocation and basePrice are required' });
    }

    const payload = {
      owner: req.user.id,
      primaryCar: primaryCar || undefined,
      title: String(title),
      description: description || undefined,
      startLocation: String(startLocation),
      endLocation: String(endLocation),
      durationHours: durationHours !== undefined && durationHours !== null && durationHours !== '' ? Number(durationHours) : undefined,
      basePrice: Number(basePrice),
      currency: currency || 'RWF',
      isActive: true,
      tags: Array.isArray(tags) ? tags.map(String) : undefined,
      stops: Array.isArray(stops) ? stops.map((s, idx) => ({
        name: String(s.name || `Stop ${idx + 1}`),
        description: s.description || undefined,
        order: s.order !== undefined ? Number(s.order) : idx,
        lat: s.lat !== undefined ? Number(s.lat) : undefined,
        lng: s.lng !== undefined ? Number(s.lng) : undefined,
      })) : undefined,
    };

    const created = await CarTour.create(payload);
    res.status(201).json({ tour: created });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create tour', error: e.message });
  }
});

// PATCH /api/car-tours/:id -> update a tour (owner or admin)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const CarTour = require('../tables/carTour');
    const tour = await CarTour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    if (String(tour.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { primaryCar, title, description, startLocation, endLocation, durationHours, basePrice, currency, isActive, stops, tags } = req.body || {};

    if (primaryCar !== undefined) tour.primaryCar = primaryCar || undefined;
    if (title !== undefined) tour.title = title;
    if (description !== undefined) tour.description = description || undefined;
    if (startLocation !== undefined) tour.startLocation = startLocation;
    if (endLocation !== undefined) tour.endLocation = endLocation;
    if (durationHours !== undefined) tour.durationHours = durationHours !== '' ? Number(durationHours) : undefined;
    if (basePrice !== undefined) tour.basePrice = Number(basePrice);
    if (currency !== undefined) tour.currency = currency || 'RWF';
    if (isActive !== undefined) tour.isActive = !!isActive;
    if (Array.isArray(tags)) tour.tags = tags.map(String);
    if (Array.isArray(stops)) {
      tour.stops = stops.map((s, idx) => ({
        name: String(s.name || `Stop ${idx + 1}`),
        description: s.description || undefined,
        order: s.order !== undefined ? Number(s.order) : idx,
        lat: s.lat !== undefined ? Number(s.lat) : undefined,
        lng: s.lng !== undefined ? Number(s.lng) : undefined,
      }));
    }

    await tour.save();
    res.json({ tour });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update tour', error: e.message });
  }
});

// DELETE /api/car-tours/:id -> delete tour
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const CarTour = require('../tables/carTour');
    const tour = await CarTour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    if (String(tour.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await tour.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete tour', error: e.message });
  }
});

module.exports = router;
