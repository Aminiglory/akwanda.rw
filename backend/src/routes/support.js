const { Router } = require('express');
const jwt = require('jsonwebtoken');
const SupportTicket = require('../tables/supportTicket');
const Notification = require('../tables/notification');
const User = require('../tables/user');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function normalizeEmail(v) {
    return String(v || '').trim().toLowerCase();
}

function isValidEmail(v) {
    const s = String(v || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizePhone(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    return s.replace(/[\s()-]/g, '');
}

function isValidPhone(v) {
    if (!v) return true;
    const s = normalizePhone(v);
    return /^\+?[0-9]{9,15}$/.test(s);
}

async function generateUniqueTicketNumber() {
    for (let i = 0; i < 5; i += 1) {
        const ticketNumber = `TKT${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
        const exists = await SupportTicket.exists({ ticketNumber });
        if (!exists) return ticketNumber;
    }
    return `TKT${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}

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
// help
// Create support ticket
router.post('/tickets', async (req, res) => {
    try {
        const { 
            name, 
            email, 
            phone, 
            bookingId, 
            subject, 
            category, 
            priority, 
            message 
        } = req.body;

        const cleanName = String(name || '').trim();
        const cleanEmail = normalizeEmail(email);
        const cleanSubject = String(subject || '').trim();
        const cleanMessage = String(message || '').trim();
        const cleanPhone = normalizePhone(phone);

        if (!cleanName || !cleanEmail || !cleanSubject || !cleanMessage) {
            return res.status(400).json({ message: 'Name, email, subject, and message are required' });
        }
        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({ message: 'Invalid email address' });
        }
        if (!isValidPhone(cleanPhone)) {
            return res.status(400).json({ message: 'Invalid phone number' });
        }

        // If the user is logged in, attach createdBy
        let createdBy = null;
        try {
            const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
            if (token) {
                const u = jwt.verify(token, JWT_SECRET);
                createdBy = u?.id || null;
            }
        } catch (_) {
            createdBy = null;
        }

        const ticketNumber = await generateUniqueTicketNumber();
        const ack = `Hi ${cleanName || 'there'}, thanks for contacting AKWANDA.rw support. We've received your ticket (${ticketNumber}). Our team will get back to you as soon as possible. If this is urgent, call +250 788 123 456.`;

        const doc = await SupportTicket.create({
            ticketNumber,
            createdBy,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone || null,
            bookingId: String(bookingId || '').trim() || null,
            subject: cleanSubject,
            category: category || 'general',
            priority: priority || 'medium',
            message: cleanMessage,
            status: 'open',
            responses: [
                {
                    message: ack,
                    isAdmin: true,
                    auto: true,
                }
            ]
        });

        // Notify admins (in-app) so support can act
        try {
            const admins = await User.find({ userType: 'admin' }).select('_id').lean();
            if (admins && admins.length > 0) {
                const io = req.app?.get?.('io');
                const notifDocs = admins.map(a => ({
                    type: 'support_ticket_created',
                    title: 'New support ticket',
                    message: `New ticket ${ticketNumber}: ${cleanSubject}`,
                    recipientUser: a._id,
                    audience: 'host'
                }));
                await Notification.insertMany(notifDocs);
                if (io) {
                    admins.forEach(a => {
                        io.to(`user:${String(a._id)}`).emit('notification', {
                            type: 'support_ticket_created',
                            title: 'New support ticket',
                            message: `New ticket ${ticketNumber}: ${cleanSubject}`,
                        });
                    });
                }
            }
        } catch (_) {}

        res.status(201).json({
            success: true,
            message: 'Support ticket created successfully',
            ticketNumber: doc.ticketNumber,
            ticket: {
                ticketNumber: doc.ticketNumber,
                status: doc.status,
                createdAt: doc.createdAt,
            }
        });

    } catch (error) {
        console.error('Support ticket creation error:', error);
        res.status(500).json({ message: 'Failed to create support ticket', error: error.message });
    }
});

// Get support tickets (admin only)
router.get('/tickets', requireAuth, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const q = String(req.query.q || '').trim();
        const filter = {};
        if (req.query.status) filter.status = String(req.query.status);
        if (req.query.category) filter.category = String(req.query.category);
        if (req.query.priority) filter.priority = String(req.query.priority);
        if (q) {
            filter.$or = [
                { ticketNumber: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
                { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
                { subject: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
                { message: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
            ];
        }

        const [tickets, total] = await Promise.all([
            SupportTicket.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            SupportTicket.countDocuments(filter)
        ]);

        res.json({ success: true, tickets, total, page, limit });

    } catch (error) {
        console.error('Support tickets fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch support tickets', error: error.message });
    }
});

// Get ticket by ID
router.get('/tickets/:ticketNumber', requireAuth, async (req, res) => {
    try {
        const { ticketNumber } = req.params;

        const ticket = await SupportTicket.findOne({ ticketNumber }).lean();
        if (!ticket) return res.status(404).json({ message: 'Not found' });

        const isAdmin = req.user.userType === 'admin';
        const isOwner = ticket.createdBy && String(ticket.createdBy) === String(req.user.id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.json({ success: true, ticket });

    } catch (error) {
        console.error('Support ticket fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch support ticket', error: error.message });
    }
});

// Update ticket status (admin only)
router.put('/tickets/:ticketNumber/status', requireAuth, async (req, res) => {
    try {
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { ticketNumber } = req.params;
        const { status, response } = req.body;

        if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const update = { $set: { status } };
        if (response && String(response).trim()) {
            update.$push = {
                responses: {
                    message: String(response).trim(),
                    isAdmin: true,
                    responderUser: req.user.id,
                }
            };
        }

        const ticket = await SupportTicket.findOneAndUpdate(
            { ticketNumber },
            update,
            { new: true }
        );
        if (!ticket) return res.status(404).json({ message: 'Not found' });

        res.json({
            success: true,
            message: 'Ticket status updated successfully',
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
        });

    } catch (error) {
        console.error('Support ticket update error:', error);
        res.status(500).json({ message: 'Failed to update support ticket', error: error.message });
    }
});

// Add response to ticket
router.post('/tickets/:ticketNumber/response', requireAuth, async (req, res) => {
    try {
        const { ticketNumber } = req.params;
        const { message, isAdmin } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Response message is required' });
        }

        const ticket = await SupportTicket.findOne({ ticketNumber });
        if (!ticket) return res.status(404).json({ message: 'Not found' });

        const wantsAdmin = !!isAdmin;
        const userIsAdmin = req.user.userType === 'admin';
        const userIsOwner = ticket.createdBy && String(ticket.createdBy) === String(req.user.id);

        if (wantsAdmin && !userIsAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        if (!userIsAdmin && !userIsOwner) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        ticket.responses.push({
            message: String(message).trim(),
            isAdmin: wantsAdmin ? true : userIsAdmin,
            responderUser: req.user.id,
        });
        ticket.updatedAt = new Date();
        await ticket.save();

        res.json({
            success: true,
            message: 'Response added successfully',
            ticketNumber,
        });

    } catch (error) {
        console.error('Support ticket response error:', error);
        res.status(500).json({ message: 'Failed to add response', error: error.message });
    }
});

module.exports = router;
