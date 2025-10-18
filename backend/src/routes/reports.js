const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Property = require('../tables/property');
const Worker = require('../tables/worker');
const Booking = require('../tables/booking');
const User = require('../tables/user');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Auth middleware
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

// If caller is a worker, ensure they have the required privilege; hosts and admins bypass
function requireWorkerPrivilege(privKey) {
  return async function(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      if (req.user.userType === 'admin' || req.user.userType === 'host') return next();
      if (req.user.userType !== 'worker') return res.status(403).json({ message: 'Not allowed' });
      const worker = await Worker.findOne({ userAccount: req.user.id, isActive: true });
      if (!worker) return res.status(403).json({ message: 'Worker profile not found' });
      if (!worker.privileges || worker.privileges[privKey] !== true) {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }
      return next();
    } catch (e) {
      return res.status(500).json({ message: 'Privilege check failed' });
    }
  };
}

// Debug endpoint to check database content
router.get('/debug', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all properties for this user
    const allProperties = await Property.find({ host: userId });
    
    // Get all bookings for any property
    const allBookings = await Booking.find({}).limit(10);
    
    // Get total counts
    const totalProperties = await Property.countDocuments({});
    const totalBookings = await Booking.countDocuments({});
    
    res.json({
      userId,
      userProperties: allProperties.length,
      userPropertiesData: allProperties.map(p => ({ id: p._id, title: p.title, host: p.host })),
      totalPropertiesInDB: totalProperties,
      totalBookingsInDB: totalBookings,
      sampleBookings: allBookings.map(b => ({ id: b._id, property: b.property, status: b.status }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple stats endpoint for navbar
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log('Stats request for user ID:', userId);
    
    // Get properties count with error handling
    let propertiesCount = 0;
    let bookingsCount = 0;
    let averageRating = 0;
    
    try {
      propertiesCount = await Property.countDocuments({ host: userId });
      console.log('Properties count:', propertiesCount);
    } catch (propError) {
      console.error('Error counting properties:', propError);
    }
    
    // Get bookings count (all statuses)
    try {
      const properties = await Property.find({ host: userId }).select('_id');
      const propertyIds = properties.map(p => p._id);
      console.log('Property IDs:', propertyIds);
      
      if (propertyIds.length > 0) {
        bookingsCount = await Booking.countDocuments({ 
          property: { $in: propertyIds }
        });
        console.log('Bookings count:', bookingsCount);
      }
    } catch (bookingError) {
      console.error('Error counting bookings:', bookingError);
    }
    
    // Get average rating
    try {
      const propertiesWithRating = await Property.find({ 
        host: userId, 
        rating: { $exists: true, $ne: null, $gt: 0 } 
      });
      console.log('Properties with rating:', propertiesWithRating.length);
      
      if (propertiesWithRating.length > 0) {
        averageRating = propertiesWithRating.reduce((sum, prop) => sum + (prop.rating || 0), 0) / propertiesWithRating.length;
      }
    } catch (ratingError) {
      console.error('Error calculating rating:', ratingError);
    }
    
    const response = {
      totalProperties: propertiesCount,
      totalBookings: bookingsCount,
      averageRating: Math.round(averageRating * 10) / 10
    };
    
    console.log('Stats response for user', userId, ':', response);
    res.json(response);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch stats', 
      error: error.message,
      totalProperties: 0,
      totalBookings: 0,
      averageRating: 0
    });
  }
});

// Get dashboard summary for reports
router.get('/dashboard', requireAuth, requireWorkerPrivilege('canViewReports'), async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Dashboard request for user:', userId);
    
    // Get user's properties
    const properties = await Property.find({ host: userId });
    console.log('Found properties:', properties.length);
    const propertyIds = properties.map(p => p._id);
    
    // Get all bookings for user's properties (include more statuses)
    const bookings = await Booking.find({ 
      property: { $in: propertyIds },
      status: { $in: ['confirmed', 'ended', 'awaiting', 'commission_due'] }
    }).populate('property guest');
    console.log('Found bookings:', bookings.length);
    
    // Calculate metrics
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const averageRating = properties.length > 0 ? 
      properties.reduce((sum, prop) => sum + (prop.rating || 0), 0) / properties.length : 0;
    
    // This month metrics
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthBookings = bookings.filter(b => new Date(b.createdAt) >= thisMonth);
    const thisMonthRevenue = thisMonthBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    
    // Calculate occupancy rate (simplified)
    const totalDays = properties.length * 30; // Approximate
    const bookedDays = bookings.reduce((sum, booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      return sum + Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    }, 0);
    const occupancyRate = totalDays > 0 ? Math.round((bookedDays / totalDays) * 100) : 0;
    
    // Average stay duration
    const averageStay = bookings.length > 0 ? Math.round(bookedDays / bookings.length) : 0;
    
    const response = {
      totalProperties: properties.length,
      totalBookings,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      thisMonth: {
        bookings: thisMonthBookings.length,
        revenue: thisMonthRevenue
      },
      occupancyRate,
      averageStay
    };
    
    console.log('Dashboard response:', response);
    res.json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Generate reports
router.get('/generate', requireAuth, requireWorkerPrivilege('canViewReports'), async (req, res) => {
  try {
    const { type, period } = req.query;
    const userId = req.user.id;
    
    // Get user's properties
    const properties = await Property.find({ host: userId });
    const propertyIds = properties.map(p => p._id);
    
    // Date range calculation
    let startDate = new Date();
    let endDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(startDate.getFullYear(), 0, 1);
        endDate = new Date(startDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
    }
    
    // Get bookings in date range
    const bookings = await Booking.find({
      property: { $in: propertyIds },
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('property guest');
    
    let reportData = {};
    
    switch (type) {
      case 'revenue':
        reportData = generateRevenueReport(bookings, properties, period);
        break;
      case 'bookings':
        reportData = generateBookingsReport(bookings, properties, period);
        break;
      case 'performance':
        reportData = generatePerformanceReport(bookings, properties, period);
        break;
      case 'annual':
        reportData = generateAnnualReport(bookings, properties);
        break;
      case 'tax':
        reportData = generateTaxReport(bookings, properties, startDate.getFullYear());
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }
    
    res.json({
      reportType: type,
      period,
      dateRange: { startDate, endDate },
      generatedAt: new Date(),
      data: reportData
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Helper functions for different report types
function generateRevenueReport(bookings, properties, period) {
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalCommissions = bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
  const netRevenue = totalRevenue - totalCommissions;
  
  const byProperty = properties.map(property => {
    const propertyBookings = bookings.filter(b => String(b.property._id) === String(property._id));
    const revenue = propertyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const commissions = propertyBookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
    
    return {
      propertyId: property._id,
      propertyName: property.title,
      bookingsCount: propertyBookings.length,
      totalRevenue: revenue,
      commissions,
      netRevenue: revenue - commissions
    };
  });
  
  return {
    summary: {
      totalRevenue,
      totalCommissions,
      netRevenue,
      totalBookings: bookings.length
    },
    byProperty,
    period
  };
}

function generateBookingsReport(bookings, properties, period) {
  const statusBreakdown = bookings.reduce((acc, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1;
    return acc;
  }, {});
  
  const byProperty = properties.map(property => {
    const propertyBookings = bookings.filter(b => String(b.property._id) === String(property._id));
    return {
      propertyId: property._id,
      propertyName: property.title,
      bookingsCount: propertyBookings.length,
      averageBookingValue: propertyBookings.length > 0 
        ? propertyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / propertyBookings.length 
        : 0
    };
  });
  
  return {
    summary: {
      totalBookings: bookings.length,
      statusBreakdown
    },
    byProperty,
    period
  };
}

function generatePerformanceReport(bookings, properties, period) {
  const occupancyData = properties.map(property => {
    const propertyBookings = bookings.filter(b => String(b.property._id) === String(property._id));
    const totalDays = 30; // Simplified for monthly
    const bookedDays = propertyBookings.reduce((sum, booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      return sum + Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    }, 0);
    
    return {
      propertyId: property._id,
      propertyName: property.title,
      occupancyRate: Math.round((bookedDays / totalDays) * 100),
      averageStay: propertyBookings.length > 0 ? Math.round(bookedDays / propertyBookings.length) : 0,
      rating: property.rating || 0
    };
  });
  
  return {
    occupancyData,
    period
  };
}

function generateAnnualReport(bookings, properties) {
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthBookings = bookings.filter(b => new Date(b.createdAt).getMonth() === i);
    const revenue = monthBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    return {
      month,
      monthName: new Date(2024, i, 1).toLocaleString('default', { month: 'long' }),
      bookings: monthBookings.length,
      revenue
    };
  });
  
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalCommissions = bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
  
  return {
    summary: {
      totalBookings: bookings.length,
      totalRevenue,
      totalCommissions,
      netRevenue: totalRevenue - totalCommissions,
      averageMonthlyRevenue: totalRevenue / 12
    },
    monthlyData,
    properties: properties.length
  };
}

function generateTaxReport(bookings, properties, year) {
  const taxableIncome = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const commissionsPaid = bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
  const netIncome = taxableIncome - commissionsPaid;
  
  // Simplified tax calculation (would need actual tax rules)
  const estimatedTax = netIncome * 0.15; // 15% estimated tax rate
  
  return {
    year,
    taxableIncome,
    commissionsPaid,
    netIncome,
    estimatedTax,
    properties: properties.length,
    totalBookings: bookings.length,
    note: 'This is an estimated tax report. Please consult with a tax professional for accurate calculations.'
  };
}

// Generate PDF report
router.get('/generate-pdf', requireAuth, requireWorkerPrivilege('canViewReports'), async (req, res) => {
  try {
    const { type = 'summary', period = 'monthly' } = req.query;
    const userId = req.user.id;
    
    // Get data for report
    const properties = await Property.find({ host: userId });
    const propertyIds = properties.map(p => p._id);
    const bookings = await Booking.find({ 
      property: { $in: propertyIds }
    }).populate('property guest');
    
    // Create PDF
    const doc = new PDFDocument();
    const filename = `${type}-${period}-report-${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // PDF Content
    doc.fontSize(20).text('AKWANDA.rw Property Report', 50, 50);
    doc.fontSize(12).text(`Report Type: ${type.toUpperCase()}`, 50, 80);
    doc.text(`Period: ${period.toUpperCase()}`, 50, 95);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 50, 110);
    doc.text('─'.repeat(80), 50, 130);
    
    let yPosition = 150;
    
    // Summary Statistics
    doc.fontSize(14).text('Summary Statistics', 50, yPosition);
    yPosition += 25;
    doc.fontSize(10);
    doc.text(`Total Properties: ${properties.length}`, 50, yPosition);
    yPosition += 15;
    doc.text(`Total Bookings: ${bookings.length}`, 50, yPosition);
    yPosition += 15;
    
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    doc.text(`Total Revenue: RWF ${totalRevenue.toLocaleString()}`, 50, yPosition);
    yPosition += 30;
    
    // Properties List
    if (properties.length > 0) {
      doc.fontSize(14).text('Properties', 50, yPosition);
      yPosition += 20;
      doc.fontSize(9);
      
      properties.forEach((property, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        doc.text(`${index + 1}. ${property.title}`, 50, yPosition);
        yPosition += 12;
        doc.text(`   Location: ${property.city}, ${property.country}`, 50, yPosition);
        yPosition += 12;
        doc.text(`   Price: RWF ${property.pricePerNight?.toLocaleString()}/night`, 50, yPosition);
        yPosition += 15;
      });
    }
    
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Failed to generate PDF report' });
  }
});

// Generate CSV report
router.get('/generate-csv', requireAuth, requireWorkerPrivilege('canViewReports'), async (req, res) => {
  try {
    const { type = 'bookings', period = 'monthly' } = req.query;
    const userId = req.user.id;
    
    // Get data for report
    const properties = await Property.find({ host: userId });
    const propertyIds = properties.map(p => p._id);
    const bookings = await Booking.find({ 
      property: { $in: propertyIds }
    }).populate('property guest');
    
    let csvContent = '';
    const filename = `${type}-${period}-report-${Date.now()}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (type === 'bookings') {
      // Bookings CSV
      csvContent = 'Booking ID,Property,Guest Name,Check In,Check Out,Amount,Status,Created Date\n';
      bookings.forEach(booking => {
        const guestName = booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : 'N/A';
        const propertyTitle = booking.property?.title || 'N/A';
        csvContent += `"${booking._id}","${propertyTitle}","${guestName}","${booking.checkIn}","${booking.checkOut}","${booking.totalAmount || 0}","${booking.status}","${booking.createdAt}"\n`;
      });
    } else if (type === 'properties') {
      // Properties CSV
      csvContent = 'Property ID,Title,City,Country,Price Per Night,Bedrooms,Max Guests,Rating,Status\n';
      properties.forEach(property => {
        csvContent += `"${property._id}","${property.title}","${property.city}","${property.country}","${property.pricePerNight || 0}","${property.bedrooms || 0}","${property.maxGuests || 0}","${property.rating || 0}","${property.isActive ? 'Active' : 'Inactive'}"\n`;
      });
    } else {
      // Summary CSV
      csvContent = 'Metric,Value\n';
      csvContent += `"Total Properties","${properties.length}"\n`;
      csvContent += `"Total Bookings","${bookings.length}"\n`;
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      csvContent += `"Total Revenue","${totalRevenue}"\n`;
      const avgRating = properties.length > 0 ? properties.reduce((sum, p) => sum + (p.rating || 0), 0) / properties.length : 0;
      csvContent += `"Average Rating","${avgRating.toFixed(2)}"\n`;
    }
    
    res.send(csvContent);
  } catch (error) {
    console.error('CSV generation error:', error);
    res.status(500).json({ message: 'Failed to generate CSV report' });
  }
});

module.exports = router;
