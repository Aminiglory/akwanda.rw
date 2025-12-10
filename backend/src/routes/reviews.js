const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Property = require('../tables/property');
const User = require('../tables/user');
const Booking = require('../tables/booking');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
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

// Guest creates a detailed review (0-10 categories + comments)
// POST /api/reviews
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      bookingId,
      propertyId,
      reviewPin,
      overallScore10,
      staff,
      cleanliness,
      locationScore,
      facilities,
      comfort,
      valueForMoney,
      title,
      comment,
      highlights
    } = req.body || {};

    if (!bookingId || !propertyId) {
      return res.status(400).json({ message: 'bookingId and propertyId are required' });
    }

    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.guest) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only review your own stays' });
    }

    // Optional extra security: require correct review PIN if defined on booking
    if (booking.reviewPin && String(reviewPin || '').trim() !== String(booking.reviewPin)) {
      return res.status(400).json({ message: 'Invalid review PIN for this booking' });
    }

    // Optional: require that stay has ended before review
    if (booking.checkOut && new Date(booking.checkOut) > new Date()) {
      return res.status(400).json({ message: 'You can review after your stay has ended' });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const clamp10 = (v) => {
      const n = Number(v);
      if (isNaN(n)) return undefined;
      return Math.min(10, Math.max(0, n));
    };

    const overall10 = clamp10(overallScore10);
    const staffScore = clamp10(staff);
    const cleanScore = clamp10(cleanliness);
    const locScore = clamp10(locationScore);
    const facScore = clamp10(facilities);
    const comfortScore = clamp10(comfort);
    const valueScore = clamp10(valueForMoney);

    // Map 0-10 overall to legacy 1-5 stars for existing UI
    let legacyRating = 0;
    if (typeof overall10 === 'number') {
      legacyRating = Math.max(1, Math.min(5, Math.round(overall10 / 2)));
    }

    const review = {
      guest: req.user.id,
      rating: legacyRating || 5,
      comment: comment || '',
      status: 'pending',
      createdAt: new Date(),
      booking: booking._id,
      reservationNumber: booking.confirmationCode || String(booking._id).slice(-8),
      overallScore10: overall10,
      staff: staffScore,
      cleanliness: cleanScore,
      locationScore: locScore,
      facilities: facScore,
      comfort: comfortScore,
      valueForMoney: valueScore,
      title: title || '',
      highlights: Array.isArray(highlights)
        ? highlights.map(h => String(h || '').trim()).filter(Boolean)
        : []
    };

    property.ratings.push(review);
    await property.save();

    return res.status(201).json({
      message: 'Review submitted and pending approval',
      review: review
    });
  } catch (e) {
    console.error('Create review error:', e);
    res.status(500).json({ message: 'Failed to submit review', error: e.message });
  }
});

// GET all reviews for landing page (with user details)
router.get('/landing', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    
    // Get properties with ratings
    const properties = await Property.find({ 
      isActive: true,
      'ratings.0': { $exists: true } // Has at least one rating
    })
    .select('ratings title images address city')
    .populate('ratings.guest', 'firstName lastName profilePicture')
    .sort({ 'ratings.createdAt': -1 })
    .limit(50);
    
    // Flatten all ratings with property and user details
    const allReviews = [];
    for (const property of properties) {
      for (const rating of property.ratings || []) {
        if (rating.guest && rating.comment && (rating.status === 'approved' || !rating.status)) {
          allReviews.push({
            _id: rating._id,
            rating: rating.rating,
            comment: rating.comment,
            overallScore10: rating.overallScore10,
            staff: rating.staff,
            cleanliness: rating.cleanliness,
            locationScore: rating.locationScore,
            facilities: rating.facilities,
            comfort: rating.comfort,
            valueForMoney: rating.valueForMoney,
            title: rating.title,
            highlights: Array.isArray(rating.highlights) ? rating.highlights : [],
            createdAt: rating.createdAt,
            guest: {
              _id: rating.guest._id,
              firstName: rating.guest.firstName,
              lastName: rating.guest.lastName,
              profilePicture: rating.guest.profilePicture,
              fullName: `${rating.guest.firstName} ${rating.guest.lastName}`
            },
            property: {
              _id: property._id,
              title: property.title,
              image: property.images?.[0] || '',
              location: `${property.address}, ${property.city}`
            }
          });
        }
      }
    }
    
    // Sort by date and limit
    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const reviews = allReviews.slice(0, limit);
    
    res.json({ reviews, total: allReviews.length });
  } catch (e) {
    console.error('Failed to fetch landing reviews:', e);
    res.status(500).json({ message: 'Failed to fetch reviews', error: e.message });
  }
});

// ADMIN: list reviews across all properties with basic filters
// GET /api/reviews/admin/all?status=pending|approved|rejected&minRating=&maxRating=
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { status, minRating, maxRating, limit = 200 } = req.query;
    const properties = await Property.find({}).select('ratings title address city').populate('ratings.guest', 'firstName lastName email');

    const reviews = [];
    for (const property of properties) {
      for (const rating of property.ratings || []) {
        if (status && rating.status !== status) continue;
        if (minRating && rating.rating < Number(minRating)) continue;
        if (maxRating && rating.rating > Number(maxRating)) continue;
        reviews.push({
          _id: rating._id,
          rating: rating.rating,
          comment: rating.comment,
          status: rating.status,
          createdAt: rating.createdAt,
          guest: rating.guest ? {
            _id: rating.guest._id,
            firstName: rating.guest.firstName,
            lastName: rating.guest.lastName,
            email: rating.guest.email
          } : null,
          property: {
            _id: property._id,
            title: property.title,
            location: `${property.address}, ${property.city}`
          }
        });
      }
    }

    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limited = reviews.slice(0, Number(limit) || 200);
    return res.json({ reviews: limited, total: reviews.length });
  } catch (e) {
    console.error('Admin reviews list error:', e);
    return res.status(500).json({ message: 'Failed to load reviews', error: e.message });
  }
});

// ADMIN: reject or remove a review regardless of owner approval
// POST /api/reviews/admin/:propertyId/:ratingId/reject  { hardDelete?: boolean }
router.post('/admin/:propertyId/:ratingId/reject', requireAdmin, async (req, res) => {
  try {
    const { propertyId, ratingId } = req.params;
    const { hardDelete } = req.body || {};
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const rating = property.ratings.id(ratingId);
    if (!rating) return res.status(404).json({ message: 'Review not found' });

    if (hardDelete) {
      rating.remove();
    } else {
      rating.status = 'rejected';
    }
    await property.save();

    return res.json({ message: 'Review removed by admin', reviewId: ratingId });
  } catch (e) {
    console.error('Admin reject review error:', e);
    return res.status(500).json({ message: 'Failed to update review', error: e.message });
  }
});

// GET reviews for a specific property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId)
      .select('ratings title')
      .populate('ratings.guest', 'firstName lastName profilePicture');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const approved = (property.ratings || [])
      .filter(rating => rating.status === 'approved' || !rating.status);

    const reviews = approved.map(rating => ({
      _id: rating._id,
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt,
      overallScore10: rating.overallScore10,
      staff: rating.staff,
      cleanliness: rating.cleanliness,
      locationScore: rating.locationScore,
      facilities: rating.facilities,
      comfort: rating.comfort,
      valueForMoney: rating.valueForMoney,
      title: rating.title,
      highlights: Array.isArray(rating.highlights) ? rating.highlights : [],
      reservationNumber: rating.reservationNumber,
      guest: rating.guest ? {
        _id: rating.guest._id,
        firstName: rating.guest.firstName,
        lastName: rating.guest.lastName,
        profilePicture: rating.guest.profilePicture,
        fullName: `${rating.guest.firstName} ${rating.guest.lastName}`
      } : null
    }));

    const count = approved.length || 0;
    const sum = (field) => approved.reduce((s, r) => s + (typeof r[field] === 'number' ? r[field] : 0), 0);
    const avg = (field) => (count > 0 ? Number((sum(field) / count).toFixed(1)) : 0);

    const summary = {
      overallScore10: avg('overallScore10'),
      staff: avg('staff'),
      cleanliness: avg('cleanliness'),
      locationScore: avg('locationScore'),
      facilities: avg('facilities'),
      comfort: avg('comfort'),
      valueForMoney: avg('valueForMoney'),
      count
    };

    res.json({ reviews, propertyTitle: property.title, summary });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch property reviews', error: e.message });
  }
});

// GET all reviews for properties owned by current user
router.get('/my-reviews', requireAuth, async (req, res) => {
  try {
    const { filter, propertyId } = req.query;

    let query = { host: req.user.id, isActive: true };
    if (propertyId) {
      query._id = propertyId;
    }

    const properties = await Property.find(query)
      .select('ratings title images address city')
      .populate('ratings.guest', 'firstName lastName profilePicture email');

    const allReviews = [];
    for (const property of properties) {
      for (const rating of property.ratings || []) {
        const review = {
          _id: rating._id,
          rating: rating.rating,
          comment: rating.comment,
          createdAt: rating.createdAt,
          replied: !!rating.reply,
          reply: rating.reply,
          guest: rating.guest ? {
            _id: rating.guest._id,
            firstName: rating.guest.firstName,
            lastName: rating.guest.lastName,
            profilePicture: rating.guest.profilePicture,
            email: rating.guest.email,
            fullName: `${rating.guest.firstName} ${rating.guest.lastName}`
          } : null,
          property: {
            _id: property._id,
            title: property.title,
            image: property.images?.[0] || '',
            location: `${property.address}, ${property.city}`
          }
        };

        // Apply filters
        if (filter === 'unreplied' && review.replied) continue;
        if (filter === '5-star' && review.rating !== 5) continue;
        if (filter === 'low' && review.rating >= 4) continue;
        if (filter === 'pending' && rating.status !== 'pending') continue;
        if (filter === 'approved' && rating.status !== 'approved') continue;
        if (filter === 'rejected' && rating.status !== 'rejected') continue;

        allReviews.push(review);
      }
    }

    // Sort by date
    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ reviews: allReviews, total: allReviews.length });
  } catch (e) {
    console.error('Failed to fetch my reviews:', e);
    res.status(500).json({ message: 'Failed to fetch reviews', error: e.message });
  }
});

// POST reply to a review
router.post('/reply', requireAuth, async (req, res) => {
  try {
    const { propertyId, ratingId, reply } = req.body;
    
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }
    
    const property = await Property.findOne({ 
      _id: propertyId, 
      host: req.user.id 
    });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }
    
    const rating = property.ratings.id(ratingId);
    if (!rating) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    rating.reply = reply.trim();
    rating.replyDate = new Date();
    await property.save();
    
    res.json({ 
      message: 'Reply posted successfully',
      review: {
        _id: rating._id,
        reply: rating.reply,
        replyDate: rating.replyDate
      }
    });
  } catch (e) {
    console.error('Failed to post reply:', e);
    res.status(500).json({ message: 'Failed to post reply', error: e.message });
  }
});

// GET review statistics for owner
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const properties = await Property.find({ 
      host: req.user.id, 
      isActive: true 
    }).select('ratings');
    
    let totalReviews = 0;
    let totalRating = 0;
    let unrepliedCount = 0;
    let fiveStarCount = 0;
    let lowRatingCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    
    for (const property of properties) {
      for (const rating of property.ratings || []) {
        if (rating.status === 'pending') pendingCount++;
        if (rating.status === 'approved' || !rating.status) {
          approvedCount++;
          totalReviews++;
          totalRating += rating.rating;
          if (!rating.reply) unrepliedCount++;
          if (rating.rating === 5) fiveStarCount++;
          if (rating.rating < 4) lowRatingCount++;
        }
        if (rating.status === 'rejected') rejectedCount++;
      }
    }
    
    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;
    
    res.json({
      stats: {
        totalReviews,
        averageRating: parseFloat(averageRating),
        unrepliedCount,
        fiveStarCount,
        lowRatingCount,
        pendingCount,
        approvedCount,
        rejectedCount
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch review stats', error: e.message });
  }
});

// Owner approve a review
router.post('/approve', requireAuth, async (req, res) => {
  try {
    const { propertyId, ratingId } = req.body || {};
    if (!propertyId || !ratingId) {
      return res.status(400).json({ message: 'propertyId and ratingId are required' });
    }

    const property = await Property.findOne({ _id: propertyId, host: req.user.id });
    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    const rating = property.ratings.id(ratingId);
    if (!rating) {
      return res.status(404).json({ message: 'Review not found' });
    }

    rating.status = 'approved';
    await property.save();

    res.json({ message: 'Review approved', review: { _id: rating._id, status: rating.status } });
  } catch (e) {
    console.error('Failed to approve review:', e);
    res.status(500).json({ message: 'Failed to approve review', error: e.message });
  }
});

// Owner reject (cancel) a review
router.post('/reject', requireAuth, async (req, res) => {
  try {
    const { propertyId, ratingId } = req.body || {};
    if (!propertyId || !ratingId) {
      return res.status(400).json({ message: 'propertyId and ratingId are required' });
    }

    const property = await Property.findOne({ _id: propertyId, host: req.user.id });
    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    const rating = property.ratings.id(ratingId);
    if (!rating) {
      return res.status(404).json({ message: 'Review not found' });
    }

    rating.status = 'rejected';
    await property.save();

    res.json({ message: 'Review rejected', review: { _id: rating._id, status: rating.status } });
  } catch (e) {
    console.error('Failed to reject review:', e);
    res.status(500).json({ message: 'Failed to reject review', error: e.message });
  }
});

module.exports = router;
