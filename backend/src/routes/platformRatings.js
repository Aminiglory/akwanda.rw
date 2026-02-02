const express = require('express');
const jwt = require('jsonwebtoken');
const PlatformRating = require('../tables/platformRating');

const router = express.Router();
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

router.get('/me', requireAuth, async (req, res) => {
  try {
    const doc = await PlatformRating.findOne({ user: req.user.id }).select('rating comment createdAt updatedAt').lean();
    return res.json({ rating: doc || null });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load rating' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const userType = String(req.user.userType || 'guest');

    const doc = await PlatformRating.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          user: req.user.id,
          userType,
          rating,
          comment,
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select('rating comment createdAt updatedAt');

    return res.json({ rating: doc });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// Public summary for displaying aggregated satisfaction rate.
router.get('/summary', async (req, res) => {
  try {
    const agg = await PlatformRating.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        }
      }
    ]);

    const avgRating = agg?.[0]?.avgRating || 0;
    const count = agg?.[0]?.count || 0;
    return res.json({ summary: { avgRating, count } });
  } catch (e) {
    return res.json({ summary: { avgRating: 0, count: 0 } });
  }
});

module.exports = router;
