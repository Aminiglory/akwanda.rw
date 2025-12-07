const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Booking = require('../tables/booking');
const Notification = require('../tables/notification');
const User = require('../tables/user');

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
        const { phoneNumber, amount, description, bookingId, customerName, customerEmail, settleFines } = req.body;

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
            // Set to awaiting confirmation after payment is completed
            if (booking.status !== 'cancelled' && booking.status !== 'ended') {
                booking.status = 'awaiting';
            }
            await booking.save();

            // Notify property owner to confirm the paid booking
            try {
                if (booking.property?.host) {
                    await Notification.create({
                        type: 'booking_paid',
                        title: 'Booking paid - awaiting your confirmation',
                        message: `A booking has been paid and is awaiting your confirmation.`,
                        booking: booking._id,
                        property: booking.property._id,
                        recipientUser: booking.property.host,
                        audience: 'host'
                    });
                    // Also notify admin and owner that a commission is due
                    await Notification.create({
                        type: 'commission_due',
                        title: 'Commission due',
                        message: `A commission is due for a paid booking.`,
                        booking: booking._id,
                        property: booking.property._id,
                        recipientUser: null,
                        audience: 'both'
                    });
                    await Notification.create({
                        type: 'commission_due',
                        title: 'Commission due',
                        message: `Commission will be deducted according to policy.`,
                        booking: booking._id,
                        property: booking.property._id,
                        recipientUser: booking.property.host,
                        audience: 'host'
                    });
                }
            } catch (_) { /* ignore */ }
        }

        // Optional: settle outstanding fines for the authenticated user
        let finesSettlement = null;
        if (settleFines === true) {
            try {
                const user = await User.findById(req.user.id);
                if (user && user.fines && Number(user.fines.totalDue) > 0) {
                    let remaining = Number(amount);
                    // Mark unpaid fine items as paid FIFO until amount is exhausted
                    if (Array.isArray(user.fines.items)) {
                        for (const item of user.fines.items) {
                            if (remaining <= 0) break;
                            if (!item.paid) {
                                const payNow = Math.min(remaining, Number(item.amount || 0));
                                if (payNow > 0) {
                                    item.paid = true;
                                    item.paidAt = new Date();
                                    remaining -= payNow;
                                }
                            }
                        }
                    }
                    const newTotal = Math.max(0, Number(user.fines.totalDue || 0) - Number(amount));
                    user.fines.totalDue = newTotal;

                    // Auto-unblock when fully cleared
                    let reactivated = false;
                    if (newTotal === 0 && user.isBlocked) {
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
                    finesSettlement = { applied: true, remainingAmount: Math.max(0, remaining), reactivated, totalDue: user.fines.totalDue };
                } else {
                    finesSettlement = { applied: false, reason: 'No fines or user not found' };
                }
            } catch (e) {
                finesSettlement = { applied: false, error: e?.message || String(e) };
            }
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
