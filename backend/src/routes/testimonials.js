const express = require('express');
const router = express.Router();
const Property = require('../tables/property');

// Public: fetch latest testimonials from property ratings with comments
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    // Flatten ratings with property title
    const props = await Property.find({ 'ratings.comment': { $exists: true, $ne: '' } })
      .select('title ratings')
      .lean();
    const items = [];
    for (const p of props) {
      for (const r of (p.ratings || [])) {
        if (!r || !r.comment) continue;
        items.push({
          propertyTitle: p.title,
          rating: r.rating || 0,
          comment: r.comment,
          createdAt: r.createdAt || null,
        });
      }
    }
    items.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ testimonials: items.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch testimonials' });
  }
});

module.exports = router;
