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
    const uploadDir = path.join(process.cwd(), 'uploads', 'attractions');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'attraction-' + uniqueSuffix + path.extname(file.originalname));
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

// GET /api/admin/attractions-content - Fetch attractions page content for editing
router.get('/attractions-content', verifyAdmin, async (req, res) => {
  try {
    const AttractionsPageContent = require('../tables/attractionsPageContent');
    const doc = await AttractionsPageContent.findOne().sort({ updatedAt: -1 });
    
    if (!doc) {
      return res.json({
        content: {
          pageTitle: '',
          introText: '',
          heroImages: [],
          attractions: [],
          published: false
        }
      });
    }
    
    res.json({ content: doc });
  } catch (e) {
    console.error('Failed to load attractions content:', e);
    res.status(500).json({ message: 'Failed to load attractions content', error: e.message });
  }
});

// POST /api/admin/attractions-content - Save/update attractions page content
router.post('/attractions-content', verifyAdmin, async (req, res) => {
  try {
    const AttractionsPageContent = require('../tables/attractionsPageContent');
    const {
      pageTitle,
      introText,
      heroImages,
      attractions,
      published
    } = req.body;

    let doc = await AttractionsPageContent.findOne().sort({ updatedAt: -1 });
    
    if (doc) {
      doc.pageTitle = pageTitle || '';
      doc.introText = introText || '';
      doc.heroImages = Array.isArray(heroImages) ? heroImages : [];
      doc.attractions = Array.isArray(attractions) ? attractions : [];
      doc.published = !!published;
      await doc.save();
    } else {
      doc = await AttractionsPageContent.create({
        pageTitle: pageTitle || '',
        introText: introText || '',
        heroImages: Array.isArray(heroImages) ? heroImages : [],
        attractions: Array.isArray(attractions) ? attractions : [],
        published: !!published
      });
    }

    res.json({ 
      message: 'Attractions content saved successfully',
      content: doc 
    });
  } catch (e) {
    console.error('Failed to save attractions content:', e);
    res.status(500).json({ message: 'Failed to save attractions content', error: e.message });
  }
});

// POST /api/admin/attractions-content/images - Upload images for attractions page
router.post('/attractions-content/images', verifyAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const imagePaths = req.files.map(file => `/uploads/attractions/${file.filename}`);
    
    res.json({ 
      message: 'Images uploaded successfully',
      images: imagePaths 
    });
  } catch (e) {
    console.error('Failed to upload images:', e);
    res.status(500).json({ message: 'Failed to upload images', error: e.message });
  }
});

// DELETE /api/admin/attractions-content/image - Delete an attractions page image
router.delete('/attractions-content/image', verifyAdmin, async (req, res) => {
  try {
    const { imagePath } = req.body;
    
    if (!imagePath) {
      return res.status(400).json({ message: 'Image path is required' });
    }

    const filename = path.basename(imagePath);
    const fullPath = path.join(process.cwd(), 'uploads', 'attractions', filename);

    try {
      await fs.unlink(fullPath);
      res.json({ message: 'Image deleted successfully' });
    } catch (err) {
      if (err.code === 'ENOENT') {
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
