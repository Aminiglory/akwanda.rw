const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');

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

// MTN Mobile Money Payment
router.post('/mtn-mobile-money', requireAuth, async (req, res) => {
    try {
        const { phoneNumber, amount, description, bookingId, customerName, customerEmail } = req.body;

        // Validate required fields
        if (!phoneNumber || !amount || !description) {
            return res.status(400).json({ message: 'Phone number, amount, and description are required' });
        }

        // Validate phone number format (Rwanda)
        const rwandaPhoneRegex = /^(\+250|250|0)?[0-9]{9}$/;
        if (!rwandaPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
            return res.status(400).json({ message: 'Invalid Rwanda phone number format' });
        }

        // Validate amount
        if (Number(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        // Simulate MTN Mobile Money API call
        // In a real implementation, you would integrate with MTN's actual API
        const transactionId = `MTN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        let booking;
        if (bookingId) {
            booking = await Booking.findById(bookingId).populate('property');
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            // Only the guest who created the booking can pay
            if (String(booking.guest) !== String(req.user.id) && req.user.userType !== 'admin') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            // Update booking as paid via MTN
            booking.paymentMethod = 'mtn_mobile_money';
            booking.paymentStatus = 'paid';
            booking.transactionId = transactionId;
            // Confirm booking on successful payment
            booking.status = 'confirmed';
            await booking.save();
        }

        // Mock successful payment response
        res.json({
            success: true,
            transactionId,
            message: 'Payment processed successfully',
            paymentDetails: {
                phoneNumber,
                amount: Number(amount),
                description,
                bookingId,
                customerName,
                customerEmail,
                timestamp: new Date().toISOString(),
                status: 'completed'
            },
            booking: booking || null
        });

    } catch (error) {
        console.error('MTN Mobile Money payment error:', error);
        res.status(500).json({ message: 'Payment processing failed', error: error.message });
    }
});

// Get payment status
router.get('/status/:transactionId', requireAuth, async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        // In a real implementation, you would check with MTN's API
        // For now, return a mock status
        res.json({
            transactionId,
            status: 'completed',
            message: 'Payment completed successfully'
        });
    } catch (error) {
        console.error('Payment status check error:', error);
        res.status(500).json({ message: 'Failed to check payment status', error: error.message });
    }
});

module.exports = router;
