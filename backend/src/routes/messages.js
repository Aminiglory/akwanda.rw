const express = require('express');
const router = express.Router();
const Message = require('../tables/message');
const Booking = require('../tables/booking');
const Notification = require('../tables/notification');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

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

// Set up uploads folder and storage
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// Upload attachments (images/docs) for messages
router.post('/upload', requireAuth, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const attachments = req.files.map(f => ({
      url: `/uploads/${path.basename(f.path)}`,
      name: f.originalname,
      size: f.size,
      mime: f.mimetype
    }));
    res.json({ success: true, attachments });
  } catch (e) {
    res.status(500).json({ message: 'Failed to upload files' });
  }
});

// Threads list (generic): recent conversation partners and last message
router.get('/threads', requireAuth, async (req, res) => {
    try {
        // Unread counts grouped by sender (other user)
        const unreadAgg = await Message.aggregate([
            { $match: { recipient: req.user.id, isRead: false } },
            { $group: { _id: '$sender', count: { $sum: 1 } } }
        ]);
        const unreadMap = {};
        for (const r of unreadAgg) unreadMap[String(r._id)] = r.count;

        // Recent messages with nested booking.property populated for titles
        const msgs = await Message.find({ $or: [{ sender: req.user.id }, { recipient: req.user.id }] })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('sender', 'firstName lastName')
            .populate('recipient', 'firstName lastName')
            .populate({ path: 'booking', populate: { path: 'property', select: 'title' } });

        const seen = new Set();
        const threads = [];
        for (const m of msgs) {
            const selfId = String(req.user.id);
            const senderId = m.sender && (m.sender._id || m.sender);
            const recipientId = m.recipient && (m.recipient._id || m.recipient);
            const other = String(senderId) === selfId ? m.recipient : m.sender;
            const key = String(other._id || other);
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);

            // Context
            let context = undefined;
            if (m.booking) {
                const b = m.booking;
                const propertyTitle = (b.property && b.property.title) ? String(b.property.title) : undefined;
                context = { bookingId: String(b._id || b), propertyTitle };
            } else if (m.carBooking) {
                context = { carBookingId: String(m.carBooking) };
            }

            threads.push({
                userId: key,
                name: `${other.firstName || ''} ${other.lastName || ''}`.trim() || 'User',
                lastMessage: { text: m.message, createdAt: m.createdAt },
                unreadCount: unreadMap[key] || 0,
                context
            });
        }
        res.json({ threads });
    } catch (e) {
        res.status(500).json({ message: 'Failed to load threads' });
    }
});

// Message history between current user and another, optional booking context
router.get('/history', requireAuth, async (req, res) => {
    try {
        const { userId, bookingId, carBookingId } = req.query;
        if (!userId) return res.status(400).json({ message: 'userId required' });
        const q = {
            $and: [
                { $or: [ { sender: req.user.id, recipient: userId }, { sender: userId, recipient: req.user.id } ] }
            ]
        };
        if (bookingId) q.$and.push({ booking: bookingId });
        if (carBookingId) q.$and.push({ carBooking: carBookingId });
        const list = await Message.find(q)
            .sort({ createdAt: 1 })
            .populate({ path: 'replyTo', select: 'sender message', populate: { path: 'sender', select: 'firstName lastName' } });
        res.json({ messages: list });
    } catch (e) {
        res.status(500).json({ message: 'Failed to load history' });
    }
});

// Generic send endpoint (supports property booking or car booking contexts)
router.post('/send', requireAuth, async (req, res) => {
    try {
        const { to, text, bookingId, carBookingId, attachments, replyTo } = req.body || {};
        if (!to || !text || !text.trim()) return res.status(400).json({ message: 'Invalid payload' });

        let allowed = false;
        let context = {};
        if (bookingId) {
            const book = await Booking.findById(bookingId).populate('property');
            if (!book) return res.status(404).json({ message: 'Booking not found' });
            const isGuest = String(book.guest) === String(req.user.id);
            const isOwner = book.property && String(book.property.host) === String(req.user.id);
            allowed = isGuest || isOwner || req.user.userType === 'admin';
            context.booking = book._id;
        }
        if (carBookingId && !allowed) {
            const CarRentalBooking = require('../tables/carRentalBooking');
            const CarRental = require('../tables/carRental');
            const cb = await CarRentalBooking.findById(carBookingId);
            if (!cb) return res.status(404).json({ message: 'Car booking not found' });
            const car = await CarRental.findById(cb.car).select('owner');
            const isGuest = String(cb.guest) === String(req.user.id);
            const isOwner = car && String(car.owner) === String(req.user.id);
            allowed = isGuest || isOwner || req.user.userType === 'admin';
            context.carBooking = cb._id;
        }
        if (!bookingId && !carBookingId) {
            // Allow direct messaging (fallback) between any two authenticated users
            allowed = true;
        }
        if (!allowed) return res.status(403).json({ message: 'Unauthorized' });

        const newMessage = await Message.create({
            booking: context.booking,
            carBooking: context.carBooking,
            sender: req.user.id,
            recipient: to,
            message: text.trim(),
            replyTo: replyTo || undefined,
            attachments: Array.isArray(attachments) ? attachments.map(a => ({
              url: a.url,
              name: a.name,
              size: a.size,
              mime: a.mime
            })) : []
        });

        // Socket events
        try {
            const io = req.app.get('io');
            if (io) {
                // Emit in a flattened structure the frontend expects
                const payload = {
                    from: String(newMessage.sender),
                    to: String(newMessage.recipient),
                    text: newMessage.message,
                    attachments: newMessage.attachments || [],
                    createdAt: newMessage.createdAt,
                    bookingId: context.booking ? String(context.booking) : undefined,
                    carBookingId: context.carBooking ? String(context.carBooking) : undefined,
                    replyTo: newMessage.replyTo ? String(newMessage.replyTo) : undefined
                };
                if (context.booking) io.to(`booking:${String(context.booking)}`).emit('message:new', payload);
                if (context.carBooking) io.to(`carBooking:${String(context.carBooking)}`).emit('message:new', payload);
                io.to(`user:${String(to)}`).emit('message:new', payload);
            }
        } catch (_) {}

        res.status(201).json({ message: newMessage });
    } catch (e) {
        res.status(500).json({ message: 'Failed to send message' });
    }
});

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
