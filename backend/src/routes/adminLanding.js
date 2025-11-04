const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Middleware to verify admin
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

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'landing');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'landing-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// GET /api/admin/landing-content - Fetch landing content for editing
router.get('/landing-content', verifyAdmin, async (req, res) => {
  try {
    const LandingContent = require('../tables/landingContent');
    // Get the most recent content (published or draft)
    const doc = await LandingContent.findOne().sort({ updatedAt: -1 });
    
    if (!doc) {
      // Return default structure if no content exists
      return res.json({
        content: {
          heroTitle: '',
          heroSubtitle: '',
          heroImages: [],
          heroSlides: [],
          heroTransition: 'fade',
          heroIntervalMs: 5000,
          sections: [],
          published: false
        }
      });
    }
    
    res.json({ content: doc });
  } catch (e) {
    console.error('Failed to load landing content:', e);
    res.status(500).json({ message: 'Failed to load landing content', error: e.message });
  }
});

// POST /api/admin/landing-content - Save/update landing content
router.post('/landing-content', verifyAdmin, async (req, res) => {
  try {
    const LandingContent = require('../tables/landingContent');
    const {
      heroTitle,
      heroSubtitle,
      heroImages,
      heroSlides,
      heroTransition,
      heroIntervalMs,
      sections,
      published
    } = req.body;

    // Find existing or create new
    let doc = await LandingContent.findOne().sort({ updatedAt: -1 });
    
    if (doc) {
      // Update existing
      doc.heroTitle = heroTitle || '';
      doc.heroSubtitle = heroSubtitle || '';
      doc.heroImages = Array.isArray(heroImages) ? heroImages : [];
      doc.heroSlides = Array.isArray(heroSlides) ? heroSlides : [];
      doc.heroTransition = heroTransition || 'fade';
      doc.heroIntervalMs = typeof heroIntervalMs === 'number' ? heroIntervalMs : 5000;
      doc.sections = Array.isArray(sections) ? sections : [];
      doc.published = !!published;
      await doc.save();
    } else {
      // Create new
      doc = await LandingContent.create({
        heroTitle: heroTitle || '',
        heroSubtitle: heroSubtitle || '',
        heroImages: Array.isArray(heroImages) ? heroImages : [],
        heroSlides: Array.isArray(heroSlides) ? heroSlides : [],
        heroTransition: heroTransition || 'fade',
        heroIntervalMs: typeof heroIntervalMs === 'number' ? heroIntervalMs : 5000,
        sections: Array.isArray(sections) ? sections : [],
        published: !!published
      });
    }

    res.json({ 
      message: 'Landing content saved successfully',
      content: doc 
    });
  } catch (e) {
    console.error('Failed to save landing content:', e);
    res.status(500).json({ message: 'Failed to save landing content', error: e.message });
  }
});

// POST /api/admin/landing-content/images - Upload images for landing page
router.post('/landing-content/images', verifyAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    // Return relative paths for the uploaded images
    const imagePaths = req.files.map(file => `/uploads/landing/${file.filename}`);
    
    res.json({ 
      message: 'Images uploaded successfully',
      images: imagePaths 
    });
  } catch (e) {
    console.error('Failed to upload images:', e);
    res.status(500).json({ message: 'Failed to upload images', error: e.message });
  }
});

// DELETE /api/admin/landing-content/image - Delete a landing page image
router.delete('/landing-content/image', verifyAdmin, async (req, res) => {
  try {
    const { imagePath } = req.body;
    
    if (!imagePath) {
      return res.status(400).json({ message: 'Image path is required' });
    }

    // Extract filename from path and construct full path
    const filename = path.basename(imagePath);
    const fullPath = path.join(process.cwd(), 'uploads', 'landing', filename);

    try {
      await fs.unlink(fullPath);
      res.json({ message: 'Image deleted successfully' });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        res.json({ message: 'Image already deleted or does not exist' });
      } else {
        throw err;
      }
    }
  } catch (e) {
    console.error('Failed to delete image:', e);
    res.status(500).json({ message: 'Failed to delete image', error: e.message });
  }
});

module.exports = router;
