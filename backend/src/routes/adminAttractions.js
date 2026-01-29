const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { uploadBuffer } = require('../utils/cloudinary');

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

// Configure multer for image uploads (memory storage, we send buffers to Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test((file.originalname || '').toLowerCase());
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

    // Upload each image buffer to Cloudinary and return secure URLs
    const uploadedUrls = [];
    for (const file of req.files) {
      try {
        const result = await uploadBuffer(file.buffer, file.originalname, 'cms/attractions');
        const url = (result && (result.secure_url || result.url)) || null;
        if (url) uploadedUrls.push(url);
      } catch (err) {
        console.error('Failed to upload attractions image to Cloudinary:', err);
      }
    }

    if (!uploadedUrls.length) {
      return res.status(500).json({ message: 'Failed to upload images' });
    }

    res.json({ 
      message: 'Images uploaded successfully',
      images: uploadedUrls 
    });
  } catch (e) {
    console.error('Failed to upload images:', e);
    res.status(500).json({ message: 'Failed to upload images', error: e.message });
  }
});

// DELETE /api/admin/attractions-content/image - Delete an attractions page image
// NOTE: Images are stored in Cloudinary; this endpoint currently acts as a logical delete.
router.delete('/attractions-content/image', verifyAdmin, async (req, res) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({ message: 'Image path is required' });
    }

    // Frontend should remove the reference; physical deletion from Cloudinary can be added later.
    res.json({ message: 'Image reference removed successfully' });
  } catch (e) {
    console.error('Failed to delete image:', e);
    res.status(500).json({ message: 'Failed to delete image', error: e.message });
  }
});

module.exports = router;
