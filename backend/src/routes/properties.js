const { Router } = require('express');
const Property = require('../tables/property');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const router = Router();
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
	if (req.user.userType !== 'host' && req.user.userType !== 'admin') {
		return res.status(403).json({ message: 'Only hosts can create properties' });
	}
	const imagePaths = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
	const created = await Property.create({ ...req.body, images: imagePaths, host: req.user.id });
	res.status(201).json({ property: created });
});

router.get('/mine', requireAuth, async (req, res) => {
	const list = await Property.find({ host: req.user.id });
	res.json({ properties: list });
});

module.exports = router;


