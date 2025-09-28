const { Router } = require('express');
const jwt = require('jsonwebtoken');

const router = Router();
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

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Name, email, subject, and message are required' });
        }

        // Generate ticket number
        const ticketNumber = `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Create ticket object
        const ticket = {
            ticketNumber,
            name,
            email,
            phone: phone || null,
            bookingId: bookingId || null,
            subject,
            category: category || 'general',
            priority: priority || 'medium',
            message,
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            responses: []
        };

        // In a real implementation, you would save this to a database
        // For now, we'll just return the ticket details
        res.json({
            success: true,
            message: 'Support ticket created successfully',
            ticket,
            ticketNumber
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

        // In a real implementation, you would fetch from database
        const tickets = [
            {
                ticketNumber: 'TKT123456789',
                name: 'John Doe',
                email: 'john@example.com',
                subject: 'Booking Issue',
                category: 'booking',
                priority: 'high',
                status: 'open',
                createdAt: new Date().toISOString()
            }
        ];

        res.json({
            success: true,
            tickets
        });

    } catch (error) {
        console.error('Support tickets fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch support tickets', error: error.message });
    }
});

// Get ticket by ID
router.get('/tickets/:ticketNumber', async (req, res) => {
    try {
        const { ticketNumber } = req.params;

        // In a real implementation, you would fetch from database
        const ticket = {
            ticketNumber,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+250 788 123 456',
            bookingId: 'AKW123456',
            subject: 'Booking Issue',
            category: 'booking',
            priority: 'high',
            status: 'open',
            message: 'I am having trouble with my booking...',
            createdAt: new Date().toISOString(),
            responses: []
        };

        res.json({
            success: true,
            ticket
        });

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

        // In a real implementation, you would update in database
        res.json({
            success: true,
            message: 'Ticket status updated successfully',
            ticketNumber,
            status,
            response
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

        // In a real implementation, you would add response to database
        res.json({
            success: true,
            message: 'Response added successfully',
            ticketNumber,
            response: {
                message,
                isAdmin: isAdmin || false,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Support ticket response error:', error);
        res.status(500).json({ message: 'Failed to add response', error: error.message });
    }
});

module.exports = router;
