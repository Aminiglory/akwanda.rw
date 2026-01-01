const express = require('express');
const router = express.Router();
const User = require('../tables/user');
const Property = require('../tables/property');
const Booking = require('../tables/booking');
const Notification = require('../tables/notification');
const Commission = require('../tables/commission');
const CommissionLevel = require('../tables/commissionLevel');
const CommissionUpgradeLog = require('../tables/commissionUpgradeLog');
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

// Legacy single global commission endpoints (kept for backward compatibility)
router.get('/commission', requireAdmin, async (req, res) => {
	const current = await Commission.findOne({ active: true }).sort({ createdAt: -1 });
	res.json({ commission: current });
});

// Set legacy single commission rate
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

// Commission levels management (admin-defined tiers for direct/online rates)
router.get('/commission-levels', requireAdmin, async (req, res) => {
  try {
    const { scope } = req.query || {};
    const filter = {};
    if (scope && (scope === 'property' || scope === 'vehicle')) {
      filter.scope = scope;
    }
    const levels = await CommissionLevel.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    return res.json({ levels });
  } catch (e) {
    console.error('List commission levels error:', e);
    return res.status(500).json({ message: 'Failed to load commission levels', error: e?.message || String(e) });
  }
});

router.post('/commission-levels', requireAdmin, async (req, res) => {
  try {
    const { name, key, description, directRate, onlineRate, isPremium, isDefault, sortOrder, scope } = req.body || {};
    if (!name || !key) {
      return res.status(400).json({ message: 'name and key are required' });
    }

    const direct = Number(directRate);
    const online = Number(onlineRate);
    if (isNaN(direct) || direct < 0 || direct > 100 || isNaN(online) || online < 0 || online > 100) {
      return res.status(400).json({ message: 'Invalid direct or online rate' });
    }

    let levelScope = 'property';
    if (scope === 'vehicle' || scope === 'property') {
      levelScope = scope;
    }

    const update = {
      name: String(name).trim(),
      key: String(key).trim(),
      description: description || '',
      directRate: direct,
      onlineRate: online,
      isPremium: !!isPremium,
      isDefault: !!isDefault,
      active: true,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      scope: levelScope,
    };

    if (update.isDefault) {
      await CommissionLevel.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }
    if (update.isPremium) {
      await CommissionLevel.updateMany({ isPremium: true }, { $set: { isPremium: false } });
    }

    const created = await CommissionLevel.create(update);
    return res.status(201).json({ level: created });
  } catch (e) {
    console.error('Create commission level error:', e);
    if (e.code === 11000) {
      return res.status(409).json({ message: 'Level key must be unique' });
    }
    return res.status(500).json({ message: 'Failed to create commission level', error: e?.message || String(e) });
  }
});

router.put('/commission-levels/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const level = await CommissionLevel.findById(id);
    if (!level) return res.status(404).json({ message: 'Commission level not found' });

    // Store old values for comparison
    const oldLevel = {
      name: level.name,
      directRate: level.directRate,
      onlineRate: level.onlineRate,
      isPremium: level.isPremium,
    };

    const { name, key, description, directRate, onlineRate, isPremium, isDefault, active, sortOrder, scope } = req.body || {};

    if (name != null) level.name = String(name).trim();
    if (key != null) level.key = String(key).trim();
    if (description != null) level.description = description;
    if (directRate != null) {
      const d = Number(directRate);
      if (isNaN(d) || d < 0 || d > 100) return res.status(400).json({ message: 'Invalid directRate' });
      level.directRate = d;
    }
    if (onlineRate != null) {
      const o = Number(onlineRate);
      if (isNaN(o) || o < 0 || o > 100) return res.status(400).json({ message: 'Invalid onlineRate' });
      level.onlineRate = o;
    }
    if (typeof isPremium === 'boolean') level.isPremium = isPremium;
    if (typeof isDefault === 'boolean') level.isDefault = isDefault;
    if (typeof active === 'boolean') level.active = active;
    if (sortOrder != null) level.sortOrder = Number(sortOrder) || 0;
    if (scope === 'property' || scope === 'vehicle') {
      level.scope = scope;
    }

    if (level.isDefault) {
      await CommissionLevel.updateMany({ _id: { $ne: level._id }, isDefault: true }, { $set: { isDefault: false } });
    }
    if (level.isPremium) {
      await CommissionLevel.updateMany({ _id: { $ne: level._id }, isPremium: true }, { $set: { isPremium: false } });
    }

    await level.save();

    // Check if rates changed and notify affected owners
    const ratesChanged = oldLevel.directRate !== level.directRate || oldLevel.onlineRate !== level.onlineRate;
    const nameChanged = oldLevel.name !== level.name;
    
    if (ratesChanged || nameChanged) {
      try {
        const Property = require('../tables/property');
        const CarRental = require('../tables/carRental');
        
        // Find all properties/vehicles using this level
        const properties = await Property.find({ commissionLevel: id }).select('host title');
        const vehicles = await CarRental.find({ commissionLevel: id }).select('owner vehicleName');
        
        const affectedOwners = new Set();
        properties.forEach(p => {
          if (p.host) affectedOwners.add(String(p.host));
        });
        vehicles.forEach(v => {
          if (v.owner) affectedOwners.add(String(v.owner));
        });

        // Create notifications for affected owners
        for (const ownerId of affectedOwners) {
          await Notification.create({
            type: 'commission_level_changed',
            title: 'Commission Level Updated',
            message: `The commission level "${level.name}" has been updated. Online rate: ${level.onlineRate}%, Direct rate: ${level.directRate}%. Please review and confirm if you want to keep this level or change to another.`,
            recipientUser: ownerId,
            audience: 'host',
            metadata: {
              commissionLevelId: String(level._id),
              oldDirectRate: oldLevel.directRate,
              newDirectRate: level.directRate,
              oldOnlineRate: oldLevel.onlineRate,
              newOnlineRate: level.onlineRate,
            }
          });
        }
      } catch (notifError) {
        console.error('Failed to notify owners of commission level change:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return res.json({ level, notifiedOwners: ratesChanged || nameChanged });
  } catch (e) {
    console.error('Update commission level error:', e);
    if (e.code === 11000) {
      return res.status(409).json({ message: 'Level key must be unique' });
    }
    return res.status(500).json({ message: 'Failed to update commission level', error: e?.message || String(e) });
  }
});

router.delete('/commission-levels/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const level = await CommissionLevel.findById(id);
    if (!level) return res.status(404).json({ message: 'Commission level not found' });
    // Prevent deleting levels that are in use
    if (level.scope === 'vehicle') {
      const CarRental = require('../tables/carRental');
      const inUseVehicle = await CarRental.exists({ commissionLevel: id });
      if (inUseVehicle) {
        return res.status(400).json({ message: 'Cannot delete a commission level that is assigned to vehicles' });
      }
    } else {
      const inUseProperty = await Property.exists({ commissionLevel: id });
      if (inUseProperty) {
        return res.status(400).json({ message: 'Cannot delete a commission level that is assigned to properties' });
      }
    }

    await level.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    console.error('Delete commission level error:', e);
    return res.status(500).json({ message: 'Failed to delete commission level', error: e?.message || String(e) });
  }
});

// Unlock a user account even if they still have pending commissions/fines
// PATCH /api/admin/users/:id/unlock
router.patch('/users/:id/unlock', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBlocked = false;
    user.blockedUntil = null;
    user.blockedAt = null;
    user.blockReason = null;
    // Optional: clear limitedAccess if used elsewhere
    if (typeof user.limitedAccess !== 'undefined') {
      user.limitedAccess = false;
    }

    await user.save();

    try {
      await Notification.create({
        type: 'account_unlocked',
        title: 'Account unlocked by admin',
        message: 'Your account has been unlocked. Please ensure your commissions and fines are paid on time.',
        recipientUser: user._id,
        audience: 'host'
      });
    } catch (_) { /* non-blocking */ }

    return res.json({ success: true, user: { id: user._id, isBlocked: user.isBlocked } });
  } catch (e) {
    console.error('Admin unlock user error:', e);
    return res.status(500).json({ message: 'Failed to unlock user', error: e?.message || String(e) });
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
    const id = req.params.id;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Best-effort: clean up related records could be added here
    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// Add a fine to a user
router.post('/users/:id/fines', requireAdmin, async (req, res) => {
  try {
    const { reason, amount, block, durationDays, durationWeeks, blockedUntil, dueAt, dueInDays, dueInWeeks } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const amt = Number(amount);
    if (!reason || !amt || amt <= 0) {
      return res.status(400).json({ message: 'Valid reason and amount are required' });
    }

    if (!user.fines) user.fines = { totalDue: 0, currency: 'RWF', items: [] };
    let fineDueAt = null;
    if (dueAt) {
      fineDueAt = new Date(dueAt);
    } else if (dueInWeeks) {
      fineDueAt = new Date(Date.now() + (Number(dueInWeeks) || 0) * 7 * 24 * 60 * 60 * 1000);
    } else if (dueInDays) {
      fineDueAt = new Date(Date.now() + (Number(dueInDays) || 0) * 24 * 60 * 60 * 1000);
    }
    user.fines.items.push({ reason: String(reason), amount: amt, dueAt: fineDueAt });
    user.fines.totalDue = Number(user.fines.totalDue || 0) + amt;

    // Optional immediate block
    let blocked = false;
    if (block === true) {
      let until = null;
      if (blockedUntil) {
        until = new Date(blockedUntil);
      } else if (durationWeeks) {
        until = new Date(Date.now() + (Number(durationWeeks) || 0) * 7 * 24 * 60 * 60 * 1000);
      } else if (durationDays) {
        until = new Date(Date.now() + (Number(durationDays) || 0) * 24 * 60 * 60 * 1000);
      }
      user.isBlocked = true;
      user.blockedAt = new Date();
      user.blockedUntil = until || null;
      user.blockReason = reason || user.blockReason || 'Unpaid fine';
      blocked = true;
    }

    await user.save();

    // Notifications
    try {
      await Notification.create({
        type: 'fine_added',
        title: 'Fine added',
        message: `A fine of RWF ${amt.toLocaleString()} was added to your account. Reason: ${reason}.`,
        recipientUser: user._id,
        audience: 'host'
      });
      if (blocked) {
        let msg = 'Your account has been deactivated due to unpaid fine. Please settle your dues.';
        if (user.blockedUntil) msg += ` Punishment ends on ${user.blockedUntil.toLocaleString()}.`;
        await Notification.create({
          type: 'account_blocked',
          title: 'Account Deactivated',
          message: msg,
          recipientUser: user._id,
          audience: 'host'
        });
      }
    } catch (_) {}

    return res.json({ message: blocked ? 'Fine added and user blocked' : 'Fine added', user: { id: user._id, fines: user.fines, isBlocked: user.isBlocked } });
  } catch (error) {
    console.error('Add fine error:', error);
    return res.status(500).json({ message: 'Failed to add fine', error: error.message });
  }
});

// Mark a specific fine as paid
router.post('/users/:id/fines/:fineId/pay', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const fine = user.fines?.items?.id(req.params.fineId);
    if (!fine) return res.status(404).json({ message: 'Fine not found' });
    if (fine.paid) return res.status(400).json({ message: 'Fine already paid' });

    fine.paid = true;
    fine.paidAt = new Date();
    user.fines.totalDue = Math.max(0, Number(user.fines.totalDue || 0) - Number(fine.amount || 0));

    let reactivated = false;
    if (Number(user.fines.totalDue || 0) === 0 && user.isBlocked) {
      user.isBlocked = false;
      user.blockedAt = null;
      user.blockedUntil = null;
      user.blockReason = null;
      reactivated = true;
      try {
        await Notification.create({
          type: 'account_reactivated',
          title: 'Account Reactivated',
          message: 'Your account has been reactivated after settling all dues.',
          recipientUser: user._id,
          audience: 'host'
        });
      } catch (_) {}
    }

    await user.save();
    return res.json({ message: reactivated ? 'Fine paid and account reactivated' : 'Fine marked as paid', user: { id: user._id, fines: user.fines, isBlocked: user.isBlocked } });
  } catch (error) {
    console.error('Mark fine paid error:', error);
    return res.status(500).json({ message: 'Failed to mark fine as paid', error: error.message });
  }
});

// Get users with unpaid commissions (properties + vehicles) (MUST BE BEFORE /users/:id)
router.get('/users/unpaid-commissions', requireAdmin, async (req, res) => {
  try {
    // PROPERTY BOOKINGS
    const unpaidBookings = await Booking.find({
      paymentStatus: 'paid',
      commissionPaid: false,
    })
      .populate('property')
      .populate('guest', 'firstName lastName email');

    const ownerCommissions = {};

    for (const booking of unpaidBookings) {
      if (!booking.property || !booking.property.host) continue;
      const ownerId = booking.property.host.toString();

      if (!ownerCommissions[ownerId]) {
        ownerCommissions[ownerId] = {
          ownerId,
          totalCommission: 0,
          bookings: [],
        };
      }

      ownerCommissions[ownerId].totalCommission += booking.commissionAmount || 0;
      ownerCommissions[ownerId].bookings.push(booking);
    }

    // VEHICLE BOOKINGS (car rentals)
    try {
      const CarRental = require('../tables/carRental');
      const CarRentalBooking = require('../tables/carRentalBooking');

      const unpaidCarBookings = await CarRentalBooking.find({
        commissionPaid: false,
        status: { $in: ['confirmed', 'active', 'completed'] },
      }).populate('car');

      for (const cb of unpaidCarBookings) {
        if (!cb.car || !cb.car.owner) continue;
        const ownerId = cb.car.owner.toString();

        if (!ownerCommissions[ownerId]) {
          ownerCommissions[ownerId] = {
            ownerId,
            totalCommission: 0,
            bookings: [],
            propertyBookings: [],
            vehicleBookings: [],
          };
        }

        const commissionAmount = cb.commissionAmount || 0;
        const commissionRate = cb.commissionRate || 0;
        ownerCommissions[ownerId].totalCommission += commissionAmount;
        ownerCommissions[ownerId].bookings.push(cb);
        ownerCommissions[ownerId].vehicleBookings.push({
          bookingId: cb._id,
          vehicleId: cb.car._id,
          vehicleName: cb.car.vehicleName || `${cb.car.brand || ''} ${cb.car.model || ''}`.trim(),
          amount: commissionAmount,
          rate: commissionRate,
          pickupDate: cb.pickupDate,
          returnDate: cb.returnDate,
          createdAt: cb.createdAt,
        });
      }
    } catch (e) {
      console.error('Unpaid vehicle commissions aggregation failed (non-fatal):', e && e.message);
    }

    const ownerIds = Object.keys(ownerCommissions);
    const owners = ownerIds.length
      ? await User.find({ _id: { $in: ownerIds } }).select('firstName lastName email isBlocked')
      : [];

    const result = owners.map((owner) => ({
      ...owner.toObject(),
      ...ownerCommissions[owner._id.toString()],
    }));

    return res.json({ users: result });
  } catch (error) {
    console.error('Get unpaid commissions error:', error);
    return res.status(500).json({ message: 'Failed to fetch unpaid commissions', error: error.message });
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
            recipientUser: user._id,
            audience: 'host'
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

// Lock property due to unpaid commission (admin only)
router.post('/properties/:id/lock', requireAdmin, async (req, res) => {
  try {
    const Property = require('../tables/property');
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    property.isActive = false;
    await property.save();
    
    // Notify owner
    try {
      await Notification.create({
        type: 'property_locked',
        title: 'Property Locked',
        message: `Your property "${property.title}" has been locked due to unpaid commissions. Please settle your dues to unlock it.`,
        recipientUser: property.host,
        property: property._id,
        audience: 'host'
      });
    } catch (_) {}
    
    res.json({ success: true, property });
  } catch (error) {
    console.error('Lock property error:', error);
    res.status(500).json({ message: 'Failed to lock property', error: error.message });
  }
});

// Unlock property (admin only)
router.post('/properties/:id/unlock', requireAdmin, async (req, res) => {
  try {
    const Property = require('../tables/property');
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    property.isActive = true;
    await property.save();
    
    // Notify owner
    try {
      await Notification.create({
        type: 'property_unlocked',
        title: 'Property Unlocked',
        message: `Your property "${property.title}" has been unlocked and is now available for bookings.`,
        recipientUser: property.host,
        property: property._id,
        audience: 'host'
      });
    } catch (_) {}
    
    res.json({ success: true, property });
  } catch (error) {
    console.error('Unlock property error:', error);
    res.status(500).json({ message: 'Failed to unlock property', error: error.message });
  }
});

// Lock vehicle due to unpaid commission (admin only)
router.post('/vehicles/:id/lock', requireAdmin, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const vehicle = await CarRental.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    
    vehicle.isAvailable = false;
    await vehicle.save();
    
    // Notify owner
    try {
      await Notification.create({
        type: 'vehicle_locked',
        title: 'Vehicle Locked',
        message: `Your vehicle "${vehicle.vehicleName || `${vehicle.brand} ${vehicle.model}`}" has been locked due to unpaid commissions. Please settle your dues to unlock it.`,
        recipientUser: vehicle.owner,
        audience: 'host'
      });
    } catch (_) {}
    
    res.json({ success: true, vehicle });
  } catch (error) {
    console.error('Lock vehicle error:', error);
    res.status(500).json({ message: 'Failed to lock vehicle', error: error.message });
  }
});

// Unlock vehicle (admin only)
router.post('/vehicles/:id/unlock', requireAdmin, async (req, res) => {
  try {
    const CarRental = require('../tables/carRental');
    const vehicle = await CarRental.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    
    vehicle.isAvailable = true;
    await vehicle.save();
    
    // Notify owner
    try {
      await Notification.create({
        type: 'vehicle_unlocked',
        title: 'Vehicle Unlocked',
        message: `Your vehicle "${vehicle.vehicleName || `${vehicle.brand} ${vehicle.model}`}" has been unlocked and is now available for bookings.`,
        recipientUser: vehicle.owner,
        audience: 'host'
      });
    } catch (_) {}
    
    res.json({ success: true, vehicle });
  } catch (error) {
    console.error('Unlock vehicle error:', error);
    res.status(500).json({ message: 'Failed to unlock vehicle', error: error.message });
    }
});

// Reactivate user account
router.post('/users/:id/reactivate', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isBlocked = false;
        user.blockedAt = null;
        user.blockedUntil = null;
        user.blockReason = null;
        await user.save();

        // Notify the user
        await Notification.create({
            type: 'account_reactivated',
            title: 'Account Reactivated',
            message: 'Your account has been reactivated. You can now access your account features.',
            recipientUser: user._id,
            audience: 'host'
        });

        // Reactivate any workers associated with this owner (best-effort)
        try {
            const Worker = require('../tables/worker');
            await Worker.updateMany({ employerId: user._id }, { $set: { status: 'active', isActive: true } });
        } catch (wErr) {
            // non-fatal
            console.warn('Failed to reactivate workers for user', req.params.id, wErr && wErr.message);
        }

        return res.json({ success: true, message: 'User account reactivated successfully', user: { ...user.toObject(), passwordHash: undefined } });
    } catch (error) {
        console.error('Reactivate user error:', error);
        return res.status(500).json({ message: 'Failed to reactivate user', error: error.message });
    }
});

// GET /api/admin/commission-upgrade-logs
// Get all commission upgrade logs with filtering options
router.get('/commission-upgrade-logs', requireAdmin, async (req, res) => {
  try {
    const { 
      itemType, 
      itemId, 
      performedBy, 
      startDate, 
      endDate,
      page = 1,
      limit = 50 
    } = req.query;

    const query = {};
    
    if (itemType) {
      query.itemType = itemType;
    }
    
    if (itemId) {
      query.itemId = itemId;
    }
    
    if (performedBy) {
      query.performedBy = performedBy;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const logs = await CommissionUpgradeLog.find(query)
      .populate('performedBy', 'firstName lastName email')
      .populate('oldCommissionLevel', 'name')
      .populate('newCommissionLevel', 'name directRate onlineRate isPremium')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await CommissionUpgradeLog.countDocuments(query);

    return res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (e) {
    console.error('Get commission upgrade logs error:', e);
    return res.status(500).json({ message: 'Failed to fetch commission upgrade logs', error: e?.message || String(e) });
  }
});

// GET /api/admin/commission-upgrade-logs/stats
// Get statistics about commission upgrades
router.get('/commission-upgrade-logs/stats', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
    }

    const totalUpgrades = await CommissionUpgradeLog.countDocuments(dateQuery);
    
    const upgradesByType = await CommissionUpgradeLog.aggregate([
      { $match: dateQuery },
      { $group: { _id: '$itemType', count: { $sum: 1 } } }
    ]);

    const upgradesByLevel = await CommissionUpgradeLog.aggregate([
      { $match: dateQuery },
      { $group: { _id: '$newCommissionLevel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recentUpgrades = await CommissionUpgradeLog.find(dateQuery)
      .populate('performedBy', 'firstName lastName email')
      .populate('newCommissionLevel', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('itemType itemName newCommissionLevelName performedBy createdAt')
      .lean();

    return res.json({
      totalUpgrades,
      upgradesByType: upgradesByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topLevels: upgradesByLevel,
      recentUpgrades
    });
  } catch (e) {
    console.error('Get commission upgrade stats error:', e);
    return res.status(500).json({ message: 'Failed to fetch commission upgrade stats', error: e?.message || String(e) });
  }
});

module.exports = router;
