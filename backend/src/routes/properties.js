const { Router } = require('express');
const Property = require('../tables/property');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const router = Router();
const Notification = require('../tables/notification');
const User = require('../tables/user');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
	const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
	if (!token) return res.status(401).json({ message: 'Unauthorized' });
	try {
		req.user = jwt.verify(token, JWT_SECRET);
		return next();
	} catch (e) {
		return res.status(401).json({ message: 'Invalid token' });
	}
}

router.get('/', async (req, res) => {
    const properties = await Property.find({ isActive: true }).populate('host', 'firstName lastName');
    res.json({ properties });
});

router.get('/mine', requireAuth, async (req, res) => {
    const list = await Property.find({ host: req.user.id });
    res.json({ properties: list });
});

router.get('/:id', async (req, res) => {
    const property = await Property.findById(req.params.id).populate('host', 'firstName lastName');
    if (!property || !property.isActive) return res.status(404).json({ message: 'Property not found' });
    res.json({ property });
});

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, unique + ext);
	}
});
const upload = multer({ storage });

router.post('/', requireAuth, upload.array('images', 10), async (req, res) => {
    // Allow any authenticated user; auto-promote to host on first upload
    if (req.user.userType !== 'host' && req.user.userType !== 'admin') {
        const acct = await User.findById(req.user.id);
        if (acct) {
            acct.userType = 'host';
            await acct.save();
            req.user.userType = 'host';
        }
    }
	const imagePaths = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
    const created = await Property.create({ ...req.body, images: imagePaths, host: req.user.id });
    // Notify admin of new property upload
    await Notification.create({
        type: 'booking_created', // reuse type bucket with message context
        title: 'New property uploaded',
        message: `A new property "${created.title}" was uploaded`,
        property: created._id
    });
	res.status(201).json({ property: created });
});

// Toggle availability (admin-only)
router.post('/:id/availability', requireAuth, async (req, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const next = property.availability === 'available' ? 'in_use' : 'available';
    property.availability = next;
    await property.save();
    res.json({ property });
});

// Set discount (host or admin)
router.post('/:id/discount', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    const { discountPercent } = req.body;
    if (discountPercent == null || discountPercent < 0 || discountPercent > 100) {
        return res.status(400).json({ message: 'Invalid discount' });
    }
    property.discountPercent = discountPercent;
    await property.save();
    res.json({ property });
});


module.exports = router;


