const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../tables/notification');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const { ensurePlatformRatingReminder } = require('../utils/platformRatingReminders');

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

async function ensureStayReviewReminders(userId) {
  try {
    if (!userId) return;

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);

    const ended = await Booking.find({
      guest: userId,
      checkOut: { $lte: now, $gte: cutoff },
      status: { $nin: ['cancelled'] },
    })
      .select('_id property bookingNumber reviewPin checkOut')
      .lean();

    if (!ended || ended.length === 0) return;

    const propertyIds = Array.from(new Set(ended.map(b => String(b.property)).filter(Boolean)));
    const props = propertyIds.length
      ? await Property.find({ _id: { $in: propertyIds } }).select('_id title').lean()
      : [];
    const titleById = new Map((props || []).map(p => [String(p._id), String(p.title || '')]));

    // Load properties that already have a review for this booking by this guest.
    // We store reviews inside Property.ratings with a booking reference.
    const reviewedPropertyIds = new Set();
    if (propertyIds.length) {
      const reviewedProps = await Property.find({
        _id: { $in: propertyIds },
        'ratings.booking': { $in: ended.map(b => b._id) },
        'ratings.guest': userId,
      })
        .select('_id ratings.booking ratings.guest')
        .lean();
      for (const p of reviewedProps || []) {
        reviewedPropertyIds.add(String(p._id));
      }
    }

    // Avoid duplicates: if we already have a reminder for (userId + bookingId) then don't create again.
    const existing = await Notification.find({
      recipientUser: userId,
      type: 'review_reminder',
      booking: { $in: ended.map(b => b._id) },
    })
      .select('booking')
      .lean();
    const existingBookingIds = new Set((existing || []).map(n => String(n.booking)));

    const toCreate = [];
    for (const b of ended) {
      if (!b || !b._id) continue;
      if (existingBookingIds.has(String(b._id))) continue;
      if (reviewedPropertyIds.has(String(b.property))) continue;

      const propTitle = titleById.get(String(b.property)) || 'your stay';
      const bookingNumber = String(b.bookingNumber || '').trim();
      const pin = String(b.reviewPin || '').trim();

      // Include the same parsing markers the frontend already understands.
      // (Notifications.jsx extracts Booking number / Review PIN from the message.)
      const details = [
        bookingNumber ? `Booking number: ${bookingNumber}.` : '',
        pin ? `Review PIN: ${pin}.` : '',
      ].filter(Boolean).join(' ');

      toCreate.push({
        type: 'review_reminder',
        title: 'Rate your stay',
        message: `Your stay at ${propTitle} has ended. Please leave a review. ${details}`.trim(),
        booking: b._id,
        property: b.property,
        recipientUser: userId,
        audience: 'guest',
      });
    }

    if (toCreate.length) {
      await Notification.insertMany(toCreate, { ordered: false });
    }
  } catch (e) {
    // Non-blocking
    console.error('ensureStayReviewReminders error:', e);
  }
}

// Unread count for current user (guest/general side)
// Only count guest-facing booking confirmation notifications
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    if (req.user.userType === 'admin') {
      const count = await Notification.countDocuments({
        recipientUser: req.user.id,
        isRead: false,
      });
      return res.json({ count });
    }

    await ensureStayReviewReminders(req.user.id);
    await ensurePlatformRatingReminder(req.user.id, req.user.userType);

    const count = await Notification.countDocuments({
      recipientUser: req.user.id,
      isRead: false,
      type: { $in: ['booking_confirmed', 'booking_created', 'review_reply', 'review_reminder', 'platform_rating_reminder'] },
      $or: [
        { audience: { $exists: false } },
        { audience: { $in: ['guest','both'] } }
      ]
    });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get unread count' });
  }
});

// Mark a single notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const r = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientUser: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// List notifications for current user (guest/general side)
// Only show guest-facing booking confirmation notifications
router.get('/list', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

    if (req.user.userType === 'admin') {
      const list = await Notification.find({
        recipientUser: req.user.id,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return res.json({ notifications: list });
    }

    await ensureStayReviewReminders(req.user.id);
    await ensurePlatformRatingReminder(req.user.id, req.user.userType);

    const list = await Notification.find({
      recipientUser: req.user.id,
      type: { $in: ['booking_confirmed', 'booking_created', 'review_reply', 'review_reminder', 'platform_rating_reminder'] },
      $or: [
        { audience: { $exists: false } },
        { audience: { $in: ['guest','both'] } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ notifications: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get notifications' });
  }
});

// Mark all as read for current user
router.patch('/mark-read', requireAuth, async (req, res) => {
  try {
    const r = await Notification.updateMany(
      { recipientUser: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ updated: r.modifiedCount || 0 });
  } catch (e) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// Delete a single notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const n = await Notification.findOneAndDelete({ _id: req.params.id, recipientUser: req.user.id });
    if (!n) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

// Clear all read notifications
router.delete('/clear/read', requireAuth, async (req, res) => {
  try {
    const r = await Notification.deleteMany({ recipientUser: req.user.id, isRead: true });
    res.json({ deleted: r.deletedCount || 0 });
  } catch (e) {
    res.status(500).json({ message: 'Failed to clear read notifications' });
  }
});

module.exports = router;
