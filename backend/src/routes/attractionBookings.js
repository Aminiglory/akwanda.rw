const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Attraction = require('../tables/attraction');
const AttractionBooking = require('../tables/attractionBooking');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Create attraction booking
router.post('/', requireAuth, async (req, res) => {
  try {
    const { attractionId, visitDate, tickets = 1, notes, contactPhone, paymentMethod } = req.body || {};
    if (!attractionId || !visitDate) return res.status(400).json({ message: 'Missing required fields' });
    const a = await Attraction.findById(attractionId);
    if (!a || !a.isActive) return res.status(404).json({ message: 'Attraction not found' });

    const when = new Date(visitDate);
    if (isNaN(when)) return res.status(400).json({ message: 'Invalid visit date' });

    const qty = Math.max(1, Number(tickets || 1));
    const unit = Number(a.price || 0);
    const total = unit * qty;

    const booking = await AttractionBooking.create({
      attraction: a._id,
      guest: req.user.id,
      visitDate: when,
      numberOfPeople: qty,
      totalAmount: total,
      status: 'pending',
      contactPhone: contactPhone || '',
      specialRequests: notes || '',
      paymentMethod: paymentMethod === 'mtn_mobile_money' ? 'mobile_money' : 'cash'
    });

    res.status(201).json({ booking });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create booking', error: e.message });
  }
});

// My attraction bookings (guest)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const list = await AttractionBooking.find({ guest: req.user.id })
      .sort({ createdAt: -1 })
      .populate('attraction');
    res.json({ bookings: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Owner: bookings for my attractions
router.get('/for-my-attractions', requireAuth, async (req, res) => {
  try {
    const myAttractionIds = await Attraction.find({ owner: req.user.id }).distinct('_id');
    const list = await AttractionBooking.find({ attraction: { $in: myAttractionIds } })
      .sort({ createdAt: -1 })
      .populate('attraction')
      .populate('guest', 'firstName lastName email phone');
    res.json({ bookings: list });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch owner bookings' });
  }
});

// Update booking status (owner or admin)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const b = await AttractionBooking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    const a = await Attraction.findById(b.attraction).select('owner');
    if (String(a.owner) !== String(req.user.id) && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { status } = req.body || {};
    const allowed = ['pending','confirmed','completed','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    b.status = status;
    await b.save();
    res.json({ booking: b });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

module.exports = router;
