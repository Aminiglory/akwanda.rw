const express = require('express');
const router = express.Router();

// Public read-only content endpoints
router.get('/landing', async (req, res) => {
  try {
    const LandingContent = require('../tables/landingContent');
    const doc = await LandingContent.findOne({ published: true }).sort({ updatedAt: -1 });
    res.json({ content: doc || null });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load landing content' });
  }
});

router.get('/attractions', async (req, res) => {
  try {
    const AttractionsPageContent = require('../tables/attractionsPageContent');
    const doc = await AttractionsPageContent.findOne({ published: true }).sort({ updatedAt: -1 });
    res.json({ content: doc || null });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load attractions content' });
  }
});

module.exports = router;
