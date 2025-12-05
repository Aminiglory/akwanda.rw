const { Router } = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Notification = require('../tables/notification');
const User = require('../tables/user');
const DuesLedger = require('../tables/duesLedger');

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

// Commission + fines summary for current owner
router.get('/summary', requireAuth, async (req, res) => {
  try {
    // Sum unpaid commissions for this owner's properties
    const unpaid = await Booking.aggregate([
      { $match: { paymentStatus: 'paid', commissionPaid: false, status: { $in: ['confirmed','ended'] } } },
      { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'prop' } },
      { $unwind: '$prop' },
      { $match: { 'prop.host': new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
    ]);
    const commissionsDue = unpaid.length ? Number(unpaid[0].total || 0) : 0;
    const commissionCount = unpaid.length ? Number(unpaid[0].count || 0) : 0;

    // Fines from user profile
    const user = await User.findById(req.user.id).select('fines isBlocked limitedAccess');
    const finesDue = Number(user?.fines?.totalDue || 0);
    const totalDue = commissionsDue + finesDue;
    const minimumPartial = totalDue > 0 ? Math.ceil(totalDue / 2) : 0;
    return res.json({ commissionsDue, commissionCount, finesDue, totalDue, minimumPartial, isBlocked: !!user?.isBlocked, limitedAccess: !!user?.limitedAccess });
  } catch (e) {
    console.error('Billing summary error:', e);
    return res.status(500).json({ message: 'Failed to load billing summary' });
  }
});

// Admin: generate monthly commission dues per owner
// POST /api/billing/monthly/generate?year=YYYY&month=MM (1-12). Defaults to previous month.
router.post('/monthly/generate', requireAdmin, async (req, res) => {
  try {
    let { year, month } = req.query;
    const now = new Date();
    if (!year || !month) {
      // Default: previous month
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      year = d.getFullYear();
      month = d.getMonth() + 1; // 1-12
    } else {
      year = Number(year);
      month = Number(month);
    }
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid year or month' });
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

    // Find commissions per owner for that month
    const agg = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: periodStart, $lte: periodEnd },
          status: { $in: ['confirmed', 'ended'] },
          paymentStatus: 'paid',
          commissionAmount: { $gt: 0 }
        }
      },
      { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'prop' } },
      { $unwind: '$prop' },
      {
        $group: {
          _id: '$prop.host',
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);

    const dueDate = periodEnd;
    const graceEndDate = new Date(dueDate.getTime() + 15 * 24 * 60 * 60 * 1000);

    let created = 0;
    let updated = 0;

    for (const row of agg) {
      const ownerId = row._id;
      const amount = Number(row.totalCommission || 0);
      if (!ownerId || !amount || amount <= 0) continue;

      const existing = await DuesLedger.findOne({
        user: ownerId,
        type: 'commission',
        periodYear: year,
        periodMonth: month
      });

      if (existing) {
        existing.amount = amount;
        existing.dueDate = dueDate;
        existing.graceEndDate = graceEndDate;
        await existing.save();
        updated++;
      } else {
        await DuesLedger.create({
          user: ownerId,
          type: 'commission',
          source: 'property',
          amount,
          currency: 'RWF',
          status: 'unpaid',
          periodYear: year,
          periodMonth: month,
          dueDate,
          graceEndDate,
          description: `Monthly commission for ${year}-${String(month).padStart(2, '0')}`
        });
        created++;
      }
    }

    return res.json({
      success: true,
      year,
      month,
      owners: agg.length,
      created,
      updated
    });
  } catch (e) {
    console.error('Generate monthly dues error:', e);
    return res.status(500).json({ message: 'Failed to generate monthly dues' });
  }
});

// Admin: run monthly commission reminders within grace period
// POST /api/billing/monthly/run-reminders
router.post('/monthly/run-reminders', requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const dues = await DuesLedger.find({
      type: 'commission',
      status: { $in: ['unpaid', 'partial'] },
      dueDate: { $lte: endOfDay },
      graceEndDate: { $gte: startOfDay }
    }).populate('user');

    let notified = 0;

    for (const d of dues) {
      // Avoid sending multiple reminders the same day
      if (d.lastReminderAt) {
        const last = new Date(d.lastReminderAt);
        if (
          last.getFullYear() === today.getFullYear() &&
          last.getMonth() === today.getMonth() &&
          last.getDate() === today.getDate()
        ) {
          continue;
        }
      }

      const ownerId = d.user?._id || d.user;
      if (!ownerId) continue;

      try {
        await Notification.create({
          type: 'commission_reminder',
          title: 'Commission payment reminder',
          message: `Your monthly commission for ${d.periodYear}-${String(d.periodMonth || 0).padStart(2, '0')} is due. Please pay by ${d.graceEndDate?.toLocaleDateString() || ''}.`,
          recipientUser: ownerId
        });
        d.reminderStage = (d.reminderStage || 0) + 1;
        d.lastReminderAt = today;
        await d.save();
        notified++;
      } catch (err) {
        console.error('Failed to send commission reminder for dues', d._id, err);
      }
    }

    return res.json({ success: true, checked: dues.length, notified });
  } catch (e) {
    console.error('Run monthly reminders error:', e);
    return res.status(500).json({ message: 'Failed to run monthly reminders' });
  }
});

// Pay commissions/fines - supports partial and full
router.post('/pay-commission', requireAuth, async (req, res) => {
  try {
    let { amount } = req.body;
    amount = Number(amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    // Compute totals again (authoritative on server)
    const unpaid = await Booking.aggregate([
      { $match: { paymentStatus: 'paid', commissionPaid: false, status: { $in: ['confirmed','ended'] } } },
      { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'prop' } },
      { $unwind: '$prop' },
      { $match: { 'prop.host': new mongoose.Types.ObjectId(req.user.id) } },
      { $project: { _id: 1, commissionAmount: 1 } }
    ]);
    let commissionsDue = unpaid.reduce((s, b) => s + Number(b.commissionAmount || 0), 0);
    const user = await User.findById(req.user.id);
    let finesDue = Number(user?.fines?.totalDue || 0);
    let remaining = amount;

    // Settle commissions FIFO
    const settledBookings = [];
    for (const b of unpaid) {
      if (remaining <= 0) break;
      const due = Number(b.commissionAmount || 0);
      if (due <= 0) continue;
      // Mark paid
      await Booking.updateOne({ _id: b._id }, { $set: { commissionPaid: true } });
      remaining -= due;
      commissionsDue -= due;
      settledBookings.push(String(b._id));
    }

    // Settle fines with remaining
    let finesCleared = 0;
    if (remaining > 0 && user?.fines) {
      const items = Array.isArray(user.fines.items) ? user.fines.items : [];
      for (const item of items) {
        if (remaining <= 0) break;
        if (item.paid) continue;
        const payNow = Math.min(remaining, Number(item.amount || 0));
        if (payNow > 0) {
          item.paid = true;
          item.paidAt = new Date();
          remaining -= payNow;
          finesCleared += payNow;
        }
      }
      user.fines.totalDue = Math.max(0, Number(user.fines.totalDue || 0) - (amount - Math.max(0, commissionsDue)));
      // Normalize in case of floating noise
      if (remaining > 0 && user.fines.totalDue === 0) {
        // any excess ignored (tip)
      }
    }

    // Determine access state
    const totalBefore = (commissionsDue + finesDue);
    const paid = amount;
    let fullyCleared = false;
    let partialUnlock = false;
    // Recompute totals after settlement
    const newSummary = await Booking.aggregate([
      { $match: { paymentStatus: 'paid', commissionPaid: false, status: { $in: ['confirmed','ended'] } } },
      { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'prop' } },
      { $unwind: '$prop' },
      { $match: { 'prop.host': new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);
    const remComm = newSummary.length ? Number(newSummary[0].total || 0) : 0;
    const remFines = Number(user?.fines?.totalDue || 0);
    const totalRemaining = remComm + remFines;
    const minPartial = totalBefore > 0 ? Math.ceil(totalBefore / 2) : 0;

    if (totalRemaining <= 0) {
      user.isBlocked = false;
      user.limitedAccess = false;
      user.blockedAt = null;
      user.blockedUntil = null;
      user.blockReason = null;
      fullyCleared = true;
    } else if (paid >= minPartial) {
      // Partial unlock
      user.limitedAccess = true;
      // Keep isBlocked true so properties remain hidden from guests
      partialUnlock = true;
    }
    await user.save();

    // Notify admin on payment
    try {
      await Notification.create({
        type: fullyCleared ? 'dues_cleared' : 'dues_partial',
        title: fullyCleared ? 'All dues cleared' : 'Partial dues payment',
        message: fullyCleared ? 'Owner cleared all dues and was reactivated.' : 'Owner made a partial payment towards dues.',
        recipientUser: null
      });
    } catch (_) {}

    return res.json({
      success: true,
      fullyCleared,
      partialUnlock,
      settledBookings,
      remaining: totalRemaining,
    });
  } catch (e) {
    console.error('Pay commission error:', e);
    return res.status(500).json({ message: 'Payment failed' });
  }
});

// RRA EBM Bill Generation
router.post('/rra-ebm', requireAuth, async (req, res) => {
    try {
        const { 
            customerName, 
            customerTin, 
            customerEmail, 
            customerPhone, 
            serviceType, 
            amount, 
            description, 
            bookingId, 
            taxRate = 18 
        } = req.body;

        // Validate required fields
        if (!customerName || !customerTin || !amount) {
            return res.status(400).json({ message: 'Customer name, TIN, and amount are required' });
        }

        // Validate TIN format (10 digits)
        const tinRegex = /^[0-9]{10}$/;
        if (!tinRegex.test(customerTin)) {
            return res.status(400).json({ message: 'Invalid TIN format. Must be 10 digits' });
        }

        // Validate amount
        if (Number(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        // Calculate tax
        const subtotal = Number(amount);
        const taxAmount = (subtotal * Number(taxRate)) / 100;
        const totalAmount = subtotal + taxAmount;

        // Generate invoice number
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `RRA${year}${month}${day}${random}`;

        // Generate bill ID
        const billId = `RRA${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Simulate RRA EBM API call
        // In a real implementation, you would integrate with RRA's actual EBM system
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock successful bill generation response
        const billData = {
            billId,
            invoiceNumber,
            customerName,
            customerTin,
            customerEmail,
            customerPhone,
            serviceType,
            description,
            bookingId,
            subtotal,
            taxRate: Number(taxRate),
            taxAmount,
            totalAmount,
            currency: 'RWF',
            generatedAt: new Date().toISOString(),
            status: 'generated',
            qrCode: `QR_${billId}_${Date.now()}`, // Mock QR code data
            rraReference: `RRA_REF_${billId}`
        };

        res.json({
            success: true,
            message: 'EBM Bill generated successfully',
            billId,
            billData
        });

    } catch (error) {
        console.error('RRA EBM bill generation error:', error);
        res.status(500).json({ message: 'Bill generation failed', error: error.message });
    }
});

// Get bill details
router.get('/bill/:billId', requireAuth, async (req, res) => {
    try {
        const { billId } = req.params;
        
        // In a real implementation, you would fetch from RRA's system
        // For now, return a mock response
        res.json({
            billId,
            status: 'generated',
            message: 'Bill retrieved successfully',
            // In real implementation, return actual bill data from database
        });
    } catch (error) {
        console.error('Bill retrieval error:', error);
        res.status(500).json({ message: 'Failed to retrieve bill', error: error.message });
    }
});

// Verify bill with RRA
router.post('/verify/:billId', requireAuth, async (req, res) => {
    try {
        const { billId } = req.params;
        
        // In a real implementation, you would verify with RRA's system
        // For now, return a mock verification response
        res.json({
            billId,
            verified: true,
            message: 'Bill verified successfully with RRA',
            verificationDate: new Date().toISOString()
        });
    } catch (error) {
        console.error('Bill verification error:', error);
        res.status(500).json({ message: 'Bill verification failed', error: error.message });
    }
});

module.exports = router;
