const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../tables/notification');

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

    const count = await Notification.countDocuments({
      recipientUser: req.user.id,
      isRead: false,
      type: { $in: ['booking_confirmed', 'booking_created', 'review_reply'] },
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

    const list = await Notification.find({
      recipientUser: req.user.id,
      type: { $in: ['booking_confirmed', 'booking_created', 'review_reply'] },
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
