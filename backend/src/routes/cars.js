const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');
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

function requireOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId) return res.status(404).json({ message: 'Not found' });
      if (String(ownerId) === String(req.user.id) || req.user.userType === 'admin') return next();
      return res.status(403).json({ message: 'Forbidden' });
    } catch (e) {
      return res.status(500).json({ message: 'Auth check failed' });
    }
  };
}

// uploads -> use memory storage and forward to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public list cars with filters
router.get('/', async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const { location, type, q } = req.query;
    const filter = {};
    if (location) filter.location = new RegExp(location, 'i');
    if (type) filter.vehicleType = type;
    if (q) filter.$or = [
      { vehicleName: new RegExp(q, 'i') },
      { brand: new RegExp(q, 'i') },
      { model: new RegExp(q, 'i') }
    ];
    const cars = await CarRental.find(filter).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list cars' });
  }
});

// Owner: list my cars (must be declared before /:id so "/mine" doesn't get treated as an ID)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const cars = await CarRental.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load my cars' });
  }
});

// Public car details
router.get('/:id', async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const car = await CarRental.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    res.json({ car });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load car' });
  }
});

// Availability check for a date range
router.post('/:id/availability', async (req, res) => {
  try {
    const CarRentalBooking = require('../tables/carRentalBooking');
    const { pickupDate, returnDate } = req.body || {};
    if (!pickupDate || !returnDate) return res.status(400).json({ message: 'pickupDate and returnDate required' });
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (end <= start) return res.status(400).json({ message: 'Invalid date range' });

    const overlapping = await CarRentalBooking.find({
      car: req.params.id,
      status: { $in: ['pending', 'confirmed', 'active'] },
      $or: [
        { pickupDate: { $lt: end }, returnDate: { $gt: start } }
      ]
    }).countDocuments();

    res.json({ available: overlapping === 0 });
  } catch (e) {
    res.status(500).json({ message: 'Failed to check availability' });
  }
});

// Owner create car
router.post('/', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const payload = { ...(req.body || {}), owner: req.user.id };
    const created = await CarRental.create(payload);
    res.status(201).json({ car: created });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create car', error: e.message });
  }
});

// Owner update car
router.patch('/:id', requireAuth, requireOwnerOrAdmin(async (req) => {
  const CarRental = require('../tables/carRental');
  const c = await CarRental.findById(req.params.id).select('owner');
  return c?.owner;
}), async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const car = await CarRental.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    Object.assign(car, req.body || {});
    await car.save();
    res.json({ car });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update car', error: e.message });
  }
});

// Owner delete car
router.delete('/:id', requireAuth, requireOwnerOrAdmin(async (req) => {
  const CarRental = require('../tables/carRental');
  const c = await CarRental.findById(req.params.id).select('owner');
  return c?.owner;
}), async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const car = await CarRental.findByIdAndDelete(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete car' });
  }
});

// Owner upload images
router.post('/:id/images', requireAuth, requireOwnerOrAdmin(async (req) => {
  const CarRental = require('../tables/carRental');
  const c = await CarRental.findById(req.params.id).select('owner');
  return c?.owner;
}), upload.array('images', 12), async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const car = await CarRental.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    const uploaded = (req.files && req.files.length)
      ? (await Promise.all(req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'cars')))).map(r => r.secure_url || r.url)
      : [];
    car.images = [...(car.images || []), ...uploaded];
    await car.save();
    res.json({ car, images: uploaded });
  } catch (e) {
    res.status(500).json({ message: 'Failed to upload images' });
  }
});

module.exports = router;
