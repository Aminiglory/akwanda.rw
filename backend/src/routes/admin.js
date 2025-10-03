const express = require('express');
const router = express.Router();
const User = require('../tables/user');
const Property = require('../tables/property');
const Booking = require('../tables/booking');
const Notification = require('../tables/notification');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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

// Monthly stats for the last 6 months: bookings created, confirmed, cancelled
router.get('/stats/monthly', requireAdmin, async (req, res) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    // Pull bookings in range
    const bookings = await Booking.find({ createdAt: { $gte: start, $lte: end } }).select('createdAt status');
    // Build month buckets
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        buckets.push({ key, label: d.toLocaleString('en', { month: 'short' }), year: d.getFullYear(), bookings: 0, confirmed: 0, cancelled: 0 });
    }
    const bucketByKey = Object.fromEntries(buckets.map(b => [b.key, b]));
    for (const b of bookings) {
        const dt = new Date(b.createdAt);
        const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
        const bucket = bucketByKey[key];
        if (!bucket) continue;
        bucket.bookings += 1;
        if (b.status === 'confirmed') bucket.confirmed += 1;
        if (b.status === 'cancelled') bucket.cancelled += 1;
    }
    res.json({
        months: buckets.map(b => b.label),
        bookings: buckets.map(b => b.bookings),
        confirmed: buckets.map(b => b.confirmed),
        cancelled: buckets.map(b => b.cancelled)
    });
});

module.exports = router;
// Additional admin endpoints
// Landing page metrics endpoint (public)
router.get('/metrics', async (req, res) => {
    try {
        const User = require('../tables/user');
        const Property = require('../tables/property');
        const Booking = require('../tables/booking');
        
        // Happy Guests: count unique guests from bookings
        const guestIds = await Booking.distinct('guest');
        const happyGuests = guestIds.length;
        
        // Active Listings: count of properties with isActive true
        const activeListings = await Property.countDocuments({ isActive: true });
        
        // Satisfaction Rate: percent of confirmed bookings (as a proxy)
        const totalBookings = await Booking.countDocuments();
        const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
        const satisfactionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 100;
        
        // Additional metrics for admin dashboard
        const totalProperties = await Property.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalRevenue = await Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'ended'] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        res.json({ 
            happyGuests, 
            activeListings, 
            satisfactionRate,
            totalProperties,
            totalBookings,
            totalUsers,
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
        });
    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ message: 'Failed to fetch metrics' });
    }
});

// Admin users endpoint
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const User = require('../tables/user');
        const users = await User.find({}).select('-passwordHash');
        res.json({ users });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});
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

// Block a user (for unpaid commissions or violations)
router.post('/users/:id/block', requireAdmin, async (req, res) => {
    try {
        const User = require('../tables/user');
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({ message: 'Block reason is required' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.isBlocked = true;
        user.blockReason = reason;
        user.blockedAt = new Date();
        await user.save();
        
        res.json({ message: 'User blocked successfully', user: { id: user._id, isBlocked: user.isBlocked, blockReason: user.blockReason } });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ message: 'Failed to block user', error: error.message });
    }
});

// Unblock a user
router.post('/users/:id/unblock', requireAdmin, async (req, res) => {
    try {
        const User = require('../tables/user');
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.isBlocked = false;
        user.blockReason = null;
        user.blockedAt = null;
        await user.save();
        
        res.json({ message: 'User unblocked successfully', user: { id: user._id, isBlocked: user.isBlocked } });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Failed to unblock user', error: error.message });
    }
});

// Add a fine to a user
router.post('/users/:id/fines', requireAdmin, async (req, res) => {
    try {
        const User = require('../tables/user');
        const { reason, amount } = req.body;
        
        if (!reason || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid reason and amount are required' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (!user.fines) {
            user.fines = { totalDue: 0, currency: 'RWF', items: [] };
        }
        
        user.fines.items.push({
            reason,
            amount: Number(amount),
            createdAt: new Date(),
            paid: false
        });
        
        user.fines.totalDue = (user.fines.totalDue || 0) + Number(amount);
        await user.save();
        
        res.json({ message: 'Fine added successfully', user: { id: user._id, fines: user.fines } });
    } catch (error) {
        console.error('Add fine error:', error);
        res.status(500).json({ message: 'Failed to add fine', error: error.message });
    }
});

// Mark a fine as paid
router.post('/users/:userId/fines/:fineId/pay', requireAdmin, async (req, res) => {
    try {
        const User = require('../tables/user');
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const fine = user.fines?.items?.id(req.params.fineId);
        if (!fine) return res.status(404).json({ message: 'Fine not found' });
        
        if (fine.paid) {
            return res.status(400).json({ message: 'Fine already paid' });
        }
        
        fine.paid = true;
        fine.paidAt = new Date();
        user.fines.totalDue = Math.max(0, (user.fines.totalDue || 0) - fine.amount);
        await user.save();
        
        res.json({ message: 'Fine marked as paid', user: { id: user._id, fines: user.fines } });
    } catch (error) {
        console.error('Mark fine paid error:', error);
        res.status(500).json({ message: 'Failed to mark fine as paid', error: error.message });
    }
});

// Get users with unpaid commissions (MUST BE BEFORE /users/:id)
router.get('/users/unpaid-commissions', requireAdmin, async (req, res) => {
    try {
        // Find all bookings with unpaid commissions
        const unpaidBookings = await Booking.find({ 
            paymentStatus: 'paid',
            commissionPaid: false 
        }).populate('property').populate('guest', 'firstName lastName email');

        // Group by property owner
        const ownerCommissions = {};
        
        for (const booking of unpaidBookings) {
            if (!booking.property || !booking.property.host) continue;
            
            const ownerId = booking.property.host.toString();
            
            if (!ownerCommissions[ownerId]) {
                ownerCommissions[ownerId] = {
                    ownerId,
                    totalCommission: 0,
                    bookings: []
                };
            }
            
            ownerCommissions[ownerId].totalCommission += booking.commissionAmount || 0;
            ownerCommissions[ownerId].bookings.push(booking);
        }

        // Get owner details
        const ownerIds = Object.keys(ownerCommissions);
        const owners = await User.find({ _id: { $in: ownerIds } }).select('firstName lastName email isBlocked');

        const result = owners.map(owner => ({
            ...owner.toObject(),
            ...ownerCommissions[owner._id.toString()]
        }));

        res.json({ users: result });
    } catch (error) {
        console.error('Get unpaid commissions error:', error);
        res.status(500).json({ message: 'Failed to fetch unpaid commissions', error: error.message });
    }
});

// Get user details with fines and block status
router.get('/users/:id', requireAdmin, async (req, res) => {
    try {
        const User = require('../tables/user');
        const user = await User.findById(req.params.id).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
});

// Deactivate user account (for unpaid commission)
router.post('/users/:id/deactivate', requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.isBlocked = true;
        await user.save();

        // Create notification for user
        await Notification.create({
            type: 'account_blocked',
            title: 'Account Deactivated',
            message: reason || 'Your account has been deactivated due to unpaid commission. Please contact admin.',
            recipientUser: user._id
        });

        res.json({ 
            success: true, 
            message: 'User account deactivated successfully',
            user: { ...user.toObject(), passwordHash: undefined }
        });
    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({ message: 'Failed to deactivate user', error: error.message });
    }
});

// Reactivate user account
router.post('/users/:id/reactivate', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.isBlocked = false;
        await user.save();

        // Create notification for user
        await Notification.create({
            type: 'account_reactivated',
            title: 'Account Reactivated',
            message: 'Your account has been reactivated. You can now access all features.',
            recipientUser: user._id
        });

        res.json({ 
            success: true, 
            message: 'User account reactivated successfully',
            user: { ...user.toObject(), passwordHash: undefined }
        });
    } catch (error) {
        console.error('Reactivate user error:', error);
        res.status(500).json({ message: 'Failed to reactivate user', error: error.message });
    }
});

module.exports = router;
