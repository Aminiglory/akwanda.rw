const express = require('express');
const router = express.Router();
const Message = require('../tables/message');
const Booking = require('../tables/booking');
const Notification = require('../tables/notification');
const jwt = require('jsonwebtoken');

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

// Get messages for a booking
router.get('/booking/:bookingId', requireAuth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId).populate('property');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Check if user is guest or property owner
        const isGuest = String(booking.guest) === String(req.user.id);
        const isOwner = booking.property && String(booking.property.host) === String(req.user.id);
        const isAdmin = req.user.userType === 'admin';

        if (!isGuest && !isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const messages = await Message.find({ booking: req.params.bookingId })
            .populate('sender', 'firstName lastName')
            .populate('recipient', 'firstName lastName')
            .sort({ createdAt: 1 });

        res.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
    }
});

// Get unread count grouped by booking for the current user
router.get('/unread-by-booking', requireAuth, async (req, res) => {
    try {
        const pipeline = [
            { $match: { recipient: req.user.id, isRead: false } },
            { $group: { _id: '$booking', count: { $sum: 1 } } }
        ];

        const results = await Message.aggregate(pipeline);
        const map = {};
        for (const r of results) {
            map[String(r._id)] = r.count;
        }
        res.json({ unreadByBooking: map });
    } catch (error) {
        console.error('Get unread by booking error:', error);
        res.status(500).json({ message: 'Failed to get unread by booking', error: error.message });
    }
});

// Send a message
router.post('/booking/:bookingId', requireAuth, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }

        const booking = await Booking.findById(req.params.bookingId).populate('property');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Check if user is guest or property owner
        const isGuest = String(booking.guest) === String(req.user.id);
        const isOwner = booking.property && String(booking.property.host) === String(req.user.id);

        if (!isGuest && !isOwner) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Determine recipient
        const recipientId = isGuest ? booking.property.host : booking.guest;

        const newMessage = await Message.create({
            booking: req.params.bookingId,
            sender: req.user.id,
            recipient: recipientId,
            message: message.trim()
        });

        await newMessage.populate('sender', 'firstName lastName');
        await newMessage.populate('recipient', 'firstName lastName');

        // Create notification for recipient
        await Notification.create({
            type: 'new_message',
            title: 'New Message',
            message: `You have a new message about booking ${booking.confirmationCode}`,
            booking: booking._id,
            recipientUser: recipientId
        });

        // Socket.IO: emit to booking room and recipient's room
        try {
            const io = req.app.get('io');
            if (io) {
                const payload = { 
                    bookingId: String(booking._id), 
                    message: newMessage 
                };
                io.to(`booking:${String(booking._id)}`).emit('message:new', payload);
                io.to(`user:${String(recipientId)}`).emit('message:new', payload);
            }
        } catch (_) {}

        res.status(201).json({ message: newMessage });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
});

// Mark messages as read
router.patch('/booking/:bookingId/read', requireAuth, async (req, res) => {
    try {
        const result = await Message.updateMany(
            {
                booking: req.params.bookingId,
                recipient: req.user.id,
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );
        // Socket.IO: notify booking room that recipient read
        try {
            const io = req.app.get('io');
            if (io) {
                io.to(`booking:${String(req.params.bookingId)}`).emit('message:read', { 
                    bookingId: String(req.params.bookingId), 
                    userId: req.user.id 
                });
            }
        } catch (_) {}

        res.json({ success: true, message: 'Messages marked as read', updated: result.modifiedCount });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Failed to mark messages as read', error: error.message });
    }
});

// Get unread message count
router.get('/unread-count', requireAuth, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            recipient: req.user.id,
            isRead: false
        });

        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: 'Failed to get unread count', error: error.message });
    }
});

module.exports = router;
