const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Commission = require('../tables/commission');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Notification = require('../tables/notification');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const path = require('path');
const fs = require('fs');
const multer = require('multer');

function requireAdmin(req, res, next) {
	const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
	if (!token) return res.status(401).json({ message: 'Unauthorized' });
	try {
		const user = jwt.verify(token, JWT_SECRET);
		if (user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
		req.user = user;
		return next();
	} catch (e) {
		return res.status(401).json({ message: 'Invalid token' });
	}
}

router.get('/overview', requireAdmin, async (req, res) => {
	const totalBookings = await Booking.countDocuments();
	const pendingCommissions = await Booking.countDocuments({ commissionPaid: false, status: 'commission_due' });
	const confirmed = await Booking.countDocuments({ status: 'confirmed' });
	res.json({ metrics: { totalBookings, pendingCommissions, confirmed } });
});

router.post('/commission', requireAdmin, async (req, res) => {
	const { ratePercent } = req.body;
	if (!ratePercent || ratePercent <= 0 || ratePercent >= 100) {
		return res.status(400).json({ message: 'Invalid rate' });
	}
	const created = await Commission.create({ ratePercent, setBy: req.user.id });
	res.status(201).json({ commission: created });
});

router.get('/commission', requireAdmin, async (req, res) => {
	const current = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
	res.json({ commission: current });
});

module.exports = router;
// Additional admin endpoints
router.get('/bookings/pending-commission', requireAdmin, async (req, res) => {
    const list = await Booking.find({ status: 'commission_due', commissionPaid: false })
        .populate('property')
        .populate('guest', 'firstName lastName email phone');
    res.json({ bookings: list });
});

router.post('/properties/:id/toggle', requireAdmin, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    property.isActive = !property.isActive;
    await property.save();
    res.json({ property });
});

// Avatar upload
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

router.post('/me/avatar', requireAdmin, upload.single('avatar'), async (req, res) => {
    const User = require('../tables/user');
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    u.avatar = `/uploads/${path.basename(req.file.path)}`;
    await u.save();
    res.json({ user: { id: u._id, avatar: u.avatar } });
});

// Notifications
router.get('/notifications', requireAdmin, async (req, res) => {
    const list = await Notification.find({ recipientUser: null })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate({ path: 'booking', populate: { path: 'guest', select: 'firstName lastName email phone' } })
        .populate('property');
    res.json({ notifications: list });
});

router.post('/notifications/:id/read', requireAdmin, async (req, res) => {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.isRead = true;
    await n.save();
    res.json({ notification: n });
});

// Admin booking detail (with guest and property)
router.get('/bookings/:id', requireAdmin, async (req, res) => {
    const b = await Booking.findById(req.params.id)
        .populate('property')
        .populate('guest', 'firstName lastName email phone');
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking: b });
});


