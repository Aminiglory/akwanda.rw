const { Router } = require('express');
const Property = require('../tables/property');
const Worker = require('../tables/worker');
let Deal;
try {
  Deal = require('../tables/deal');
} catch (e) {
  console.warn('Deal model not available - deals feature disabled');
  Deal = null;
}
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = Router();
const Notification = require('../tables/notification');
const User = require('../tables/user');
const CommissionSettings = require('../tables/commissionSettings');
const CommissionLevel = require('../tables/commissionLevel');
const { authenticate: requireAuth } = require('../middleware/auth');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Ensure commissionRate stays within a safe band using current settings (handles legacy docs)
async function clampCommission(doc) {
    if (!doc) return;
    if (doc.commissionRate == null) return;
    try {
        const settings = await CommissionSettings.getSingleton();
        const min = Math.min(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 8;
        const max = Math.max(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 12;
        const cr = Number(doc.commissionRate);
        doc.commissionRate = Math.min(max, Math.max(min, isNaN(cr) ? settings.premiumRate || 10 : cr));
    } catch {
        const cr = Number(doc.commissionRate);
        doc.commissionRate = Math.min(12, Math.max(8, isNaN(cr) ? 10 : cr));
    }
}

// If caller is a worker, ensure they have the required privilege; hosts and admins bypass
function requireWorkerPrivilege(privKey) {
    return async function(req, res, next) {
        try {
            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
            
            // Hosts and admins bypass worker privilege checks
            if (req.user.userType === 'host' || req.user.userType === 'admin') {
                return next();
            }

        // Apply update
        const property = await Property.findOneAndUpdate(
            { _id: req.params.id, host: req.user.id },
            { $set: updates },
            { new: true }
        );
        if (!property) {
            return res.status(404).json({ message: 'Property not found or unauthorized' });
        }

        // If commission changed (rate or visibility), notify admin users
        try {
            if (before && property) {
                const oldRate = before.commissionRate;
                const newRate = property.commissionRate;
                const oldVis = before.visibilityLevel;
                const newVis = property.visibilityLevel;
                const changed = (oldRate !== newRate) || (oldVis !== newVis);
                if (changed) {
                    await Notification.create({
                        type: 'commission_change',
                        title: 'Property commission updated',
                        message: `Commission for property "${property.title}" was changed from ${oldRate || 'N/A'}% (${oldVis || 'n/a'}) to ${newRate || 'N/A'}% (${newVis || 'n/a'}).`,
                        property: property._id,
                        recipientUser: property.host,
                        audience: 'host'
                    });
                }
            }
        } catch (_) {}

        return res.json({ property });
            
            // For workers, check if they have the required privilege
            if (req.user.userType === 'worker') {
                const worker = await Worker.findOne({ userAccount: req.user.id });
                if (!worker) {
                    return res.status(403).json({ message: 'Worker profile not found' });
                }
                
                if (!worker.privileges || !worker.privileges[privKey]) {
                    return res.status(403).json({ message: `Permission denied: ${privKey} required` });
                }
                
                return next();
            }
            
            // Other user types not allowed
            return res.status(403).json({ message: 'Access denied' });
        } catch (error) {
            console.error('Worker privilege check error:', error);
            return res.status(500).json({ message: 'Authorization check failed' });
        }
    };
}

// Seed demo properties for current user (host or admin)
// POST /api/properties/seed-demo
router.post('/seed-demo', requireAuth, async (req, res) => {
  try {
    // Auto-promote to host if not already
    if (req.user.userType !== 'host' && req.user.userType !== 'admin') {
      const acct = await User.findById(req.user.id);
      if (acct) {
        acct.userType = 'host';
        await acct.save();
        req.user.userType = 'host';
      }
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

    // Avoid duplicates by title for this host
    const existing = await Property.find({ host: req.user.id }).select('title');
    const existingTitles = new Set(existing.map(p => p.title));

    const toCreate = samples.filter(s => !existingTitles.has(s.title)).map(s => ({ ...s, host: req.user.id }));

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
  } catch (error) {
    console.error('Seed demo error:', error);
    return res.status(500).json({ message: 'Failed to seed demo properties', error: error.message });
  }
});

// Seed demo properties for current user (host or admin)
// POST /api/properties/seed-demo
router.post('/seed-demo', requireAuth, async (req, res) => {
    try {
        // Auto-promote to host if not already
        if (req.user.userType !== 'host' && req.user.userType !== 'admin') {
            const acct = await User.findById(req.user.id);
            if (acct) {
                acct.userType = 'host';
                await acct.save();
                req.user.userType = 'host';
            }
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
                    {
                        roomNumber: 'A1', roomType: 'double', pricePerNight: 60000, capacity: 3,
                        amenities: ['wifi','desk'],
                        images: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200']
                    },
                    {
                        roomNumber: 'A2', roomType: 'single', pricePerNight: 50000, capacity: 2,
                        amenities: ['wifi'],
                        images: ['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200']
                    }
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
                    {
                        roomNumber: 'V1', roomType: 'suite', pricePerNight: 180000, capacity: 4,
                        amenities: ['wifi','balcony'],
                        images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200']
                    },
                    {
                        roomNumber: 'V2', roomType: 'double', pricePerNight: 140000, capacity: 3,
                        amenities: ['wifi'],
                        images: ['https://images.unsplash.com/photo-1560066984-5b560f4cfb21?w=1200']
                    }
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
                images: [
                    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200'
                ],
                category: 'hostel',
                visibilityLevel: 'standard',
                rooms: [
                    { roomNumber: 'B1', roomType: 'single', pricePerNight: 15000, capacity: 1, images: ['https://images.unsplash.com/photo-1598928506311-1c9a8f1a5b1a?w=1200'] },
                    { roomNumber: 'B2', roomType: 'family', pricePerNight: 30000, capacity: 4, images: ['https://images.unsplash.com/photo-1600607687920-4ce9a5c6a253?w=1200'] }
                ]
            }
        ];

        // Avoid duplicates by title for this host
        const existing = await Property.find({ host: req.user.id }).select('title');
        const existingTitles = new Set(existing.map(p => p.title));

        const toCreate = samples
            .filter(s => !existingTitles.has(s.title))
            .map(s => ({ ...s, host: req.user.id }));

        let created = [];
        if (toCreate.length) {
            // Normalize images to ensure http links are preserved as-is
            created = await Property.insertMany(toCreate, { ordered: false });
        }

        return res.json({
            message: 'Seed complete',
            created: created.length,
            skipped: samples.length - toCreate.length,
            totalForUser: existing.length + created.length
        });
    } catch (error) {
        console.error('Seed demo error:', error);
        return res.status(500).json({ message: 'Failed to seed demo properties', error: error.message });
    }
});

// Expose post-connect sanitization to be invoked after Mongo is ready
router.sanitizeCommissionRates = async () => {
    try {
        const settings = await CommissionSettings.getSingleton();
        const min = Math.min(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 8;
        const max = Math.max(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 12;
        await Property.updateMany({ commissionRate: { $gt: max } }, { $set: { commissionRate: max } });
        await Property.updateMany({ commissionRate: { $lt: min } }, { $set: { commissionRate: settings.premiumRate || min } });
    } catch (e) {
        console.warn('Commission sanitize skipped:', e?.message || e);
    }
};

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
            // Always keep properties visible; annotate with flags so frontend can style/deprioritize
            if (host && host.isBlocked) {
                // If block duration has passed, auto-clear
                if (host.blockedUntil && new Date(host.blockedUntil) < now) {
                    try {
                        const u = await User.findById(host._id);
                        if (u) {
                            u.isBlocked = false;
                            u.blockedUntil = null;
                            await u.save();
                        }
                    } catch (e) { /* ignore */ }
                    p._doc.hostBlocked = false;
                } else {
                    p._doc.hostBlocked = true;
                }
            }

            // Check commission payment status for annotation
            const hostId = host?._id ? String(host._id) : null;
            const unpaidInfo = hostId ? unpaidCommissionMap.get(hostId) : null;
            if (unpaidInfo && unpaidInfo.unpaidAmount > 0) {
                p._doc.unpaidCommission = {
                    amount: unpaidInfo.unpaidAmount,
                    count: unpaidInfo.count
                };
            }

            visible.push(p);
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

        // Fetch active deals for these properties
        const propertyIds = properties.map(p => p._id);
        // Reuse 'now' variable from above
        let activeDeals = [];
        
        if (Deal) {
            try {
                activeDeals = await Deal.find({
                    property: { $in: propertyIds },
                    isActive: true,
                    isPublished: true,
                    validFrom: { $lte: now },
                    validUntil: { $gte: now }
                }).select('property dealType title tagline discountType discountValue badge badgeColor priority');

                console.log(`[Deals] Found ${activeDeals.length} active deals for ${propertyIds.length} properties`);
            } catch (error) {
                console.error('[Deals] Error fetching deals:', error.message);
            }
        }

        // Group deals by property
        const dealsByProperty = new Map();
        activeDeals.forEach(deal => {
            const propId = String(deal.property);
            if (!dealsByProperty.has(propId)) {
                dealsByProperty.set(propId, []);
            }
            dealsByProperty.get(propId).push(deal);
        });

        // Normalize image paths to web-friendly URLs to avoid broken/black cards on frontend
        const norm = (u) => {
            if (!u) return u;
            let s = String(u).trim();
            // Preserve absolute URLs and data URIs
            if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return s;
            s = s.replace(/\\+/g, '/');
            if (!s.startsWith('/')) s = `/${s}`;
            return s;
        };
        const out = (properties || []).map(p => {
            const o = p.toObject ? p.toObject({ virtuals: true }) : p;
            if (Array.isArray(o.images)) o.images = o.images.map(norm);
            if (Array.isArray(o.rooms)) {
                o.rooms = o.rooms.map(r => ({
                    ...r,
                    images: Array.isArray(r.images) ? r.images.map(norm) : []
                }));
            }
            
            // Add deals information
            const propDeals = dealsByProperty.get(String(p._id)) || [];
            o.activeDeals = propDeals.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            o.activeDealsCount = propDeals.length;
            o.bestDeal = propDeals.length > 0 ? propDeals[0] : null;
            
            return o;
        });
        res.json({ properties: out });
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
                    'propertyInfo.host': new mongoose.Types.ObjectId(req.user.id)
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

// Get commission configuration for a specific property (owner/admin)
// Returns current property, its commissionLevel (if any) and all active levels
router.get('/:id/commission', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('commissionLevel');
        if (!property) return res.status(404).json({ message: 'Property not found' });

        const isOwner = String(property.host) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

        const levels = await CommissionLevel.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 });

        return res.json({
            property: {
                _id: property._id,
                title: property.title,
                commissionRate: property.commissionRate,
                commissionLevel: property.commissionLevel || null,
            },
            levels,
        });
    } catch (error) {
        console.error('Get property commission error:', error);
        return res.status(500).json({ message: 'Failed to fetch property commission', error: error.message });
    }
});

// Update a property commission level (owner/admin)
// Body: { levelId } - ObjectId of CommissionLevel
router.put('/:id/commission', requireAuth, async (req, res) => {
    try {
        const { levelId } = req.body || {};
        if (!levelId) {
            return res.status(400).json({ message: 'levelId is required' });
        }

        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });

        const isOwner = String(property.host) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed' });

        const level = await CommissionLevel.findById(levelId);
        if (!level || !level.active) {
            return res.status(400).json({ message: 'Invalid commission level' });
        }

        // Apply new level to property
        const beforeRate = property.commissionRate;
        const beforeVis = property.visibilityLevel;

        property.commissionLevel = level._id;
        // Keep legacy commissionRate roughly aligned with onlineRate for compatibility
        if (typeof level.onlineRate === 'number') {
            property.commissionRate = level.onlineRate;
        }

        await property.save();

        // Notify host about commission change
        try {
            if (beforeRate !== property.commissionRate || beforeVis !== property.visibilityLevel) {
                await Notification.create({
                    type: 'commission_change',
                    title: 'Property commission level updated',
                    message: `Commission level for property "${property.title}" is now ${level.name} (online ${level.onlineRate}% / direct ${level.directRate}%).`,
                    property: property._id,
                    recipientUser: property.host,
                    audience: 'host',
                });
            }
        } catch (_) {}

        return res.json({
            property: {
                _id: property._id,
                title: property.title,
                commissionRate: property.commissionRate,
                commissionLevel: level,
            },
        });
    } catch (error) {
        console.error('Update property commission error:', error);
        return res.status(500).json({ message: 'Failed to update property commission', error: error.message });
    }
});

router.get('/:id/manage', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('host', 'firstName lastName isBlocked blockedUntil');
        if (!property) return res.status(404).json({ message: 'Property not found' });

        const ownerId = property.host && property.host._id ? property.host._id : property.host;
        if (String(ownerId) !== String(req.user.id) && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }

        const norm = (u) => {
            if (!u) return u;
            let s = String(u).trim();
            if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return s;
            s = s.replace(/\\+/g, '/');
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
    } catch (error) {
        console.error('Get manage property error:', error);
        res.status(500).json({ message: 'Failed to fetch property', error: error.message });
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
                recipientUser: overdue._id,
                audience: 'host'
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
    const property = await Property.findById(req.params.id).populate('host', 'firstName lastName email phone createdAt isBlocked blockedUntil');
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
        let s = String(u).trim();
        if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return s;
        s = s.replace(/\\+/g, '/');
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

// Room lock/unlock like booking.com controls used by RoomCalendarPanel.jsx
// POST /api/properties/:id/rooms/:roomId/lock { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', reason?: string }
router.post('/:id/rooms/:roomId/lock', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).select('rooms host');
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (String(property.host) !== String(req.user.id) && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }
        const room = (property.rooms || []).id(req.params.roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const { startDate, endDate, reason } = req.body || {};
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
            return res.status(400).json({ message: 'Invalid start/end dates' });
        }

        // Prevent duplicate/overlapping closed ranges; merge simple overlaps
        room.closedDates = Array.isArray(room.closedDates) ? room.closedDates : [];
        const merged = [];
        let added = { startDate: s, endDate: e, reason: reason || 'Locked' };
        for (const cd of room.closedDates) {
            const cs = new Date(cd.startDate); const ce = new Date(cd.endDate);
            if (!(ce <= added.startDate || cs >= added.endDate)) {
                // Overlap -> merge
                added.startDate = new Date(Math.min(added.startDate, cs));
                added.endDate = new Date(Math.max(added.endDate, ce));
                added.reason = added.reason || cd.reason;
            } else {
                merged.push(cd);
            }
        }
        merged.push({ startDate: added.startDate, endDate: added.endDate, reason: added.reason });
        room.closedDates = merged;
        await property.save();
        return res.json({ success: true, room: { _id: room._id, closedDates: room.closedDates } });
    } catch (error) {
        console.error('Room lock error:', error);
        return res.status(500).json({ message: 'Failed to lock room' });
    }
});

// POST /api/properties/:id/rooms/:roomId/unlock { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
router.post('/:id/rooms/:roomId/unlock', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).select('rooms host');
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (String(property.host) !== String(req.user.id) && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }
        const room = (property.rooms || []).id(req.params.roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const { startDate, endDate } = req.body || {};
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
            return res.status(400).json({ message: 'Invalid start/end dates' });
        }

        room.closedDates = (Array.isArray(room.closedDates) ? room.closedDates : []).filter(cd => {
            if (!cd?.startDate || !cd?.endDate) return false;
            const cs = new Date(cd.startDate).toISOString().slice(0,10);
            const ce = new Date(cd.endDate).toISOString().slice(0,10);
            return !(cs === new Date(s).toISOString().slice(0,10) && ce === new Date(e).toISOString().slice(0,10));
        });
        await property.save();
        return res.json({ success: true, room: { _id: room._id, closedDates: room.closedDates } });
    } catch (error) {
        console.error('Room unlock error:', error);
        return res.status(500).json({ message: 'Failed to unlock room' });
    }
});

// Use memory storage; files will be forwarded to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Dedicated image upload endpoint
router.post('/upload/images', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No images uploaded' });
        }
        const results = await Promise.all(
            req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'properties'))
        );
        const imageUrls = results.map(r => r.secure_url || r.url);
        res.json({ success: true, imageUrls, message: 'Images uploaded successfully' });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ message: 'Failed to upload images', error: error.message });
    }
});

router.post('/', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        // Allow any authenticated user; auto-promote to host on first upload
        if (req.user.userType !== 'host' && req.user.userType !== 'admin') {
            const acct = await User.findById(req.user.id);
            if (acct) {
                acct.userType = 'host';
                await acct.save();
                req.user.userType = 'host';
            }
        }
        // Upload in-memory files to cloud and collect URLs (memoryStorage has no f.path)
        let uploadedUrls = [];
        if (req.files && req.files.length) {
            try {
                console.log(`Uploading ${req.files.length} images to Cloudinary...`);
                const uploaded = await Promise.all(
                    req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'properties'))
                );
                uploadedUrls = uploaded.map(u => u.secure_url || u.url).filter(Boolean);
                console.log(`Successfully uploaded ${uploadedUrls.length} images`);
            } catch (e) {
                console.error('Cloudinary upload failed:', e);
                // Don't fail the entire request if image upload fails
                // Property can be created without images and images can be added later
            }
        }
        // Merge any images provided in JSON body (images, imageUrls) with uploaded file URLs
        let mergedImages = [...uploadedUrls];
        const bodyImages = req.body.images ? (Array.isArray(req.body.images) ? req.body.images : [req.body.images]) : [];
        const bodyImageUrls = req.body.imageUrls ? (Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls]) : [];
        mergedImages.push(
            ...bodyImages.map(u => String(u).replace(/\\+/g, '/')),
            ...bodyImageUrls.map(u => String(u).replace(/\\+/g, '/'))
        );
        // Deduplicate & normalize
        mergedImages = Array.from(new Set(mergedImages.filter(Boolean).map(u => String(u).replace(/\\+/g, '/'))));
        const payload = { ...req.body, images: mergedImages, host: req.user.id };
        
        // Coerce numeric fields
        ['pricePerNight', 'bedrooms', 'bathrooms', 'maxGuests', 'groupBookingDiscount', 'minStayNights', 'cancellationWindowDays', 'depositPercent', 'cleaningFee', 'unitCount', 'latitude', 'longitude'].forEach(field => {
            if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
                payload[field] = Number(payload[field]);
            }
        });

        // Map localTaxPercent from frontend to taxRate in model
        if (payload.localTaxPercent != null && payload.localTaxPercent !== '') {
            const t = Number(payload.localTaxPercent);
            if (!isNaN(t)) payload.taxRate = t;
            delete payload.localTaxPercent;
        }

        // Coerce booleans that may arrive as strings
        ['ratePlanNonRefundable','ratePlanFreeCancellation','prepaymentRequired','smokingAllowed','groupBookingEnabled'].forEach(b => {
            if (payload[b] != null) {
                const v = payload[b];
                if (typeof v === 'string') payload[b] = v === 'true' || v === '1' || v === 'on';
                else payload[b] = !!v;
            }
        });
        
        // Ensure commissionRate uses current CommissionSettings
        if (payload.commissionRate != null) {
            try {
                const settings = await CommissionSettings.getSingleton();
                const min = Math.min(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 8;
                const max = Math.max(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 12;
                const cr = Number(payload.commissionRate);
                payload.commissionRate = Math.min(max, Math.max(min, isNaN(cr) ? settings.premiumRate || 10 : cr));
            } catch {
                const cr = Number(payload.commissionRate);
                payload.commissionRate = Math.min(12, Math.max(8, isNaN(cr) ? 10 : cr));
            }
        } else {
            // Set default commission rate based on visibility level using current settings
            try {
                const settings = await CommissionSettings.getSingleton();
                if (payload.visibilityLevel === 'featured') {
                    payload.commissionRate = settings.featuredRate;
                } else if (payload.visibilityLevel === 'premium') {
                    payload.commissionRate = settings.premiumRate;
                } else {
                    payload.commissionRate = settings.baseRate;
                }
            } catch {
                if (payload.visibilityLevel === 'featured') {
                    payload.commissionRate = 12;
                } else if (payload.visibilityLevel === 'premium') {
                    payload.commissionRate = 10;
                } else {
                    payload.commissionRate = 8;
                }
            }
        }
        
        // Coerce roomRules to array if provided
        if (payload.roomRules && !Array.isArray(payload.roomRules)) {
            payload.roomRules = [payload.roomRules];
        }
        
        // Coerce amenities to array if provided
        if (payload.amenities && !Array.isArray(payload.amenities)) {
            payload.amenities = [payload.amenities];
        }
        
        // Parse rooms if it's a JSON string
        if (payload.rooms && typeof payload.rooms === 'string') {
            try {
                payload.rooms = JSON.parse(payload.rooms);
            } catch (e) {
                console.error('Failed to parse rooms JSON:', e);
                delete payload.rooms; // Remove invalid rooms data
            }
        }
        
        // Remove rooms if it's an empty array or invalid
        if (Array.isArray(payload.rooms) && payload.rooms.length === 0) {
            delete payload.rooms;
        }
        
        // Prevent duplicate properties with same name and location for the same host
        const normalizedTitle = (payload.title || '').toString().trim();
        const normalizedCity = (payload.city || '').toString().trim();
        const normalizedAddress = (payload.address || '').toString().trim();
        if (normalizedTitle && (normalizedCity || normalizedAddress)) {
            const dupQuery = {
                host: req.user.id,
                title: normalizedTitle,
            };
            if (normalizedCity) dupQuery.city = normalizedCity;
            if (normalizedAddress) dupQuery.address = normalizedAddress;
            const existing = await Property.findOne(dupQuery).select('_id title city address');
            if (existing) {
                return res.status(400).json({
                    message: 'You already have a property with this name in this location. No duplication allowed.'
                });
            }
            // Ensure payload uses the normalized values when saving
            payload.title = normalizedTitle;
            if (normalizedCity) payload.city = normalizedCity;
            if (normalizedAddress) payload.address = normalizedAddress;
        }
        
        console.log('Creating property with payload:', {
            title: payload.title,
            address: payload.address,
            city: payload.city,
            pricePerNight: payload.pricePerNight,
            commissionRate: payload.commissionRate,
            host: payload.host,
            imagesCount: payload.images?.length || 0,
            bedrooms: payload.bedrooms,
            bathrooms: payload.bathrooms,
            hasRooms: !!payload.rooms,
            roomsCount: payload.rooms?.length
        });
        
        // Log full payload for debugging (remove in production)
        console.log('Full payload:', JSON.stringify(payload, null, 2));
        
        const created = await Property.create(payload);
        console.log('Property created successfully:', created._id);
        
        // Notify admin of new property upload
        try {
            await Notification.create({
                type: 'booking_created', // reuse type bucket with message context
                title: 'New property uploaded',
                message: `A new property "${created.title}" was uploaded`,
                property: created._id,
                recipientUser: null,
                audience: 'both'
            });
        } catch (notifError) {
            console.error('Failed to create notification:', notifError);
            // Don't fail the request if notification fails
        }
        
        res.status(201).json({ property: created });
    } catch (error) {
        console.error('Property creation error:', error);
        console.error('Error stack:', error.stack);
        console.error('Validation errors:', error.errors);
        res.status(500).json({ 
            message: 'Failed to create property', 
            error: error.message,
            details: error.errors ? Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            })) : undefined
        });
    }
});

// Update a property (owner or admin)
router.put('/:id', requireAuth, requireWorkerPrivilege('canEditProperties'), upload.array('images', 10), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }
        const updates = { ...req.body };
        // Coerce number fields
        ['pricePerNight','bedrooms','bathrooms','discountPercent','commissionRate','maxGuests','groupBookingDiscount','minStayNights','cancellationWindowDays','depositPercent','cleaningFee','unitCount','latitude','longitude'].forEach(k => {
            if (updates[k] != null && updates[k] !== '') updates[k] = Number(updates[k]);
        });

        // Map localTaxPercent to taxRate if provided
        if (updates.localTaxPercent != null && updates.localTaxPercent !== '') {
            const t = Number(updates.localTaxPercent);
            if (!isNaN(t)) updates.taxRate = t;
            delete updates.localTaxPercent;
        }

        const before = await Property.findById(req.params.id).select('commissionRate visibilityLevel title host');

        // Coerce booleans
        ['ratePlanNonRefundable','ratePlanFreeCancellation','prepaymentRequired','smokingAllowed','groupBookingEnabled'].forEach(b => {
            if (updates[b] != null) {
                const v = updates[b];
                if (typeof v === 'string') updates[b] = v === 'true' || v === '1' || v === 'on';
                else updates[b] = !!v;
            }
        });
        // Ensure commissionRate uses current CommissionSettings
        if (updates.commissionRate != null) {
            try {
                const settings = await CommissionSettings.getSingleton();
                const min = Math.min(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 8;
                const max = Math.max(settings.baseRate, settings.premiumRate, settings.featuredRate) ?? 12;
                const cr = Number(updates.commissionRate);
                updates.commissionRate = Math.min(max, Math.max(min, isNaN(cr) ? settings.premiumRate || 10 : cr));
            } catch {
                updates.commissionRate = Math.min(12, Math.max(8, Number(updates.commissionRate)));
            }
        } else if (updates.visibilityLevel) {
            // Set commission rate based on visibility level using current settings
            try {
                const settings = await CommissionSettings.getSingleton();
                if (updates.visibilityLevel === 'featured') {
                    updates.commissionRate = settings.featuredRate;
                } else if (updates.visibilityLevel === 'premium') {
                    updates.commissionRate = settings.premiumRate;
                } else {
                    updates.commissionRate = settings.baseRate;
                }
            } catch {
                if (updates.visibilityLevel === 'featured') {
                    updates.commissionRate = 12;
                } else if (updates.visibilityLevel === 'premium') {
                    updates.commissionRate = 10;
                } else {
                    updates.commissionRate = 8;
                }
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
        
        // Parse rooms if it's a JSON string
        if (updates.rooms && typeof updates.rooms === 'string') {
            try {
                updates.rooms = JSON.parse(updates.rooms);
            } catch (e) {
                console.error('Failed to parse rooms JSON:', e);
            }
        }
        
        // Merge or replace images if new files provided
        if (req.files && req.files.length) {
            const uploaded = await Promise.all(req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'properties')));
            const urls = uploaded.map(u => u.secure_url || u.url);
            updates.images = urls;
        }
        // Merge explicit imageUrls if provided
        if (req.body.imageUrls) {
            const urls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
            const normalized = urls.map(u => String(u).replace(/\\+/g, '/'));
            updates.images = (updates.images && updates.images.length)
                ? [...updates.images, ...normalized]
                : normalized;
        }
        // Merge body images if provided as JSON array (frontend sends `images`)
        if (req.body.images) {
            const arr = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
            const normalized = arr.map(u => String(u).replace(/\\+/g, '/'));
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

        // Handle add-on services explicitly so they persist reliably
        if (updates.addOnServices != null) {
            let addOns = updates.addOnServices;
            // If coming as JSON string, parse it
            if (typeof addOns === 'string') {
                try {
                    addOns = JSON.parse(addOns);
                } catch (e) {
                    console.error('Failed to parse addOnServices JSON:', e?.message || e);
                }
            }
            if (Array.isArray(addOns)) {
                const allowedScopes = ['per_booking', 'per_night', 'per_guest'];
                const normalized = addOns.map(raw => {
                    const addOn = { ...raw };
                    // Normalize scope from UI values like "per-booking" to schema enum "per_booking"
                    if (addOn.scope) {
                        const s = String(addOn.scope).trim().toLowerCase().replace(/-/g, '_');
                        if (allowedScopes.includes(s)) {
                            addOn.scope = s;
                        } else {
                            // Fallback to default if invalid
                            addOn.scope = 'per_booking';
                        }
                    }
                    // Frontend may send includedItems as an object map; convert to array of enabled keys
                    if (addOn.includedItems && !Array.isArray(addOn.includedItems) && typeof addOn.includedItems === 'object') {
                        addOn.includedItems = Object.entries(addOn.includedItems)
                            .filter(([, v]) => !!v)
                            .map(([k]) => k);
                    }
                    return addOn;
                });
                property.addOnServices = normalized;
                property.markModified('addOnServices');
            }
            delete updates.addOnServices;
        }

        Object.assign(property, updates);
        clampCommission(property);
        await property.save();
        res.json({ property });
    } catch (error) {
        console.error('Property update error:', error);
        res.status(500).json({ 
            message: 'Failed to update property', 
            error: error.message,
            details: error.errors ? Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            })) : undefined
        });
    }
});

// Admin-only: normalize stored image URLs for all properties and rooms
router.post('/admin/normalize-images', requireAuth, async (req, res) => {
    try {
        // Admin-only toggle requires auth; keep it protected
    if (!req.user || req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
        const norm = (u) => {
            if (!u) return u;
            let s = String(u).trim();
            if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return s;
            s = s.replace(/\\+/g, '/');
            if (!s.startsWith('/')) s = `/${s}`;
            return s;
        };
        const props = await Property.find({}).select('_id images rooms');
        let changed = 0;
        for (const p of props) {
            let did = false;
            if (Array.isArray(p.images)) {
                const n = p.images.map(norm);
                if (JSON.stringify(n) !== JSON.stringify(p.images)) { p.images = Array.from(new Set(n)); did = true; }
            }
            if (Array.isArray(p.rooms)) {
                for (const r of p.rooms) {
                    if (Array.isArray(r.images)) {
                        const n = r.images.map(norm);
                        if (JSON.stringify(n) !== JSON.stringify(r.images)) { r.images = Array.from(new Set(n)); did = true; }
                    }
                }
            }
            if (did) { await p.save(); changed++; }
        }
        res.json({ message: 'Normalization complete', updatedDocuments: changed, scanned: props.length });
    } catch (e) {
        console.error('Normalize images admin task failed:', e);
        res.status(500).json({ message: 'Failed to normalize images', error: e.message });
    }
});

// [Removed duplicate delete route here] Use the later host-only delete route below instead.

// Toggle availability (admin-only)
// Public availability check: do NOT require auth when dates are provided
router.post('/:id/availability', async (req, res) => {
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
router.post('/:id/rooms', requireAuth, upload.array('images', 10), async (req, res) => {
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

        // Merge uploaded files + body images into final images array
        const uploaded = (req.files && req.files.length)
            ? (await Promise.all(req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'properties/rooms')))).map(r => r.secure_url || r.url)
            : [];
        const bodyImages = Array.isArray(images) ? images : [images].filter(Boolean);
        const mergedImages = Array.from(new Set([...uploaded, ...bodyImages].map(u => String(u).replace(/\\+/g, '/')).filter(Boolean)));

        property.rooms = property.rooms || [];
        property.rooms.push({
            roomNumber,
            roomType,
            pricePerNight: Number(pricePerNight),
            capacity: Number(capacity),
            amenities: Array.isArray(amenities) ? amenities : String(amenities).split(',').map(s => s.trim()).filter(Boolean),
            images: mergedImages,
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

// Upload images to an existing room and append to its images array
router.post('/:id/rooms/:roomId/images', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (String(property.host) !== req.user.id && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }
        const room = (property.rooms || []).id(req.params.roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const uploaded = (req.files && req.files.length)
            ? (await Promise.all(req.files.map(f => uploadBuffer(f.buffer, f.originalname, 'properties/rooms')))).map(r => r.secure_url || r.url)
            : [];
        const bodyUrls = req.body.imageUrls ? (Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls]) : [];
        const all = Array.from(new Set([...(room.images || []), ...uploaded, ...bodyUrls].map(u => String(u).replace(/\\+/g, '/')).filter(Boolean)));
        room.images = all;
        await property.save();
        res.json({ success: true, images: room.images });
    } catch (e) {
        console.error('Room images upload error:', e);
        res.status(500).json({ message: 'Failed to upload room images', error: e.message });
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

// Toggle property active status (host or admin)
router.patch('/:id/toggle-status', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        
        // Only property owner or admin can toggle status
        if (String(property.host) !== String(req.user.id) && req.user.userType !== 'admin') {
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

// Delete property (host or admin, only when no bookings exist)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        
        // Only property owner or admin can delete
        if (String(property.host) !== String(req.user.id) && req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }
        
        // Check for any bookings linked to this property
        const Booking = require('../tables/booking');
        const hasBookings = await Booking.exists({ property: property._id });
        
        if (hasBookings) {
            return res.status(409).json({
                success: false,
                code: 'PROPERTY_HAS_BOOKINGS',
                message: 'This property has bookings and cannot be deleted. Please close the listing instead so it no longer appears to guests.'
            });
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

        // Compute an overall 0–10 score for each review as the average of aspect scores
        // when available, falling back to the stored overallScore10 or legacy 1–5 rating.
        const scores = ratings
            .map(r => {
                const aspectValues = [
                    r.staff,
                    r.cleanliness,
                    r.locationScore,
                    r.facilities,
                    r.comfort,
                    r.valueForMoney
                ].filter(v => typeof v === 'number' && !isNaN(v));

                if (aspectValues.length > 0) {
                    const sumAspects = aspectValues.reduce((s, v) => s + v, 0);
                    const avgAspects = sumAspects / aspectValues.length;
                    return Math.max(0, Math.min(10, Number(avgAspects)));
                }

                if (typeof r.overallScore10 === 'number' && !isNaN(r.overallScore10)) {
                    return Math.max(0, Math.min(10, Number(r.overallScore10)));
                }
                if (typeof r.rating === 'number' && !isNaN(r.rating)) {
                    const mapped = Number(r.rating) * 2; // 1–5 -> 2–10
                    return Math.max(0, Math.min(10, mapped));
                }
                return null;
            })
            .filter(v => v !== null);

        const count = scores.length;
        const sum = scores.reduce((s, v) => s + v, 0);
        const avg10 = count ? Math.round((sum / count) * 10) / 10 : 0;

        res.json({ summary: { average: avg10, count } });
    } catch (e) {
        res.status(500).json({ message: 'Failed to compute reviews summary', error: e.message });
    }
});

// Reviews: summary across all properties owned by the current user
router.get('/my-reviews/summary', requireAuth, async (req, res) => {
    try {
        const props = await Property.find({ host: req.user.id, isActive: true }).select('ratings');

        let totalCount = 0;
        let totalSum = 0;

        for (const p of props) {
            const ratings = Array.isArray(p.ratings) ? p.ratings : [];
            const scores = ratings
                .map(r => {
                    if (typeof r.overallScore10 === 'number' && !isNaN(r.overallScore10)) {
                        return Math.max(0, Math.min(10, Number(r.overallScore10)));
                    }
                    if (typeof r.rating === 'number' && !isNaN(r.rating)) {
                        const mapped = Number(r.rating) * 2;
                        return Math.max(0, Math.min(10, mapped));
                    }
                    return null;
                })
                .filter(v => v !== null);

            totalCount += scores.length;
            totalSum += scores.reduce((s, v) => s + v, 0);
        }

        const avg10 = totalCount ? Math.round((totalSum / totalCount) * 10) / 10 : 0;
        res.json({ summary: { average: avg10, count: totalCount } });
    } catch (e) {
        res.status(500).json({ message: 'Failed to compute my reviews summary', error: e.message });
    }
});

module.exports = router;


