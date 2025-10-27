// Backfill legacy properties: assign propertyNumber and promote owners to host
// POST /api/admin/backfill/properties-owner-codes
router.post('/backfill/properties-owner-codes', requireAdmin, async (req, res) => {
  try {
    const Property = require('../tables/property');
    const User = require('../tables/user');

    const props = await Property.find({});
    let updatedProperties = 0;
    let promotedOwners = 0;
    const touchedOwners = new Set();

    for (const p of props) {
      // Ensure propertyNumber is present (pre-save hook will generate if missing)
      if (!p.propertyNumber) {
        // touch to trigger pre-save generation
        p.markModified('title');
        await p.save();
        updatedProperties++;
      }
      // Ensure host is a host userType
      if (p.host && !touchedOwners.has(String(p.host))) {
        const owner = await User.findById(p.host);
        if (owner && owner.userType !== 'host' && owner.userType !== 'admin') {
          owner.userType = 'host';
          await owner.save();
          promotedOwners++;
        }
        touchedOwners.add(String(p.host));
      }
    }

    return res.json({ success: true, updatedProperties, promotedOwners, totalProperties: props.length });
  } catch (e) {
    console.error('Backfill error:', e);
    return res.status(500).json({ message: 'Failed to backfill properties', error: e?.message || String(e) });
  }
});
const express = require('express');
const router = express.Router();
const User = require('../tables/user');
const Property = require('../tables/property');
const Booking = require('../tables/booking');
const Notification = require('../tables/notification');
const Commission = require('../tables/commission');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');

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

// Admin overview metrics
router.get('/overview', requireAdmin, async (req, res) => {
    const totalBookings = await Booking.countDocuments();
    const pendingCommissions = await Booking.countDocuments({ commissionPaid: false, status: 'commission_due' });
    const confirmed = await Booking.countDocuments({ status: 'confirmed' });
    res.json({ metrics: { totalBookings, pendingCommissions, confirmed } });
});

// Trigger seeding via API: ensures admin account based on env vars
// POST /api/admin/seed
router.post('/seed', requireAdmin, async (req, res) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH; // preferred if provided
        const adminPasswordPlain = process.env.ADMIN_PASSWORD; // fallback plain password
        if (!adminEmail || (!adminPasswordHash && !adminPasswordPlain)) {
            return res.status(400).json({ message: 'Missing ADMIN_EMAIL and/or ADMIN_PASSWORD(_HASH) in environment' });
        }

        const emailLower = String(adminEmail).toLowerCase();
        let user = await User.findOne({ email: emailLower });
        if (user) {
            const force = process.env.ADMIN_FORCE_RESET === '1' || req.body?.forceReset === true;
            if (force && adminPasswordPlain) {
                const newHash = await bcrypt.hash(adminPasswordPlain, 10);
                user.passwordHash = newHash;
                user.userType = 'admin';
                await user.save();
                return res.json({ seeded: false, reset: true, message: 'Admin password reset', user: { id: user._id, email: user.email } });
            }
            return res.json({ seeded: false, message: 'Admin already exists', user: { id: user._id, email: user.email } });
        }

        if (!adminPasswordHash && adminPasswordPlain) {
            adminPasswordHash = await bcrypt.hash(adminPasswordPlain, 10);
        }

        user = await User.create({
            firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
            lastName: process.env.ADMIN_LAST_NAME || 'Admin',
            email: emailLower,
            phone: process.env.ADMIN_PHONE || '0000000000',
            passwordHash: adminPasswordHash,
            userType: 'admin'
        });

        return res.status(201).json({ seeded: true, message: 'Seeded admin account', user: { id: user._id, email: user.email } });
    } catch (e) {
        console.error('Admin seed error:', e);
        return res.status(500).json({ message: 'Failed to run seed', error: e?.message || String(e) });
    }
});

router.get('/commission', requireAdmin, async (req, res) => {
	const current = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
	res.json({ commission: current });
});

// Set commission rate
router.post('/commission', requireAdmin, async (req, res) => {
    try {
        const { ratePercent } = req.body || {};
        const rate = Number(ratePercent);
        if (!rate || rate <= 0 || rate >= 100) {
            return res.status(400).json({ message: 'Invalid rate' });
        }
        const created = await Commission.create({ ratePercent: rate, setBy: req.user.id });
        return res.status(201).json({ commission: created });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to set commission', error: e?.message || String(e) });
    }
});

// Seed demo properties for the current admin user (admin-only)
router.post('/seed-demo-properties', requireAdmin, async (req, res) => {
  try {
    const Property = require('../tables/property');
    const User = require('../tables/user');
    const userId = req.user.id;

    // Ensure user is host or admin; promote to host if needed
    const acct = await User.findById(userId);
    if (acct && acct.userType !== 'host' && acct.userType !== 'admin') {
      acct.userType = 'host';
      await acct.save();
    }

    const samples = [
      {
        title: 'Cityview Apartment Downtown',
        description: 'Modern apartment with skyline views, close to cafes and co-working.',
        address: '123 Main St',
        city: 'Kigali',
        country: 'Rwanda',
        pricePerNight: 60000,
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['wifi','parking','kitchen','air_conditioning'],
        images: [
          'https://images.unsplash.com/photo-1505692794403-34d4982a83d7?w=1200',
          'https://images.unsplash.com/photo-1501183638710-841dd1904471?w=1200'
        ],
        category: 'apartment',
        visibilityLevel: 'standard',
        rooms: [
          { roomNumber: 'A1', roomType: 'double', pricePerNight: 60000, capacity: 3, amenities: ['wifi','desk'], images: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200'] },
          { roomNumber: 'A2', roomType: 'single', pricePerNight: 50000, capacity: 2, amenities: ['wifi'], images: ['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200'] }
        ]
      },
      {
        title: 'Lakefront Villa Retreat',
        description: 'Spacious villa with lake views and private garden.',
        address: '45 Lakeside Rd',
        city: 'Gisenyi',
        country: 'Rwanda',
        pricePerNight: 150000,
        bedrooms: 4,
        bathrooms: 3,
        amenities: ['wifi','pool','parking','kitchen','laundry'],
        images: [
          'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200',
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200'
        ],
        category: 'villa',
        visibilityLevel: 'featured',
        promotions: [ { type: 'member_rate', title: 'Member deal', discountPercent: 10, active: true } ],
        rooms: [
          { roomNumber: 'V1', roomType: 'suite', pricePerNight: 180000, capacity: 4, amenities: ['wifi','balcony'], images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200'] },
          { roomNumber: 'V2', roomType: 'double', pricePerNight: 140000, capacity: 3, amenities: ['wifi'], images: ['https://images.unsplash.com/photo-1560066984-5b560f4cfb21?w=1200'] }
        ]
      },
      {
        title: 'Airport Business Hotel',
        description: 'Convenient hotel near airport with shuttle and conference room.',
        address: '1 Terminal Ave',
        city: 'Kigali',
        country: 'Rwanda',
        pricePerNight: 80000,
        bedrooms: 20,
        bathrooms: 20,
        amenities: ['wifi','parking','breakfast'],
        images: [
          'https://images.unsplash.com/photo-1551776235-dde6d4829808?w=1200',
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200'
        ],
        category: 'hotel',
        visibilityLevel: 'premium',
        rooms: [
          { roomNumber: 'H101', roomType: 'single', pricePerNight: 70000, capacity: 1, images: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200'] },
          { roomNumber: 'H102', roomType: 'double', pricePerNight: 90000, capacity: 2, images: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200'] }
        ]
      },
      {
        title: 'Backpackers Hostel Hub',
        description: 'Budget-friendly hostel with shared spaces and social vibes.',
        address: '99 Youth St',
        city: 'Huye',
        country: 'Rwanda',
        pricePerNight: 15000,
        bedrooms: 6,
        bathrooms: 4,
        amenities: ['wifi','kitchen'],
        images: [ 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200' ],
        category: 'hostel',
        visibilityLevel: 'standard',
        rooms: [
          { roomNumber: 'B1', roomType: 'single', pricePerNight: 15000, capacity: 1, images: ['https://images.unsplash.com/photo-1598928506311-1c9a8f1a5b1a?w=1200'] },
          { roomNumber: 'B2', roomType: 'family', pricePerNight: 30000, capacity: 4, images: ['https://images.unsplash.com/photo-1600607687920-4ce9a5c6a253?w=1200'] }
        ]
      }
    ];

    const existing = await Property.find({ host: userId }).select('title');
    const existingTitles = new Set(existing.map(p => p.title));
    const toCreate = samples.filter(s => !existingTitles.has(s.title)).map(s => ({ ...s, host: userId }));

    let created = [];
    if (toCreate.length) {
      created = await Property.insertMany(toCreate, { ordered: false });
    }

    return res.json({
      message: 'Seed complete',
      created: created.length,
      skipped: samples.length - toCreate.length,
      totalForUser: existing.length + created.length
    });
  } catch (e) {
    console.error('Admin seed-demo-properties error:', e);
    return res.status(500).json({ message: 'Failed to seed demo properties', error: e?.message || String(e) });
  }
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

// Update admin credentials (email/password)
router.put('/me/credentials', requireAdmin, async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body || {};
        const u = await User.findById(req.user.id);
        if (!u) return res.status(404).json({ message: 'User not found' });

        // Update email if provided
        if (email && String(email).toLowerCase() !== u.email) {
            const exists = await User.findOne({ email: String(email).toLowerCase() });
            if (exists) return res.status(409).json({ message: 'Email already in use' });
            u.email = String(email).toLowerCase();
        }

        // Update password if requested
        if (newPassword) {
            if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
            const ok = await bcrypt.compare(currentPassword, u.passwordHash);
            if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });
            if (String(newPassword).length < 6) return res.status(400).json({ message: 'New password too short' });
            u.passwordHash = await bcrypt.hash(String(newPassword), 10);
        }

        await u.save();
        return res.json({ user: { id: u._id, email: u.email } });
    } catch (e) {
        console.error('Admin update credentials error:', e);
        return res.status(500).json({ message: 'Failed to update credentials' });
    }
});

// Hard delete a user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        if (String(req.params.id) === String(req.user.id)) {
            return res.status(400).json({ message: 'Cannot delete your own admin account' });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await User.deleteOne({ _id: user._id });
        return res.json({ success: true, message: 'User deleted' });
    } catch (e) {
        console.error('Admin delete user error:', e);
        return res.status(500).json({ message: 'Failed to delete user' });
    }
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
// Use memory storage and forward uploads to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/me/avatar', requireAdmin, upload.single('avatar'), async (req, res) => {
    const User = require('../tables/user');
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'No avatar uploaded' });
    try {
        const sharp = require('sharp');
        let img = sharp(req.file.buffer);
        const meta = await img.metadata();
        const width = meta.width || 0;
        const height = meta.height || 0;
        let processedBuffer = req.file.buffer;
        if (width > 0 && height > 0) {
            const size = Math.min(width, height);
            const left = Math.max(0, Math.floor((width - size) / 2));
            const top = Math.max(0, Math.floor((height - size) / 2));
            processedBuffer = await img.extract({ left, top, width: size, height: size }).resize(512, 512).toBuffer();
        } else {
            processedBuffer = await img.resize(512, 512, { fit: 'cover' }).toBuffer();
        }
        const up = await uploadBuffer(processedBuffer, req.file.originalname, 'admin/avatars');
        u.avatar = up.secure_url || up.url;
        await u.save();
        res.json({ user: { id: u._id, avatar: u.avatar } });
    } catch (e) {
        console.error('Admin avatar processing error:', e);
        res.status(500).json({ message: 'Failed to process avatar' });
    }
});

// --- Admin CMS: Landing Page Content ---
router.get('/landing-content', requireAdmin, async (req, res) => {
    try {
        const LandingContent = require('../tables/landingContent');
        const doc = await LandingContent.findOne({}).sort({ updatedAt: -1 });
        res.json({ content: doc || null });
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch landing content' });
    }
});

router.post('/landing-content', requireAdmin, async (req, res) => {
    try {
        const LandingContent = require('../tables/landingContent');
        const payload = req.body || {};
        let doc = await LandingContent.findOne({});
        if (!doc) doc = await LandingContent.create(payload);
        else {
            Object.assign(doc, payload);
            await doc.save();
        }
        res.json({ content: doc });
    } catch (e) {
        res.status(500).json({ message: 'Failed to save landing content' });
    }
});

router.post('/landing-content/images', requireAdmin, upload.array('images', 12), async (req, res) => {
    try {
        if (!req.files || !req.files.length) return res.status(400).json({ message: 'No images uploaded' });
        const results = await Promise.all(req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'cms/landing')));
        res.json({ images: results.map(r => r.secure_url || r.url) });
    } catch (e) {
        res.status(500).json({ message: 'Failed to upload images' });
    }
});

// --- Admin CMS: Attractions Page Content ---
router.get('/attractions-content', requireAdmin, async (req, res) => {
    try {
        const AttractionsPageContent = require('../tables/attractionsPageContent');
        const doc = await AttractionsPageContent.findOne({}).sort({ updatedAt: -1 });
        res.json({ content: doc || null });
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch attractions content' });
    }
});

router.post('/attractions-content', requireAdmin, async (req, res) => {
    try {
        const AttractionsPageContent = require('../tables/attractionsPageContent');
        const payload = req.body || {};
        let doc = await AttractionsPageContent.findOne({});
        if (!doc) doc = await AttractionsPageContent.create(payload);
        else {
            Object.assign(doc, payload);
            await doc.save();
        }
        res.json({ content: doc });
    } catch (e) {
        res.status(500).json({ message: 'Failed to save attractions content' });
    }
});

router.post('/attractions-content/images', requireAdmin, upload.array('images', 12), async (req, res) => {
    try {
        const files = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
        res.json({ images: files });
    } catch (e) {
        res.status(500).json({ message: 'Failed to upload images' });
    }
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
        const { reason, durationDays, durationWeeks, blockedUntil } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Calculate blockedUntil if provided as duration
        let until = null;
        if (blockedUntil) {
            until = new Date(blockedUntil);
        } else if (durationWeeks) {
            const weeks = Number(durationWeeks) || 0;
            until = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);
        } else if (durationDays) {
            const days = Number(durationDays) || 0;
            until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }
        
        user.isBlocked = true;
        user.blockedAt = new Date();
        user.blockedUntil = until || null;
        user.blockReason = reason || user.blockReason;
        await user.save();

        // Create notification for user
        let msg = reason || 'Your account has been deactivated due to unpaid commission. Please contact admin.';
        if (user.blockedUntil) {
            msg += ` Punishment ends on ${user.blockedUntil.toLocaleString()}.`;
        }
        await Notification.create({
            type: 'account_blocked',
            title: 'Account Deactivated',
            message: msg,
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

module.exports = router;
