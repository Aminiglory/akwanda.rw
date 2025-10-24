const { Router } = require('express');
const mongoose = require('mongoose');
const User = require('../tables/user');
const Property = require('../tables/property');
const Booking = require('../tables/booking');
const Message = require('../tables/message');
const Notification = require('../tables/notification');
const Worker = require('../tables/worker');
const CarRental = require('../tables/carRental');
const CarRentalBooking = require('../tables/carRentalBooking');
const TaxiBooking = require('../tables/taxiBooking');

const router = Router();

// Middleware for admin authentication
function requireAdmin(req, res, next) {
    const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.userType !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// Delete a user and cascade delete related data (admin only)
router.delete('/users/:userId', requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) {
                throw Object.assign(new Error('User not found'), { status: 404 });
            }

            // Collect related entities
            const properties = await Property.find({ host: userId }).select('_id').session(session);
            const propIds = properties.map(p => p._id);

            const cars = await CarRental.find({ owner: userId }).select('_id').session(session);
            const carIds = cars.map(c => c._id);

            // Delete worker records owned by this user (as employer)
            await Worker.deleteMany({ employerId: userId }).session(session);

            // Bookings related to this user as a guest and as host via properties
            await Booking.deleteMany({ $or: [ { guest: userId }, { property: { $in: propIds } } ] }).session(session);

            // Car rental bookings related to this user
            await CarRentalBooking.deleteMany({ $or: [ { guest: userId }, { car: { $in: carIds } } ] }).session(session);

            // Taxi bookings created by this user
            await TaxiBooking.deleteMany({ guest: userId }).session(session);

            // Messages sent or received by this user
            await Message.deleteMany({ $or: [ { sender: userId }, { recipient: userId } ] }).session(session);

            // Notifications for this user or tied to their properties
            await Notification.deleteMany({ $or: [ { recipientUser: userId }, { property: { $in: propIds } } ] }).session(session);

            // Properties and Cars owned by the user
            if (propIds.length) {
                await Property.deleteMany({ _id: { $in: propIds } }).session(session);
            }
            if (carIds.length) {
                await CarRental.deleteMany({ _id: { $in: carIds } }).session(session);
            }

            // Finally, delete the user
            await User.deleteOne({ _id: userId }).session(session);
        });

        res.json({ success: true, message: 'User and related data deleted successfully' });
    } catch (err) {
        const status = err.status || 500;
        console.error('Cascade delete failed:', err);
        res.status(status).json({ success: false, message: err.message || 'Failed to delete user' });
    } finally {
        session.endSession();
    }
});

// Get all users with their property counts and role status
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({})
            .select('_id firstName lastName email userType createdAt avatar isBlocked')
            .sort({ createdAt: -1 });

        const usersWithProperties = await Promise.all(users.map(async (user) => {
            const propertyCount = await Property.countDocuments({ host: user._id });
            return {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                userType: user.userType,
                avatar: user.avatar,
                isBlocked: !!user.isBlocked,
                propertyCount,
                createdAt: user.createdAt,
                shouldBeHost: propertyCount > 0 && user.userType !== 'host'
            };
        }));

        res.json({ users: usersWithProperties });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
});

// Get users who should be hosts but aren't
router.get('/users/role-issues', requireAdmin, async (req, res) => {
    try {
        // Find users who have properties but aren't hosts
        const properties = await Property.find({}).distinct('host');
        const usersWithProperties = await User.find({
            _id: { $in: properties },
            userType: { $ne: 'host' }
        }).select('_id firstName lastName email userType');

        const issueUsers = await Promise.all(usersWithProperties.map(async (user) => {
            const propertyCount = await Property.countDocuments({ host: user._id });
            return {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                currentRole: user.userType,
                propertyCount,
                issue: 'Has properties but not marked as host'
            };
        }));

        res.json({ 
            issues: issueUsers,
            count: issueUsers.length,
            message: issueUsers.length > 0 ? 'Found users with role issues' : 'No role issues found'
        });
    } catch (error) {
        console.error('Error checking role issues:', error);
        res.status(500).json({ message: 'Failed to check role issues', error: error.message });
    }
});

// Fix user roles automatically
router.post('/users/fix-roles', requireAdmin, async (req, res) => {
    try {
        // Find users who have properties but aren't hosts
        const properties = await Property.find({}).distinct('host');
        const usersToFix = await User.find({
            _id: { $in: properties },
            userType: { $ne: 'host' }
        });

        const fixedUsers = [];
        for (const user of usersToFix) {
            const propertyCount = await Property.countDocuments({ host: user._id });
            if (propertyCount > 0) {
                user.userType = 'host';
                await user.save();
                fixedUsers.push({
                    id: user._id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    propertyCount
                });
            }
        }

        res.json({
            message: `Fixed ${fixedUsers.length} user roles`,
            fixedUsers,
            count: fixedUsers.length
        });
    } catch (error) {
        console.error('Error fixing user roles:', error);
        res.status(500).json({ message: 'Failed to fix user roles', error: error.message });
    }
});

// Manually promote a user to host
router.post('/users/:userId/promote-to-host', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.userType === 'host') {
            return res.status(400).json({ message: 'User is already a host' });
        }

        user.userType = 'host';
        await user.save();

        res.json({
            message: `Successfully promoted ${user.firstName} ${user.lastName} to host`,
            user: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                userType: user.userType
            }
        });
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({ message: 'Failed to promote user', error: error.message });
    }
});

// Demote a user from host to guest
router.post('/users/:userId/demote-to-guest', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.userType === 'guest') {
            return res.status(400).json({ message: 'User is already a guest' });
        }

        // Check if user has properties
        const propertyCount = await Property.countDocuments({ host: userId });
        if (propertyCount > 0) {
            return res.status(400).json({ 
                message: `Cannot demote user who has ${propertyCount} properties. Remove properties first.`,
                propertyCount
            });
        }

        user.userType = 'guest';
        await user.save();

        res.json({
            message: `Successfully demoted ${user.firstName} ${user.lastName} to guest`,
            user: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                userType: user.userType
            }
        });
    } catch (error) {
        console.error('Error demoting user:', error);
        res.status(500).json({ message: 'Failed to demote user', error: error.message });
    }
});

// Get detailed user info including properties
router.get('/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('-passwordHash');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const properties = await Property.find({ host: userId })
            .select('_id title status createdAt')
            .sort({ createdAt: -1 });

        res.json({
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                userType: user.userType,
                createdAt: user.createdAt,
                bio: user.bio,
                avatar: user.avatar
            },
            properties,
            propertyCount: properties.length
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Failed to fetch user details', error: error.message });
    }
});

module.exports = router;
