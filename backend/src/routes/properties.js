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

// Ensure commissionRate stays within [8,12] before any save (handles legacy docs)
function clampCommission(doc) {
    if (!doc) return;
    if (doc.commissionRate != null) {
        const cr = Number(doc.commissionRate);
        doc.commissionRate = Math.min(12, Math.max(8, isNaN(cr) ? 10 : cr));
    }
}

// One-time startup sanitization for legacy documents having invalid commissionRate
(async () => {
    try {
        // Clamp >12 to 12
        await Property.updateMany({ commissionRate: { $gt: 12 } }, { $set: { commissionRate: 12 } });
        // Clamp <8 (and non-number) to default 10 where it exists
        await Property.updateMany({ commissionRate: { $lt: 8 } }, { $set: { commissionRate: 10 } });
    } catch (e) {
        console.warn('Commission sanitize skipped:', e?.message || e);
    }
})();

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
    try {
        const { q, city, minPrice, maxPrice, bedrooms, amenities, startDate, endDate, category } = req.query;
        const base = { isActive: true };
        if (q) {
            const rx = new RegExp(String(q).trim(), 'i');
            base.$or = [ { title: rx }, { address: rx }, { city: rx } ];
        }
        if (city) base.city = new RegExp(String(city).trim(), 'i');
        const priceFilters = {};
        if (minPrice != null && !isNaN(Number(minPrice))) priceFilters.$gte = Number(minPrice);
        if (maxPrice != null && !isNaN(Number(maxPrice))) priceFilters.$lte = Number(maxPrice);
        if (Object.keys(priceFilters).length) base.pricePerNight = priceFilters;
        if (bedrooms) {
            const b = String(bedrooms) === '4+' ? { $gte: 4 } : Number(bedrooms);
            base.bedrooms = typeof b === 'number' ? b : b; // direct or $gte
        }
        if (amenities) {
            const arr = Array.isArray(amenities) ? amenities : String(amenities).split(',').map(s => s.trim()).filter(Boolean);
            if (arr.length) base.amenities = { $all: arr };
        }
        if (category) {
            // Support multiple categories separated by comma
            const categories = Array.isArray(category) ? category : String(category).split(',').map(s => s.trim()).filter(Boolean);
            if (categories.length === 1) {
                base.category = categories[0];
            } else if (categories.length > 1) {
                base.category = { $in: categories };
            }
        }

        // Load active properties with host
        let properties = await Property.find(base).populate('host', 'firstName lastName isBlocked blockedUntil');
        
        // Check commission payment status for visibility logic
        const Booking = require('../tables/booking');
        const hostIds = properties.map(p => p.host?._id).filter(Boolean);
        const unpaidCommissions = await Booking.aggregate([
            {
                $match: {
                    paymentStatus: 'paid',
                    commissionPaid: false,
                    status: { $in: ['confirmed', 'ended'] }
                }
            },
            {
                $lookup: {
                    from: 'properties',
                    localField: 'property',
                    foreignField: '_id',
                    as: 'propertyInfo'
                }
            },
            {
                $unwind: '$propertyInfo'
            },
            {
                $group: {
                    _id: '$propertyInfo.host',
                    unpaidAmount: { $sum: '$commissionAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const unpaidCommissionMap = new Map();
        unpaidCommissions.forEach(uc => {
            unpaidCommissionMap.set(String(uc._id), uc);
        });
        const now = new Date();
        const visible = [];
        for (const p of properties) {
            const host = p.host;
            if (host && host.isBlocked) {
                if (host.blockedUntil && new Date(host.blockedUntil) < now) {
                    try {
                        const u = await User.findById(host._id);
                        if (u) {
                            u.isBlocked = false;
                            u.blockedUntil = null;
                            await u.save();
                        }
                    } catch (e) { /* ignore */ }
                    visible.push(p);
                } else {
                    continue;
                }
            } else {
                // Check commission payment status for visibility
                const hostId = String(host._id);
                const unpaidInfo = unpaidCommissionMap.get(hostId);
                
                if (unpaidInfo && unpaidInfo.unpaidAmount > 0) {
                    // Reduce visibility for properties with unpaid commissions
                    // Only show if property has premium/featured visibility level
                    if (p.visibilityLevel === 'standard') {
                        continue; // Hide standard properties if commissions unpaid
                    }
                    // Premium and featured properties remain visible but with reduced priority
                    
                    // Add commission info to property for frontend display
                    p._doc.unpaidCommission = {
                        amount: unpaidInfo.unpaidAmount,
                        count: unpaidInfo.count
                    };
                }
                
                visible.push(p);
            }
        }

        // Optional availability filtering by date range
        if (startDate && endDate) {
            const Booking = require('../tables/booking');
            const s = new Date(startDate);
            const e = new Date(endDate);
            if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
                const ids = visible.map(p => p._id);
                const overlapping = await Booking.find({
                    property: { $in: ids },
                    status: { $nin: ['cancelled', 'ended'] },
                    $or: [ { checkIn: { $lt: e }, checkOut: { $gt: s } } ]
                }).select('property room');
                const bookedByProperty = new Map();
                for (const b of overlapping) {
                    const key = String(b.property);
                    if (!bookedByProperty.has(key)) bookedByProperty.set(key, new Set());
                    if (b.room) bookedByProperty.get(key).add(String(b.room));
                    else bookedByProperty.get(key).add('*'); // whole property booked (no room distinction)
                }
                properties = visible.filter(p => {
                    const rooms = p.rooms || [];
                    const bookedSet = bookedByProperty.get(String(p._id)) || new Set();
                    // If booking stored with no room id, treat as property-blocking
                    if (bookedSet.has('*')) return false;
                    // Check at least one room is not booked and not closed
                    return rooms.some(r => {
                        if (bookedSet.has(String(r._id))) return false;
                        const hasClosed = Array.isArray(r.closedDates) && r.closedDates.some(cd => {
                            if (!cd || !cd.startDate || !cd.endDate) return false;
                            const cs = new Date(cd.startDate); const ce = new Date(cd.endDate);
                            return cs < e && ce > s;
                        });
                        return !hasClosed;
                    });
                });
            } else {
                properties = visible;
            }
        } else {
            properties = visible;
        }

        res.json({ properties });
    } catch (error) {
        console.error('Property listing error:', error);
        res.status(500).json({ message: 'Failed to fetch properties', error: error.message });
    }
});

router.get('/mine', requireAuth, async (req, res) => {
    const list = await Property.find({ host: req.user.id });
    res.json({ properties: list });
});

// IMPORTANT: Specific routes must come BEFORE parameter routes like '/:id'
router.get('/my-properties', requireAuth, async (req, res) => {
    try {
        const properties = await Property.find({ host: req.user.id }).sort({ createdAt: -1 });
        
        // Get commission status for this property owner
        const Booking = require('../tables/booking');
        const unpaidCommissions = await Booking.aggregate([
            {
                $match: {
                    paymentStatus: 'paid',
                    commissionPaid: false,
                    status: { $in: ['confirmed', 'ended'] }
                }
            },
            {
                $lookup: {
                    from: 'properties',
                    localField: 'property',
                    foreignField: '_id',
                    as: 'propertyInfo'
                }
            },
            {
                $unwind: '$propertyInfo'
            },
            {
                $match: {
                    'propertyInfo.host': require('mongoose').Types.ObjectId(req.user.id)
                }
            },
            {
                $group: {
                    _id: '$property',
                    unpaidAmount: { $sum: '$commissionAmount' },
                    count: { $sum: 1 },
                    bookings: { $push: { _id: '$_id', amount: '$commissionAmount', createdAt: '$createdAt' } }
                }
            }
        ]);
        
        // Add commission info to each property
        const propertiesWithCommission = properties.map(p => {
            const unpaidInfo = unpaidCommissions.find(uc => String(uc._id) === String(p._id));
            return {
                ...p.toObject(),
                unpaidCommission: unpaidInfo ? {
                    amount: unpaidInfo.unpaidAmount,
                    count: unpaidInfo.count,
                    bookings: unpaidInfo.bookings
                } : null
            };
        });
        
        const totalUnpaidCommission = unpaidCommissions.reduce((sum, uc) => sum + uc.unpaidAmount, 0);
        
        res.json({ 
            properties: propertiesWithCommission,
            commissionSummary: {
                totalUnpaid: totalUnpaidCommission,
                propertiesWithUnpaid: unpaidCommissions.length
            }
        });
    } catch (error) {
        console.error('Get my properties error:', error);
        res.status(500).json({ message: 'Failed to fetch properties', error: error.message });
    }
});

// Get commission summary for property owner
router.get('/commission-summary', requireAuth, async (req, res) => {
    try {
        const Booking = require('../tables/booking');
        
        // Get all unpaid commissions for this property owner
        const unpaidCommissions = await Booking.find({
            paymentStatus: 'paid',
            commissionPaid: false,
            status: { $in: ['confirmed', 'ended'] }
        })
        .populate({
            path: 'property',
            match: { host: req.user.id },
            select: 'title commissionRate'
        })
        .populate('guest', 'firstName lastName')
        .select('confirmationCode commissionAmount totalAmount createdAt property guest')
        .sort({ createdAt: -1 });

        // Filter out bookings where property is null (not owned by this user)
        const ownerCommissions = unpaidCommissions.filter(booking => booking.property);

        const totalUnpaid = ownerCommissions.reduce((sum, booking) => sum + booking.commissionAmount, 0);
        
        // Group by property
        const byProperty = {};
        ownerCommissions.forEach(booking => {
            const propId = String(booking.property._id);
            if (!byProperty[propId]) {
                byProperty[propId] = {
                    property: booking.property,
                    bookings: [],
                    totalAmount: 0
                };
            }
            byProperty[propId].bookings.push(booking);
            byProperty[propId].totalAmount += booking.commissionAmount;
        });

        res.json({
            totalUnpaidCommission: totalUnpaid,
            unpaidBookingsCount: ownerCommissions.length,
            commissionsByProperty: Object.values(byProperty),
            allUnpaidBookings: ownerCommissions
        });
    } catch (error) {
        console.error('Commission summary error:', error);
        res.status(500).json({ message: 'Failed to fetch commission summary', error: error.message });
    }
});

// Send commission payment reminders (can be called by admin or scheduled job)
router.post('/send-commission-reminders', requireAuth, async (req, res) => {
    try {
        // Only admin can trigger commission reminders
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const Booking = require('../tables/booking');
        
        // Find all property owners with unpaid commissions older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const overdueCommissions = await Booking.aggregate([
            {
                $match: {
                    paymentStatus: 'paid',
                    commissionPaid: false,
                    status: { $in: ['confirmed', 'ended'] },
                    createdAt: { $lt: sevenDaysAgo }
                }
            },
            {
                $lookup: {
                    from: 'properties',
                    localField: 'property',
                    foreignField: '_id',
                    as: 'propertyInfo'
                }
            },
            {
                $unwind: '$propertyInfo'
            },
            {
                $group: {
                    _id: '$propertyInfo.host',
                    totalOverdue: { $sum: '$commissionAmount' },
                    bookingCount: { $sum: 1 },
                    oldestBooking: { $min: '$createdAt' }
                }
            }
        ]);

        let remindersSent = 0;
        
        for (const overdue of overdueCommissions) {
            const daysSinceOldest = Math.floor((new Date() - overdue.oldestBooking) / (1000 * 60 * 60 * 24));
            
            await Notification.create({
                type: 'commission_overdue',
                title: 'Overdue Commission Payment Reminder',
                message: `You have RWF ${overdue.totalOverdue.toLocaleString()} in overdue commission payments from ${overdue.bookingCount} bookings. Oldest payment is ${daysSinceOldest} days overdue. Please settle to maintain property visibility.`,
                recipientUser: overdue._id
            });
            
            remindersSent++;
        }

        res.json({ 
            message: `Sent ${remindersSent} commission payment reminders`,
            remindersSent,
            overdueOwners: overdueCommissions.length
        });
    } catch (error) {
        console.error('Send commission reminders error:', error);
        res.status(500).json({ message: 'Failed to send reminders', error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    const property = await Property.findById(req.params.id).populate('host', 'firstName lastName isBlocked blockedUntil');
    if (!property || !property.isActive) return res.status(404).json({ message: 'Property not found' });

    const host = property.host;
    const now = new Date();
    if (host && host.isBlocked) {
        if (host.blockedUntil && new Date(host.blockedUntil) < now) {
            // Auto-expire
            try {
                const u = await User.findById(host._id);
                if (u) {
                    u.isBlocked = false;
                    u.blockedUntil = null;
                    await u.save();
                }
            } catch (e) { /* ignore */ }
        } else {
            return res.status(403).json({ message: 'This property is temporarily unavailable.' });
        }
    }
    // Normalize image paths for property and rooms so frontend gets clean URLs
    const norm = (u) => {
        if (!u) return u;
        let s = String(u).replace(/\\+/g, '/');
        if (!s.startsWith('/')) s = `/${s}`;
        return s;
    };
    const out = property.toObject({ virtuals: true });
    if (Array.isArray(out.images)) out.images = out.images.map(norm);
    if (Array.isArray(out.rooms)) {
        out.rooms = out.rooms.map(r => ({
            ...r,
            images: Array.isArray(r.images) ? r.images.map(norm) : []
        }));
    }
    res.json({ property: out });
});

// Booking.com-style monthly calendar endpoint
// GET /api/properties/:id/calendar?month=YYYY-MM
router.get('/:id/calendar', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).select('rooms host');
        if (!property) return res.status(404).json({ message: 'Property not found' });
        // Access: property owner or admin can view
        if (String(property.host) !== String(req.user.id) && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }

        const { month } = req.query; // YYYY-MM
        const today = new Date();
        let year = today.getFullYear();
        let m = today.getMonth();
        if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
            const [y, mm] = month.split('-').map(Number);
            year = y; m = mm - 1;
        }
        const start = new Date(year, m, 1);
        const end = new Date(year, m + 1, 1);
        const daysInMonth = Math.round((end - start) / (1000 * 60 * 60 * 24));

        const Booking = require('../tables/booking');
        const bookings = await Booking.find({
            property: property._id,
            status: { $nin: ['cancelled', 'ended'] },
            $or: [ { checkIn: { $lt: end }, checkOut: { $gt: start } } ]
        }).select('room checkIn checkOut _id');

        // Index bookings by room for quick lookups
        const bookingsByRoom = new Map();
        for (const b of bookings) {
            const key = b.room ? String(b.room) : '*';
            if (!bookingsByRoom.has(key)) bookingsByRoom.set(key, []);
            bookingsByRoom.get(key).push(b);
        }

        const rooms = (property.rooms || []).map(r => ({
            roomId: String(r._id),
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            capacity: r.capacity,
            daily: []
        }));

        // Helper to check if a date range overlaps a day
        function overlapsDay(rangeStart, rangeEnd, dayDate) {
            const d0 = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
            const d1 = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1);
            return rangeStart < d1 && rangeEnd > d0;
        }

        for (const room of rooms) {
            const roomDoc = (property.rooms || []).id(room.roomId);
            const roomBookings = bookingsByRoom.get(room.roomId) || [];
            const noRoomBookings = bookingsByRoom.get('*') || []; // property-level bookings, if any
            for (let i = 0; i < daysInMonth; i++) {
                const date = new Date(year, m, 1 + i);
                const iso = date.toISOString().slice(0, 10);
                let status = 'available';
                let bookingIds = [];
                let lockReason = undefined;

                // Check room locks
                const locked = Array.isArray(roomDoc?.closedDates) && roomDoc.closedDates.some(cd => {
                    if (!cd || !cd.startDate || !cd.endDate) return false;
                    return overlapsDay(new Date(cd.startDate), new Date(cd.endDate), date);
                });
                if (locked) {
                    status = 'closed';
                    const cd = (roomDoc.closedDates || []).find(cd => cd && cd.startDate && cd.endDate && overlapsDay(new Date(cd.startDate), new Date(cd.endDate), date));
                    lockReason = cd?.reason || 'Locked';
                }

                // Check bookings
                if (status !== 'closed') {
                    const hits = [...roomBookings, ...noRoomBookings].filter(b => overlapsDay(new Date(b.checkIn), new Date(b.checkOut), date));
                    if (hits.length) { status = 'booked'; bookingIds = hits.map(h => String(h._id)); }
                }

                room.daily.push({ date: iso, status, bookingIds: bookingIds.length ? bookingIds : undefined, lockReason });
            }
        }

        return res.json({ month: `${year}-${String(m + 1).padStart(2, '0')}`, days: daysInMonth, rooms });
    } catch (error) {
        console.error('Calendar endpoint error:', error);
        return res.status(500).json({ message: 'Failed to build calendar', error: error.message });
    }
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

// Dedicated image upload endpoint
router.post('/upload/images', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        console.log('Image upload request received:', {
            files: req.files?.length || 0,
            user: req.user?.id,
            body: req.body
        });

        if (!req.files || req.files.length === 0) {
            console.log('No files uploaded');
            return res.status(400).json({ message: 'No images uploaded' });
        }
        
        const imagePaths = req.files.map(f => `/uploads/${path.basename(f.path)}`);
        console.log('Images uploaded successfully:', imagePaths);
        
        res.json({ 
            success: true, 
            imageUrls: imagePaths,
            message: 'Images uploaded successfully' 
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ message: 'Failed to upload images', error: error.message });
    }
});

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
    // Merge any imageUrls from body (e.g., prior upload call)
    let mergedImages = [...imagePaths];
    if (req.body.imageUrls) {
        const urls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
        mergedImages.push(...urls.map(u => String(u).replace(/\\+/g, '/')));
    }
    // Deduplicate & normalize
    mergedImages = Array.from(new Set(mergedImages.map(u => String(u).replace(/\\+/g, '/'))));
    const payload = { ...req.body, images: mergedImages, host: req.user.id };
    // Ensure commissionRate stays within [8,12] regardless of visibility level
    if (payload.commissionRate != null) {
        const cr = Number(payload.commissionRate);
        payload.commissionRate = Math.min(12, Math.max(8, isNaN(cr) ? 10 : cr));
    } else {
        // Set default commission rate based on visibility level within allowed range
        if (payload.visibilityLevel === 'featured') {
            payload.commissionRate = 12; // Maximum allowed rate for featured properties
        } else if (payload.visibilityLevel === 'premium') {
            payload.commissionRate = 10; // Medium rate for premium properties
        } else {
            payload.commissionRate = 8; // Minimum rate for standard properties
        }
    }
    // Coerce roomRules to array if provided
    if (payload.roomRules && !Array.isArray(payload.roomRules)) {
        payload.roomRules = [payload.roomRules];
    }
    const created = await Property.create(payload);
    // Notify admin of new property upload
    await Notification.create({
        type: 'booking_created', // reuse type bucket with message context
        title: 'New property uploaded',
        message: `A new property "${created.title}" was uploaded`,
        property: created._id
    });
	res.status(201).json({ property: created });
});

// Update a property (owner or admin)
router.put('/:id', requireAuth, upload.array('images', 10), async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    const updates = { ...req.body };
    // Coerce number fields
    ['pricePerNight','bedrooms','bathrooms','discountPercent','commissionRate'].forEach(k => {
        if (updates[k] != null) updates[k] = Number(updates[k]);
    });
    // Ensure commissionRate stays within [8,12] regardless of visibility level
    if (updates.commissionRate != null) {
        updates.commissionRate = Math.min(12, Math.max(8, Number(updates.commissionRate)));
    } else if (updates.visibilityLevel) {
        // Set commission rate based on visibility level within allowed range
        if (updates.visibilityLevel === 'featured') {
            updates.commissionRate = 12; // Maximum allowed rate for featured properties
        } else if (updates.visibilityLevel === 'premium') {
            updates.commissionRate = 10; // Medium rate for premium properties
        } else {
            updates.commissionRate = 8; // Minimum rate for standard properties
        }
    }
    // Amenities (multer form arrays come as string or array)
    if (updates.amenities && !Array.isArray(updates.amenities)) {
        updates.amenities = [updates.amenities];
    }
    // Room rules: coerce to array if provided
    if (updates.roomRules && !Array.isArray(updates.roomRules)) {
        updates.roomRules = [updates.roomRules];
    }
    // Merge or replace images if new files provided
    if (req.files && req.files.length) {
        const imagePaths = req.files.map(f => `/uploads/${path.basename(f.path)}`);
        updates.images = imagePaths;
    }
    // Merge explicit imageUrls if provided
    if (req.body.imageUrls) {
        const urls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
        const normalized = urls.map(u => String(u).replace(/\\+/g, '/'));
        updates.images = (updates.images && updates.images.length)
            ? [...updates.images, ...normalized]
            : normalized;
    }
    // Allow clearing images explicitly
    if (String(req.body.clearImages).toLowerCase() === 'true') {
        updates.images = [];
    }
    // Deduplicate if images present
    if (updates.images) {
        updates.images = Array.from(new Set(updates.images.map(u => String(u).replace(/\\+/g, '/'))));
    }
    Object.assign(property, updates);
    clampCommission(property);
    await property.save();
    res.json({ property });
});

// [Removed duplicate delete route here] Use the later host-only delete route below instead.

// Toggle availability (admin-only)
router.post('/:id/availability', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // If date-based check is requested, compute available rooms similar to Booking.com
    const { checkIn, checkOut, guests } = req.body || {};
    if (checkIn && checkOut) {
        try {
            const Booking = require('../tables/booking');
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
                return res.status(400).json({ message: 'Invalid check-in/check-out dates' });
            }

            // Fetch bookings for this property overlapping the requested window (exclude cancelled/ended)
            const overlapping = await Booking.find({
                property: property._id,
                status: { $nin: ['cancelled', 'ended'] },
                $or: [
                    { checkIn: { $lt: end }, checkOut: { $gt: start } }
                ]
            }).select('room checkIn checkOut status');

            // Build a set of locked room ids due to bookings overlap
            const lockedRoomIds = new Set(
                overlapping
                    .filter(b => b.room)
                    .map(b => String(b.room))
            );

            // Also lock rooms that have closedDates overlapping
            const rooms = property.rooms || [];
            const availableRooms = [];
            for (const room of rooms) {
                // Capacity check
                if (guests && Number(room.capacity || 0) < Number(guests)) continue;

                // Check existing bookings lock
                const isBooked = room._id && lockedRoomIds.has(String(room._id));
                if (isBooked) continue;

                // Check closed dates
                const hasClosed = Array.isArray(room.closedDates) && room.closedDates.some(cd => {
                    if (!cd || !cd.startDate || !cd.endDate) return false;
                    const cs = new Date(cd.startDate);
                    const ce = new Date(cd.endDate);
                    return cs < end && ce > start; // overlap
                });
                if (hasClosed) continue;

                availableRooms.push({
                    _id: room._id,
                    roomNumber: room.roomNumber,
                    roomType: room.roomType,
                    pricePerNight: room.pricePerNight,
                    capacity: room.capacity,
                    amenities: room.amenities || [],
                    images: (room.images || []).map(img => String(img).replace(/\\+/g, '/')),
                    isAvailable: true
                });
            }

            return res.json({ availableRooms });
        } catch (e) {
            return res.status(500).json({ message: 'Failed to check availability', error: e.message });
        }
    }

    // Fallback to admin toggle when dates are not provided
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const next = property.availability === 'available' ? 'in_use' : 'available';
    property.availability = next;
    clampCommission(property);
    await property.save();
    res.json({ property });
});

// Lock or unlock a specific room by adding/removing a closedDates range
router.post('/:id/rooms/:roomId/lock', requireAuth, async (req, res) => {
    // Only property owner or admin can lock
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    const { startDate, endDate, reason } = req.body || {};
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (!startDate || !endDate || isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
        return res.status(400).json({ message: 'Invalid lock date range' });
    }
    const room = (property.rooms || []).id(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    room.closedDates = room.closedDates || [];
    room.closedDates.push({ startDate: s, endDate: e, reason: reason || 'Locked' });
    clampCommission(property);
    await property.save();
    res.json({ success: true, room });
});

// Create a new room under a property (owner or admin)
router.post('/:id/rooms', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }

        const {
            roomNumber,
            roomType,
            pricePerNight,
            capacity,
            amenities = [],
            images = [],
            maxAdults,
            maxChildren,
            maxInfants,
            childrenPolicy,
            infantPolicy
        } = req.body || {};

        if (!roomNumber || !roomType || pricePerNight == null || capacity == null) {
            return res.status(400).json({ message: 'Missing required room fields' });
        }

        property.rooms = property.rooms || [];
        property.rooms.push({
            roomNumber,
            roomType,
            pricePerNight: Number(pricePerNight),
            capacity: Number(capacity),
            amenities: Array.isArray(amenities) ? amenities : String(amenities).split(',').map(s => s.trim()).filter(Boolean),
            images: Array.isArray(images) ? images : [images].filter(Boolean),
            maxAdults: maxAdults != null ? Number(maxAdults) : undefined,
            maxChildren: maxChildren != null ? Number(maxChildren) : undefined,
            maxInfants: maxInfants != null ? Number(maxInfants) : undefined,
            childrenPolicy: childrenPolicy || undefined,
            infantPolicy: infantPolicy || undefined
        });
        clampCommission(property);
        await property.save();

        const newRoom = property.rooms[property.rooms.length - 1];
        res.status(201).json({ room: newRoom, propertyId: property._id });
    } catch (e) {
        console.error('Create room error:', e);
        res.status(500).json({ message: 'Failed to create room', error: e.message });
    }
});

// Update a room (owner or admin)
router.put('/:id/rooms/:roomId', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }
        let room = (property.rooms || []).id(req.params.roomId);
        if (!room && req.body && req.body.roomNumber) {
            room = (property.rooms || []).find(r => String(r.roomNumber) === String(req.body.roomNumber));
        }
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const updates = { ...req.body };
        // Coerce numeric fields
        ['pricePerNight','capacity','maxAdults','maxChildren','maxInfants'].forEach(k => {
            if (updates[k] != null && updates[k] !== '') updates[k] = Number(updates[k]);
            else if (updates[k] === '') delete updates[k];
        });
        // Normalize arrays
        if (updates.amenities && !Array.isArray(updates.amenities)) {
            updates.amenities = String(updates.amenities).split(',').map(s => s.trim()).filter(Boolean);
        }
        if (updates.images && !Array.isArray(updates.images)) {
            updates.images = [updates.images].filter(Boolean);
        }
        // Basic enum validation for roomType if provided
        const validTypes = ['single','double','suite','family','deluxe'];
        if (updates.roomType && !validTypes.includes(String(updates.roomType))) {
            return res.status(400).json({ message: 'Invalid roomType' });
        }

        Object.assign(room, updates);
        clampCommission(property);
        await property.save();
        res.json({ room, propertyId: property._id });
    } catch (e) {
        console.error('Update room error:', e);
        res.status(500).json({ message: 'Failed to update room', error: e.message });
    }
});

// Delete a room (owner or admin)
router.delete('/:id/rooms/:roomId', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }
        const room = (property.rooms || []).id(req.params.roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        room.deleteOne();
        clampCommission(property);
        await property.save();
        res.json({ success: true });
    } catch (e) {
        console.error('Delete room error:', e);
        res.status(500).json({ message: 'Failed to delete room', error: e.message });
    }
});

router.post('/:id/rooms/:roomId/unlock', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    const { startDate, endDate } = req.body || {};
    const room = (property.rooms || []).id(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        room.closedDates = (room.closedDates || []).filter(cd => {
            if (!cd || !cd.startDate || !cd.endDate) return true;
            const cs = new Date(cd.startDate);
            const ce = new Date(cd.endDate);
            // keep those that do NOT exactly match provided range
            return !(cs.getTime() === s.getTime() && ce.getTime() === e.getTime());
        });
    } else {
        // If no range specified, clear all locks
        room.closedDates = [];
    }
    await property.save();
    res.json({ success: true, room });
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

// Toggle property active status (host only)
router.patch('/:id/toggle-status', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        
        // Only property owner can toggle status
        if (String(property.host) !== req.user.id) {
            return res.status(403).json({ message: 'Not allowed' });
        }
        
        const { isActive } = req.body;
        property.isActive = isActive;
        await property.save();
        
        res.json({ 
            success: true,
            message: `Property ${isActive ? 'activated' : 'deactivated'} successfully`,
            property 
        });
    } catch (error) {
        console.error('Toggle property status error:', error);
        res.status(500).json({ message: 'Failed to update property status', error: error.message });
    }
});

// Delete property (host only)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        
        // Only property owner can delete
        if (String(property.host) !== req.user.id) {
            return res.status(403).json({ message: 'Not allowed' });
        }
        
        await Property.findByIdAndDelete(req.params.id);
        
        res.json({ 
            success: true,
            message: 'Property deleted successfully'
        });
    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ message: 'Failed to delete property', error: error.message });
    }
});

// Get my properties (for property owner dashboard)
// (moved above '/:id')

// List promotions for a property (owner/admin)
router.get('/:id/promotions', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id).select('host promotions');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    res.json({ promotions: property.promotions || [] });
});

// Create or update a promotion (if body._id present -> update)
router.post('/:id/promotions', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    const p = req.body || {};
    // Basic validation
    if (!p.type || !['last_minute','advance_purchase','coupon','member_rate'].includes(p.type)) {
        return res.status(400).json({ message: 'Invalid type' });
    }
    if (p.discountPercent == null || Number(p.discountPercent) < 1 || Number(p.discountPercent) > 90) {
        return res.status(400).json({ message: 'Invalid discountPercent' });
    }
    if (p._id) {
        const existing = (property.promotions || []).id(p._id);
        if (!existing) return res.status(404).json({ message: 'Promotion not found' });
        Object.assign(existing, {
            title: p.title,
            description: p.description,
            discountPercent: Number(p.discountPercent),
            startDate: p.startDate ? new Date(p.startDate) : undefined,
            endDate: p.endDate ? new Date(p.endDate) : undefined,
            lastMinuteWithinDays: p.lastMinuteWithinDays != null ? Number(p.lastMinuteWithinDays) : undefined,
            minAdvanceDays: p.minAdvanceDays != null ? Number(p.minAdvanceDays) : undefined,
            couponCode: p.couponCode,
            type: p.type,
            active: p.active != null ? !!p.active : existing.active
        });
    } else {
        property.promotions = property.promotions || [];
        property.promotions.push({
            type: p.type,
            title: p.title,
            description: p.description,
            discountPercent: Number(p.discountPercent),
            startDate: p.startDate ? new Date(p.startDate) : undefined,
            endDate: p.endDate ? new Date(p.endDate) : undefined,
            lastMinuteWithinDays: p.lastMinuteWithinDays != null ? Number(p.lastMinuteWithinDays) : undefined,
            minAdvanceDays: p.minAdvanceDays != null ? Number(p.minAdvanceDays) : undefined,
            couponCode: p.couponCode,
            active: p.active != null ? !!p.active : true
        });
    }
    await property.save();
    res.json({ promotions: property.promotions });
});

// Toggle a promotion active flag
router.patch('/:id/promotions/:promoId/toggle', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    const promo = (property.promotions || []).id(req.params.promoId);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    promo.active = !promo.active;
    await property.save();
    res.json({ promotion: promo });
});

// Delete a promotion
router.delete('/:id/promotions/:promoId', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    const promo = (property.promotions || []).id(req.params.promoId);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    promo.deleteOne();
    await property.save();
    res.json({ success: true });
});

// Reviews: summary for a specific property (average, count)
router.get('/:id/reviews/summary', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).select('ratings host isActive');
        if (!property || !property.isActive) return res.status(404).json({ message: 'Property not found' });
        const ratings = Array.isArray(property.ratings) ? property.ratings : [];
        const count = ratings.length;
        const avg = count ? Math.round((ratings.reduce((s, r) => s + Number(r.rating || 0), 0) / count) * 10) / 10 : 0;
        res.json({ summary: { average: avg, count } });
    } catch (e) {
        res.status(500).json({ message: 'Failed to compute reviews summary', error: e.message });
    }
});

// Reviews: summary across all properties owned by the current user
router.get('/my-reviews/summary', requireAuth, async (req, res) => {
    try {
        const props = await Property.find({ host: req.user.id, isActive: true }).select('ratings');
        let total = 0; let sum = 0;
        for (const p of props) {
            const ratings = Array.isArray(p.ratings) ? p.ratings : [];
            total += ratings.length;
            sum += ratings.reduce((s, r) => s + Number(r.rating || 0), 0);
        }
        const avg = total ? Math.round((sum / total) * 10) / 10 : 0;
        res.json({ summary: { average: avg, count: total } });
    } catch (e) {
        res.status(500).json({ message: 'Failed to compute my reviews summary', error: e.message });
    }
});

module.exports = router;


