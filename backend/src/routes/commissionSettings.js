const { Router } = require('express');
const { authenticate: requireAuth } = require('../middleware/auth');
const CommissionSettings = require('../tables/commissionSettings');

const router = Router();

// GET current commission settings
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    const settings = await CommissionSettings.getSingleton();
    return res.json({
      baseRate: settings.baseRate,
      premiumRate: settings.premiumRate,
      featuredRate: settings.featuredRate,
      enforcementPaused: !!settings.enforcementPaused,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load commission settings' });
  }
});

// PUT update commission settings
router.put('/', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    const { baseRate, premiumRate, featuredRate, enforcementPaused } = req.body || {};
    const settings = await CommissionSettings.getSingleton();

    const clamp = (v, def) => {
      const n = Number(v);
      if (Number.isNaN(n)) return def;
      return Math.min(100, Math.max(0, n));
    };

    if (baseRate != null) settings.baseRate = clamp(baseRate, settings.baseRate);
    if (premiumRate != null) settings.premiumRate = clamp(premiumRate, settings.premiumRate);
    if (featuredRate != null) settings.featuredRate = clamp(featuredRate, settings.featuredRate);
    if (typeof enforcementPaused === 'boolean') settings.enforcementPaused = enforcementPaused;

    await settings.save();

    return res.json({
      baseRate: settings.baseRate,
      premiumRate: settings.premiumRate,
      featuredRate: settings.featuredRate,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to update commission settings' });
  }
});

module.exports = router;
