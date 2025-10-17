const { Router } = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../tables/user');
const sharp = require('sharp');

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

// Generate default avatar with initials
async function generateDefaultAvatar(initials, userId) {
	try {
		const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
		const bgColor = colors[userId.length % colors.length];
		
		const svg = `
			<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
				<rect width="200" height="200" fill="${bgColor}"/>
				<text x="100" y="120" font-family="Arial, sans-serif" font-size="80" font-weight="bold" 
					  text-anchor="middle" fill="white">${initials.toUpperCase()}</text>
			</svg>
		`;
		
		const filename = `avatar-${userId}-${Date.now()}.png`;
		const filepath = path.join(uploadDir, filename);
		
		await sharp(Buffer.from(svg))
			.png()
			.resize(200, 200)
			.toFile(filepath);
		
		return `/uploads/${filename}`;
	} catch (error) {
		console.error('Error generating default avatar:', error);
		return null;
	}
}

// Alternative avatar upload endpoint
router.post('/upload-avatar', requireAuth, upload.single('avatar'), async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: 'User not found' });
		
		let avatarUrl;
		
		if (req.file) {
			// User uploaded a file
			avatarUrl = `/uploads/${path.basename(req.file.path)}`;
		} else {
			// Generate default avatar with user's initials
			const firstName = user.firstName || '';
			const lastName = user.lastName || '';
			const initials = (firstName.charAt(0) + lastName.charAt(0)) || user.email.charAt(0);
			
			avatarUrl = await generateDefaultAvatar(initials, req.user.id);
			if (!avatarUrl) {
				return res.status(500).json({ message: 'Failed to generate default avatar' });
			}
		}
		
		user.avatar = avatarUrl;
		await user.save();
		
		res.json({ avatarUrl, message: 'Avatar updated successfully' });
	} catch (error) {
		console.error('Avatar upload error:', error);
		res.status(500).json({ message: 'Failed to upload avatar' });
	}
});

// Profile endpoint
router.put('/profile', requireAuth, async (req, res) => {
	try {
		const { firstName, lastName, email, phone, bio } = req.body;
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: 'User not found' });

		// Email uniqueness check if changing
		if (email && email.toLowerCase() !== user.email) {
			const exists = await User.findOne({ email: email.toLowerCase() });
			if (exists) return res.status(409).json({ message: 'Email already in use' });
			user.email = email.toLowerCase();
		}

		if (firstName) user.firstName = firstName.trim();
		if (lastName) user.lastName = lastName.trim();
		if (phone) user.phone = phone.trim();
		if (bio !== undefined) user.bio = bio.trim();

		await user.save();

		res.json({
			user: {
				id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				bio: user.bio,
				avatar: user.avatar,
				userType: user.userType
			}
		});
	} catch (error) {
		res.status(500).json({ message: 'Failed to update profile' });
	}
});

// Change password endpoint
router.put('/change-password', requireAuth, async (req, res) => {
	try {
		const bcrypt = require('bcryptjs');
		const { currentPassword, newPassword } = req.body;
		
		if (!currentPassword || !newPassword) {
			return res.status(400).json({ message: 'Current password and new password are required' });
		}
		
		if (newPassword.length < 6) {
			return res.status(400).json({ message: 'New password must be at least 6 characters' });
		}

		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: 'User not found' });

		const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
		if (!isValid) return res.status(401).json({ message: 'Current password is incorrect' });

		user.passwordHash = await bcrypt.hash(newPassword, 10);
		await user.save();

		res.json({ message: 'Password updated successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Failed to update password' });
	}
});

// Notification settings endpoint
router.put('/notification-settings', requireAuth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: 'User not found' });

		user.notificationSettings = { ...user.notificationSettings, ...req.body };
		await user.save();

		res.json({ message: 'Notification settings updated successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Failed to update notification settings' });
	}
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
    res.json({ message: 'Marked as read' });
});

// Search users for starting conversations
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json({ users: [] });
        }

        const searchTerm = q.trim();
        const regex = new RegExp(searchTerm, 'i');
        
        // Search users by name or email, exclude current user
        const users = await User.find({
            _id: { $ne: req.user.id }, // Exclude current user
            $or: [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: searchTerm, options: 'i' } } }
            ]
        })
        .select('_id firstName lastName email avatar userType')
        .limit(10)
        .sort({ firstName: 1, lastName: 1 });

        const formattedUsers = users.map(user => ({
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            avatar: user.avatar,
            userType: user.userType
        }));

        res.json({ users: formattedUsers });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ message: 'Failed to search users', error: error.message });
    }
});

// Generate default avatar endpoint
router.post('/generate-default-avatar', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Generate default avatar with user's initials
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const initials = (firstName.charAt(0) + lastName.charAt(0)) || user.email.charAt(0);
        
        const avatarUrl = await generateDefaultAvatar(initials, req.user.id);
        if (!avatarUrl) {
            return res.status(500).json({ message: 'Failed to generate default avatar' });
        }
        
        user.avatar = avatarUrl;
        await user.save();
        
        res.json({ avatarUrl, message: 'Default avatar generated successfully' });
    } catch (error) {
        console.error('Default avatar generation error:', error);
        res.status(500).json({ message: 'Failed to generate default avatar' });
    }
});

module.exports = router;
