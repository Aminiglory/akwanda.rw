const { Router } = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../tables/user');

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

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
	destination: function (req, file, cb) { cb(null, uploadDir); },
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, unique + ext);
	}
});
const upload = multer({ storage });

router.post('/me/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
	const u = await User.findById(req.user.id);
	if (!u) return res.status(404).json({ message: 'User not found' });
	u.avatar = `/uploads/${path.basename(req.file.path)}`;
	await u.save();
	res.json({ user: { id: u._id, avatar: u.avatar } });
});

// User notifications (host)
router.get('/notifications', requireAuth, async (req, res) => {
    const Notification = require('../tables/notification');
    const list = await Notification.find({ recipientUser: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate({ path: 'booking', populate: { path: 'guest', select: 'firstName lastName email phone' } })
        .populate('property');
    res.json({ notifications: list });
});

router.post('/notifications/:id/read', requireAuth, async (req, res) => {
    const Notification = require('../tables/notification');
    const n = await Notification.findOne({ _id: req.params.id, recipientUser: req.user.id });
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.isRead = true;
    await n.save();
    res.json({ notification: n });
});

module.exports = router;


