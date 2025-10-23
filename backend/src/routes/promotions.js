const { Router } = require('express');
const jwt = require('jsonwebtoken');
const Property = require('../tables/property');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies?.akw_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); } catch (e) { return res.status(401).json({ message: 'Invalid token' }); }
}

// List promotions for owner properties
router.get('/', requireAuth, async (req, res) => {
  try {
    const properties = await Property.find({ host: req.user.id }).select('title promotions');
    const promotions = [];
    properties.forEach(p => {
      (p.promotions || []).forEach(pr => promotions.push({ _id: pr._id, name: pr.name || pr.title || pr.type, type: pr.type, discountPercent: pr.discountPercent, startDate: pr.startDate, endDate: pr.endDate, property: { _id: p._id, title: p.title } }));
    });
    res.json({ promotions });
  } catch (e) { res.status(500).json({ message: 'Failed to load promotions' }); }
});

// Create promotion on a property (owner/admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { property, name, type, discountPercent, startDate, endDate } = req.body;
    const p = await Property.findById(property).select('host promotions');
    if (!p) return res.status(404).json({ message: 'Property not found' });
    const isOwner = String(p.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });
    const promo = { name, type, discountPercent: Number(discountPercent) || 0, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null, active: true };
    if (!Array.isArray(p.promotions)) p.promotions = [];
    p.promotions.push(promo);
    await p.save();
    res.status(201).json({ promotion: p.promotions[p.promotions.length - 1] });
  } catch (e) { res.status(500).json({ message: 'Failed to create promotion' }); }
});

// Delete promotion
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // promotions stored embedded; require propertyId as query for faster lookup
    const { propertyId } = req.query;
    const p = await Property.findById(propertyId).select('host promotions');
    if (!p) return res.status(404).json({ message: 'Property not found' });
    const isOwner = String(p.host) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });
    const before = (p.promotions || []).length;
    p.promotions = (p.promotions || []).filter(pr => String(pr._id) !== String(req.params.id));
    const after = p.promotions.length;
    await p.save();
    res.json({ success: true, removed: before - after });
  } catch (e) { res.status(500).json({ message: 'Failed to delete promotion' }); }
});

module.exports = router;
