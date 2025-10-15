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

// Update current user's profile (name, email, phone, password)
router.put('/me', requireAuth, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { firstName, lastName, email, phone, password, currentPassword, bio } = req.body || {};
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Email uniqueness check if changing
        if (email && email.toLowerCase() !== user.email) {
            const exists = await User.findOne({ email: email.toLowerCase() });
            if (exists) return res.status(409).json({ message: 'Email already in use' });
            user.email = email.toLowerCase();
        }

        if (typeof firstName === 'string' && firstName.trim()) user.firstName = firstName.trim();
        if (typeof lastName === 'string' && lastName.trim()) user.lastName = lastName.trim();
        if (typeof phone === 'string' && phone.trim()) user.phone = phone.trim();
        if (typeof bio === 'string') user.bio = bio.trim();

        // Handle password change
        if (password) {
            if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
            const ok = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });
            user.passwordHash = await bcrypt.hash(password, 10);
        }

        await user.save();

        return res.json({
            user: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                userType: user.userType,
                avatar: user.avatar,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                bio: user.bio
            }
        });
    } catch (e) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// User notifications (host)
router.get('/notifications', requireAuth, async (req, res) => {
    const Notification = require('../tables/notification');
    const Property = require('../tables/property');
    // Fetch recent notifications for this user
    const raw = await Notification.find({ recipientUser: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate({ path: 'booking', populate: { path: 'guest', select: 'firstName lastName email phone' } })
        .populate('property');

    // Filter to ensure property exists and is still owned by this user when property is attached
    const filtered = [];
    for (const n of raw) {
        if (!n.property) {
            // Allow non-property notifications (e.g., account messages)
            filtered.push(n);
            continue;
        }
        // Verify property still exists and owned by requester
        try {
            const p = await Property.findById(n.property._id).select('host');
            if (p && String(p.host) === String(req.user.id)) {
                filtered.push(n);
            }
        } catch (_) { /* ignore */ }
    }

    res.json({ notifications: filtered });
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


