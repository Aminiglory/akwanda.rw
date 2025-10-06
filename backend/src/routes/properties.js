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
    try {
        const { q, city, minPrice, maxPrice, bedrooms, amenities, startDate, endDate } = req.query;
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

        // Load active properties with host
        let properties = await Property.find(base).populate('host', 'firstName lastName isBlocked blockedUntil');
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
    const payload = { ...req.body, images: mergedImages, host: req.user.id };
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
    ['pricePerNight','bedrooms','bathrooms','discountPercent'].forEach(k => {
        if (updates[k] != null) updates[k] = Number(updates[k]);
    });
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
    Object.assign(property, updates);
    await property.save();
    res.json({ property });
});

// Delete a property (owner or admin)
router.delete('/:id', requireAuth, async (req, res) => {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
    }
    await property.deleteOne();
    res.json({ success: true });
});

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
    await property.save();
    res.json({ success: true, room });
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
router.get('/my-properties', requireAuth, async (req, res) => {
    try {
        const properties = await Property.find({ host: req.user.id }).sort({ createdAt: -1 });
        res.json({ properties });
    } catch (error) {
        console.error('Get my properties error:', error);
        res.status(500).json({ message: 'Failed to fetch properties', error: error.message });
    }
});

module.exports = router;


