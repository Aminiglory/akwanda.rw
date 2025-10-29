const express = require('express');
const router = express.Router();
const Deal = require('../tables/deal');
const Property = require('../tables/property');
const { authenticate } = require('../middleware/auth');

// Get all deals for a property (public)
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const now = new Date();
    
    const deals = await Deal.find({
      property: propertyId,
      isActive: true,
      isPublished: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
    .sort({ priority: -1, createdAt: -1 })
    .select('-notes -createdBy');
    
    res.json({ deals });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deals', error: error.message });
  }
});

// Get applicable deals for a booking
router.post('/check-applicable', async (req, res) => {
  try {
    const { propertyId, checkInDate, checkOutDate, guests, rooms, isMobile } = req.body;
    
    if (!propertyId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const bookingData = {
      checkInDate,
      checkOutDate,
      guests: guests || 1,
      rooms: rooms || 1,
      isMobile: isMobile || false,
      bookingDate: new Date()
    };
    
    const applicableDeals = await Deal.findApplicableDeals(propertyId, bookingData);
    
    res.json({ deals: applicableDeals });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check deals', error: error.message });
  }
});

// Calculate discount for a deal
router.post('/calculate-discount', async (req, res) => {
  try {
    const { dealId, originalPrice, nights } = req.body;
    
    if (!dealId || !originalPrice) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const discount = deal.calculateDiscount(originalPrice, nights || 1);
    const finalPrice = originalPrice - discount;
    
    res.json({ 
      originalPrice, 
      discount, 
      finalPrice,
      discountPercent: ((discount / originalPrice) * 100).toFixed(2),
      dealTitle: deal.title
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to calculate discount', error: error.message });
  }
});

// Track deal view
router.post('/:dealId/view', async (req, res) => {
  try {
    const { dealId } = req.params;
    
    await Deal.findByIdAndUpdate(dealId, { $inc: { views: 1 } });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to track view', error: error.message });
  }
});

// Track deal click
router.post('/:dealId/click', async (req, res) => {
  try {
    const { dealId } = req.params;
    
    await Deal.findByIdAndUpdate(dealId, { $inc: { clicks: 1 } });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to track click', error: error.message });
  }
});

// ===== PROPERTY OWNER ROUTES (Protected) =====

// Get all deals for owner's properties
router.get('/my-deals', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all properties owned by user
    const properties = await Property.find({ host: userId }).select('_id');
    const propertyIds = properties.map(p => p._id);
    
    const deals = await Deal.find({ property: { $in: propertyIds } })
      .populate('property', 'title propertyNumber')
      .sort({ createdAt: -1 });
    
    res.json({ deals });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deals', error: error.message });
  }
});

// Get single deal
router.get('/:dealId', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;
    
    const deal = await Deal.findById(dealId).populate('property', 'title host');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Check ownership
    if (deal.property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ deal });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deal', error: error.message });
  }
});

// Create new deal
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const dealData = req.body;
    
    // Verify property ownership
    const property = await Property.findById(dealData.property);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Create deal
    const deal = new Deal({
      ...dealData,
      createdBy: userId
    });
    
    await deal.save();
    
    res.status(201).json({ message: 'Deal created successfully', deal });
  } catch (error) {
    res.status(400).json({ message: 'Failed to create deal', error: error.message });
  }
});

// Update deal
router.put('/:dealId', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;
    const updates = req.body;
    
    const deal = await Deal.findById(dealId).populate('property', 'host');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Check ownership
    if (deal.property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update deal
    Object.assign(deal, updates);
    await deal.save();
    
    res.json({ message: 'Deal updated successfully', deal });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update deal', error: error.message });
  }
});

// Delete deal
router.delete('/:dealId', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;
    
    const deal = await Deal.findById(dealId).populate('property', 'host');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Check ownership
    if (deal.property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await Deal.findByIdAndDelete(dealId);
    
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete deal', error: error.message });
  }
});

// Toggle deal active status
router.patch('/:dealId/toggle-active', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;
    
    const deal = await Deal.findById(dealId).populate('property', 'host');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Check ownership
    if (deal.property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    deal.isActive = !deal.isActive;
    await deal.save();
    
    res.json({ message: 'Deal status updated', deal });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update deal status', error: error.message });
  }
});

// Toggle deal published status
router.patch('/:dealId/toggle-published', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;
    
    const deal = await Deal.findById(dealId).populate('property', 'host');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Check ownership
    if (deal.property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    deal.isPublished = !deal.isPublished;
    await deal.save();
    
    res.json({ message: 'Deal published status updated', deal });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update deal status', error: error.message });
  }
});

// Get deal analytics
router.get('/:dealId/analytics', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;
    
    const deal = await Deal.findById(dealId).populate('property', 'host title');
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Check ownership
    if (deal.property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const analytics = {
      views: deal.views,
      clicks: deal.clicks,
      bookings: deal.bookings,
      revenue: deal.revenue,
      conversionRate: deal.conversionRate,
      clickThroughRate: deal.views > 0 ? ((deal.clicks / deal.views) * 100).toFixed(2) : 0,
      averageBookingValue: deal.bookings > 0 ? (deal.revenue / deal.bookings).toFixed(2) : 0,
      unitsRemaining: deal.totalAvailableUnits ? deal.totalAvailableUnits - deal.unitsBooked : null
    };
    
    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// Duplicate deal
router.post('/:dealId/duplicate', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;
    
    const originalDeal = await Deal.findById(dealId).populate('property', 'host');
    
    if (!originalDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Check ownership
    if (originalDeal.property.host.toString() !== userId && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Create duplicate
    const dealData = originalDeal.toObject();
    delete dealData._id;
    delete dealData.createdAt;
    delete dealData.updatedAt;
    delete dealData.__v;
    
    dealData.title = `${dealData.title} (Copy)`;
    dealData.isPublished = false;
    dealData.views = 0;
    dealData.clicks = 0;
    dealData.bookings = 0;
    dealData.revenue = 0;
    dealData.unitsBooked = 0;
    dealData.createdBy = userId;
    
    const newDeal = new Deal(dealData);
    await newDeal.save();
    
    res.status(201).json({ message: 'Deal duplicated successfully', deal: newDeal });
  } catch (error) {
    res.status(400).json({ message: 'Failed to duplicate deal', error: error.message });
  }
});

module.exports = router;
