const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');
const CommissionLevel = require('../tables/commissionLevel');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

// Vehicle commission levels available to owners (scope='vehicle')
// GET /api/cars/commission-levels
router.get('/commission-levels', requireAuth, async (req, res) => {
  try {
    const levels = await CommissionLevel.find({ scope: 'vehicle', active: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('name description directRate onlineRate isPremium isDefault');
    return res.json({ levels });
  } catch (e) {
    console.error('List vehicle commission levels error:', e);
    return res.status(500).json({ message: 'Failed to load vehicle commission levels', error: e?.message || String(e) });
  }
});
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
    console.error('Error listing cars:', e);
    res.status(500).json({ message: 'Failed to list cars', error: e.message });
  }
});

// Owner: list my cars (must be declared before /:id so "/mine" doesn't get treated as an ID)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const cars = await CarRental.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (e) {
    console.error('Error listing my cars:', e);
    res.status(500).json({ message: 'Failed to load my cars', error: e.message });
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
    if (e && (e.name === 'ValidationError' || e.name === 'CastError')) {
      return res.status(400).json({ message: 'Failed to create car', error: e.message });
    }
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

// Owner upload required documents
router.post('/:id/documents', requireAuth, requireOwnerOrAdmin(async (req) => {
  const CarRental = require('../tables/carRental');
  const c = await CarRental.findById(req.params.id).select('owner');
  return c?.owner;
}), upload.fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'insurancePolicy', maxCount: 1 },
  { name: 'inspectionCertificate', maxCount: 1 },
  { name: 'numberPlatePhoto', maxCount: 1 },
  { name: 'proofOfOwnership', maxCount: 1 },
  { name: 'ownerId', maxCount: 1 },
  { name: 'driversLicense', maxCount: 1 },
  { name: 'businessRegistration', maxCount: 1 },
  { name: 'taxCertificate', maxCount: 1 }
]), async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const car = await CarRental.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });

    const files = req.files || {};
    const uploadedEntries = await Promise.all(
      Object.keys(files).map(async (field) => {
        const file = files[field]?.[0];
        if (!file?.buffer) return null;
        const result = await uploadBuffer(file.buffer, file.originalname, 'cars/documents');
        const url = result?.secure_url || result?.url;
        return url ? [field, url] : null;
      })
    );

    const docMap = {
      registrationCertificate: 'registrationCertificateUrl',
      insurancePolicy: 'insurancePolicyUrl',
      inspectionCertificate: 'inspectionCertificateUrl',
      numberPlatePhoto: 'numberPlatePhotoUrl',
      proofOfOwnership: 'proofOfOwnershipUrl',
      ownerId: 'ownerIdUrl',
      driversLicense: 'driversLicenseUrl',
      businessRegistration: 'businessRegistrationUrl',
      taxCertificate: 'taxCertificateUrl'
    };

    car.documents = car.documents || {};
    const saved = {};
    for (const entry of uploadedEntries) {
      if (!entry) continue;
      const [field, url] = entry;
      const targetKey = docMap[field];
      if (!targetKey) continue;
      car.documents[targetKey] = url;
      saved[targetKey] = url;
    }

    await car.save();
    res.json({ car, documents: saved });
  } catch (e) {
    res.status(500).json({ message: 'Failed to upload documents' });
  }
});

module.exports = router;
