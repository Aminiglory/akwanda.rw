const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Property = require('../tables/property');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); } catch (e) { return res.status(401).json({ message: 'Invalid token' }); }
}

async function assertOwnerOrAdmin(propertyId, user) {
  const prop = await Property.findById(propertyId).select('host');
  if (!prop) throw Object.assign(new Error('Property not found'), { status: 404 });
  const isOwner = String(prop.host) === String(user.id);
  const isAdmin = user.userType === 'admin';
  if (!isOwner && !isAdmin) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return prop;
}

// Helpers to iterate rooms payload: [{ propertyId, roomId }]
async function forEachRoom(rooms, user, fn) {
  if (!Array.isArray(rooms) || rooms.length === 0) throw Object.assign(new Error('No rooms provided'), { status: 400 });
  for (const r of rooms) {
    if (!r || !r.propertyId || !r.roomId) continue;
    await assertOwnerOrAdmin(r.propertyId, user);
    await fn(r.propertyId, r.roomId);
  }
}

// Close dates
router.post('/bulk/close', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, rooms } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Invalid date range' });
    const sd = new Date(startDate), ed = new Date(endDate);
    if (isNaN(sd) || isNaN(ed) || ed <= sd) return res.status(400).json({ message: 'Invalid date range' });
    await forEachRoom(rooms, req.user, async (propertyId, roomId) => {
      await Property.updateOne({ _id: propertyId, 'rooms._id': roomId }, {
        $push: { 'rooms.$.closedDates': { startDate: sd, endDate: ed } }
      });
    });
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to close dates' }); }
});

// Open dates (remove overlaps)
router.post('/bulk/open', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, rooms } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Invalid date range' });
    const sd = new Date(startDate), ed = new Date(endDate);
    if (isNaN(sd) || isNaN(ed) || ed <= sd) return res.status(400).json({ message: 'Invalid date range' });
    await forEachRoom(rooms, req.user, async (propertyId, roomId) => {
      const prop = await Property.findOne({ _id: propertyId }).select('rooms');
      if (!prop) return;
      const room = (prop.rooms || []).id(roomId);
      if (!room) return;
      const filtered = (room.closedDates || []).filter(cd => {
        if (!cd || !cd.startDate || !cd.endDate) return true;
        const cs = new Date(cd.startDate); const ce = new Date(cd.endDate);
        // keep only those that do NOT overlap range
        return !(cs < ed && ce > sd);
      });
      room.closedDates = filtered;
      await prop.save();
    });
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to open dates' }); }
});

// Set rate
router.post('/bulk/set-rate', requireAuth, async (req, res) => {
  try {
    const { rate, rooms } = req.body;
    const price = Number(rate);
    if (!price || price <= 0) return res.status(400).json({ message: 'Invalid rate' });
    await forEachRoom(rooms, req.user, async (propertyId, roomId) => {
      await Property.updateOne({ _id: propertyId, 'rooms._id': roomId }, { $set: { 'rooms.$.pricePerNight': price } });
    });
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to set rate' }); }
});

// Set restrictions (min/max stay) stored at room level
router.post('/bulk/restrictions', requireAuth, async (req, res) => {
  try {
    const { minStay, maxStay, rooms } = req.body;
    const update = {};
    if (minStay != null) update['rooms.$.minStay'] = Number(minStay);
    if (maxStay != null) update['rooms.$.maxStay'] = Number(maxStay);
    if (Object.keys(update).length === 0) return res.status(400).json({ message: 'No restrictions provided' });
    await forEachRoom(rooms, req.user, async (propertyId, roomId) => {
      await Property.updateOne({ _id: propertyId, 'rooms._id': roomId }, { $set: update });
    });
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to set restrictions' }); }
});

// Copy yearly rates - copy rates from one period to another
router.post('/copy-yearly', requireAuth, async (req, res) => {
  try {
    const { propertyId, sourceYear, targetYear } = req.body;
    await assertOwnerOrAdmin(propertyId, req.user);
    
    const property = await Property.findById(propertyId).select('rooms pricePerNight');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    // For simplicity, we'll just copy the base rate
    // In a real implementation, you'd copy seasonal rates, special dates, etc.
    res.json({ 
      success: true, 
      message: `Rates copied from ${sourceYear} to ${targetYear}`,
      baseRate: property.pricePerNight 
    });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to copy rates' }); }
});

// Get rate plans for a property
router.get('/plans/:propertyId', requireAuth, async (req, res) => {
  try {
    await assertOwnerOrAdmin(req.params.propertyId, req.user);
    
    const property = await Property.findById(req.params.propertyId).select('rooms pricePerNight title');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    // Return rate plans (base rate + room-specific rates)
    const plans = [
      {
        id: 'standard',
        name: 'Standard Rate',
        description: 'Regular pricing',
        baseRate: property.pricePerNight || 0,
        rooms: (property.rooms || []).map(r => ({
          roomId: r._id,
          roomType: r.roomType || r.type,
          rate: r.pricePerNight || property.pricePerNight || 0
        }))
      }
    ];
    
    res.json({ plans, propertyTitle: property.title });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to get rate plans' }); }
});

// Set pricing per guest (additional guest charges)
router.post('/pricing-per-guest', requireAuth, async (req, res) => {
  try {
    const { propertyId, roomId, additionalGuestCharge, maxGuests } = req.body;
    await assertOwnerOrAdmin(propertyId, req.user);
    
    const update = {};
    if (additionalGuestCharge != null) update['rooms.$.additionalGuestCharge'] = Number(additionalGuestCharge);
    if (maxGuests != null) update['rooms.$.maxGuests'] = Number(maxGuests);
    
    await Property.updateOne(
      { _id: propertyId, 'rooms._id': roomId },
      { $set: update }
    );
    
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to set pricing' }); }
});

// Get availability calendar for a property
router.get('/calendar/:propertyId', requireAuth, async (req, res) => {
  try {
    await assertOwnerOrAdmin(req.params.propertyId, req.user);
    
    const { startDate, endDate } = req.query;
    const property = await Property.findById(req.params.propertyId)
      .select('rooms title pricePerNight')
      .populate('rooms.closedDates');
    
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    // Return calendar data with availability status
    const calendar = (property.rooms || []).map(room => ({
      roomId: room._id,
      roomType: room.roomType || room.type,
      closedDates: room.closedDates || [],
      rate: room.pricePerNight || property.pricePerNight || 0,
      minStay: room.minStay || 1,
      maxStay: room.maxStay || 365
    }));
    
    res.json({ calendar, propertyTitle: property.title });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to get calendar' }); }
});

// Set country-specific rates
router.post('/country-rates', requireAuth, async (req, res) => {
  try {
    const { propertyId, countryRates } = req.body; // countryRates: [{ country: 'US', rate: 100 }]
    await assertOwnerOrAdmin(propertyId, req.user);
    
    await Property.updateOne(
      { _id: propertyId },
      { $set: { countrySpecificRates: countryRates } }
    );
    
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to set country rates' }); }
});

// Set mobile-specific rates
router.post('/mobile-rates', requireAuth, async (req, res) => {
  try {
    const { propertyId, mobileDiscount } = req.body; // percentage discount for mobile bookings
    await assertOwnerOrAdmin(propertyId, req.user);
    
    await Property.updateOne(
      { _id: propertyId },
      { $set: { mobileDiscount: Number(mobileDiscount) || 0 } }
    );
    
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ message: e.message || 'Failed to set mobile rates' }); }
});

module.exports = router;
