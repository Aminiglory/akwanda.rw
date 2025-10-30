const express = require('express');
const router = express.Router();
const Deal = require('../tables/deal');
const Property = require('../tables/property');

// Seed demo deals for testing
router.post('/seed-demo-deals', async (req, res) => {
  try {
    // Get all active properties
    const properties = await Property.find({ isActive: true }).limit(10);
    
    if (properties.length === 0) {
      return res.status(400).json({ message: 'No properties found. Create properties first.' });
    }

    const dealsToCreate = [];
    const now = new Date();
    const validFrom = now;
    const validUntil = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

    // Create different types of deals for properties
    properties.forEach((property, index) => {
      const dealTypes = [
        {
          dealType: 'early_bird',
          title: 'Early Bird Special - Save 25%',
          tagline: 'Book 30 days ahead and save!',
          discountValue: 25,
          badge: 'hot_deal',
          badgeColor: '#FF6B6B',
          conditions: { minAdvanceBookingDays: 30 }
        },
        {
          dealType: 'last_minute',
          title: 'Last Minute Deal - 30% OFF',
          tagline: 'Book within 7 days!',
          discountValue: 30,
          badge: 'limited_time',
          badgeColor: '#FF8C42',
          conditions: { maxAdvanceBookingDays: 7 }
        },
        {
          dealType: 'long_stay',
          title: 'Long Stay Discount - 20% OFF',
          tagline: 'Stay 7+ nights and save',
          discountValue: 20,
          badge: 'best_value',
          badgeColor: '#4ECDC4',
          conditions: { minNights: 7 }
        },
        {
          dealType: 'weekend_special',
          title: 'Weekend Getaway - 15% OFF',
          tagline: 'Perfect for weekend trips',
          discountValue: 15,
          badge: 'popular',
          badgeColor: '#95E1D3',
          conditions: { applicableDays: ['friday', 'saturday', 'sunday'] }
        },
        {
          dealType: 'flash_sale',
          title: 'Flash Sale - 40% OFF',
          tagline: 'Limited time only!',
          discountValue: 40,
          badge: 'hot_deal',
          badgeColor: '#F38181',
          conditions: {}
        }
      ];

      // Assign deals to properties (rotate through deal types)
      const dealConfig = dealTypes[index % dealTypes.length];
      
      dealsToCreate.push({
        property: property._id,
        dealType: dealConfig.dealType,
        title: dealConfig.title,
        description: `Special offer for ${property.title}`,
        tagline: dealConfig.tagline,
        discountType: 'percentage',
        discountValue: dealConfig.discountValue,
        validFrom,
        validUntil,
        conditions: dealConfig.conditions,
        badge: dealConfig.badge,
        badgeColor: dealConfig.badgeColor,
        priority: Math.floor(Math.random() * 10),
        isActive: true,
        isPublished: true,
        createdBy: property.host
      });
    });

    // Insert deals
    const createdDeals = await Deal.insertMany(dealsToCreate);

    res.json({
      message: 'Demo deals created successfully',
      count: createdDeals.length,
      deals: createdDeals
    });
  } catch (error) {
    console.error('Error seeding deals:', error);
    res.status(500).json({ message: 'Failed to seed deals', error: error.message });
  }
});

// Clear all deals (for testing)
router.delete('/clear-all-deals', async (req, res) => {
  try {
    const result = await Deal.deleteMany({});
    res.json({ message: 'All deals cleared', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear deals', error: error.message });
  }
});

module.exports = router;
