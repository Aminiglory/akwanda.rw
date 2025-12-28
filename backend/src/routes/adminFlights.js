const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const verifyAdmin = (req, res, next) => {
  const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'flights');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'flight-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

router.get('/flights-content', verifyAdmin, async (req, res) => {
  try {
    const FlightsPageContent = require('../tables/flightsPageContent');
    const doc = await FlightsPageContent.findOne().sort({ updatedAt: -1 });

    if (!doc) {
      return res.json({
        content: {
          pageTitle: '',
          introText: '',
          heroImages: [],
          published: false,
        },
      });
    }

    return res.json({ content: doc });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load flights content', error: e.message });
  }
});

router.post('/flights-content', verifyAdmin, async (req, res) => {
  try {
    const FlightsPageContent = require('../tables/flightsPageContent');
    const { pageTitle, introText, heroImages, published } = req.body || {};

    let doc = await FlightsPageContent.findOne().sort({ updatedAt: -1 });
    if (doc) {
      doc.pageTitle = pageTitle || '';
      doc.introText = introText || '';
      doc.heroImages = Array.isArray(heroImages) ? heroImages : [];
      doc.published = !!published;
      await doc.save();
    } else {
      doc = await FlightsPageContent.create({
        pageTitle: pageTitle || '',
        introText: introText || '',
        heroImages: Array.isArray(heroImages) ? heroImages : [],
        published: !!published,
      });
    }

    return res.json({ message: 'Flights content saved successfully', content: doc });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to save flights content', error: e.message });
  }
});

router.post('/flights-content/images', verifyAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }
    const imagePaths = req.files.map((file) => `/uploads/flights/${file.filename}`);
    return res.json({ message: 'Images uploaded successfully', images: imagePaths });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to upload images', error: e.message });
  }
});

router.delete('/flights-content/image', verifyAdmin, async (req, res) => {
  try {
    const { imagePath } = req.body || {};
    if (!imagePath) {
      return res.status(400).json({ message: 'Image path is required' });
    }

    const filename = path.basename(imagePath);
    const fullPath = path.join(process.cwd(), 'uploads', 'flights', filename);

    try {
      await fs.unlink(fullPath);
      return res.json({ message: 'Image deleted successfully' });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.json({ message: 'Image already deleted or does not exist' });
      }
      throw err;
    }
  } catch (e) {
    return res.status(500).json({ message: 'Failed to delete image', error: e.message });
  }
});

module.exports = router;
