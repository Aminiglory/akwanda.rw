const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadBuffer } = require('../utils/cloudinary');
const mongoose = require('mongoose');
const Worker = require('../tables/worker');
const WorkerActionLog = require('../tables/workerActionLog');
const Property = require('../tables/property');
const User = require('../tables/user');

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

// Middleware to check if user is property owner (auto-promote guests like property upload, and allow admin)
async function requirePropertyOwner(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.userType === 'admin') return next();
    if (req.user.userType === 'host') return next();
    // Auto-promote guest to host on first manage-workers action for convenience
    const User = require('../tables/user');
    const acct = await User.findById(req.user.id);
    if (acct) {
      acct.userType = 'host';
      await acct.save();
      req.user.userType = 'host';
      return next();
    }
    return res.status(403).json({ message: 'Only property owners can manage workers' });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to validate owner' });
  }
}

// File upload setup -> use memory storage and Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper function to log worker actions
async function logWorkerAction(workerId, employerId, action, targetType, targetId, description, details = {}, req = null) {
  try {
    await WorkerActionLog.logAction({
      workerId,
      employerId,
      action,
      targetType,
      targetId,
      targetName: details.targetName,
      description,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      sessionId: req?.sessionID
    });
  } catch (error) {
    console.error('Failed to log worker action:', error);
  }
}

// Get all workers for a property owner
router.get('/', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, department } = req.query;
    const employerId = req.user.id;
    
    // Build query
    const query = { employerId };
    if (status) query.status = status;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const workers = await Worker.find(query)
      .populate('assignedProperties', 'title city')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Worker.countDocuments(query);
    
    res.json({
      workers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ message: 'Failed to fetch workers' });
  }
});

// Get single worker details
router.get('/:id', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const worker = await Worker.findOne({ 
      _id: req.params.id, 
      employerId: req.user.id 
    }).populate('assignedProperties', 'title city country');
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    // Get recent activity
    const recentActivity = await WorkerActionLog.find({ workerId: worker._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Get activity summary
    const activitySummary = await WorkerActionLog.getActivitySummary(worker._id);
    
    res.json({
      worker,
      recentActivity,
      activitySummary
    });
  } catch (error) {
    console.error('Get worker error:', error);
    res.status(500).json({ message: 'Failed to fetch worker details' });
  }
});

// Create new worker
// Helper to safely parse JSON strings from multipart form fields
function safeParseJSON(v, fallback) {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (_) { return fallback; }
}

// Create new worker (supports multipart with optional avatar)
router.post('/', requireAuth, requirePropertyOwner, upload.single('avatar'), async (req, res) => {
  try {
    // Parse body fields (multipart sends strings)
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const phone = req.body.phone;
    const nationalId = req.body.nationalId;
    const position = req.body.position;
    const department = req.body.department;
    const salary = safeParseJSON(req.body.salary, req.body.salary || {});
    const privileges = safeParseJSON(req.body.privileges, req.body.privileges || {});
    const assignedProperties = safeParseJSON(req.body.assignedProperties, req.body.assignedProperties || []);
    const address = safeParseJSON(req.body.address, req.body.address || {});
    const emergencyContact = safeParseJSON(req.body.emergencyContact, req.body.emergencyContact || {});
    
    // Check if email already exists
    const existingWorker = await Worker.findOne({ email: email.toLowerCase() });
    if (existingWorker) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Check if national ID already exists
    const existingNationalId = await Worker.findOne({ nationalId });
    if (existingNationalId) {
      return res.status(400).json({ message: 'National ID already registered' });
    }
    
    // Check if a user account exists for this email
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    // Generate employee ID
    const employeeId = await Worker.generateEmployeeId(req.user.id);
    
    // Compute next pay date if not provided
    function computeNextPayDate(freq) {
      const now = new Date();
      const d = new Date(now);
      switch ((freq || 'monthly')) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'biweekly': d.setDate(d.getDate() + 14); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        default: d.setMonth(d.getMonth() + 1);
      }
      return d;
    }

    // Create worker
    const worker = new Worker({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      nationalId,
      employerId: req.user.id,
      employeeId,
      position,
      department: department || 'General',
      salary: {
        amount: Number(salary?.amount ?? 0),
        currency: salary?.currency || 'RWF',
        paymentFrequency: salary?.paymentFrequency || 'monthly',
        nextPayDate: salary?.nextPayDate ? new Date(salary.nextPayDate) : computeNextPayDate(salary?.paymentFrequency)
      },
      privileges: privileges || {},
      assignedProperties: assignedProperties || [],
      address,
      emergencyContact,
      createdBy: req.user.id
    });

    // If avatar was uploaded, set it via Cloudinary; else generate a simple initials SVG avatar
    if (req.file && req.file.buffer) {
      try {
        const up = await uploadBuffer(req.file.buffer, req.file.originalname, 'workers/avatars');
        worker.avatar = up.secure_url || up.url;
      } catch (_) { /* ignore */ }
    } else {
      try {
        const initials = `${(firstName||'').charAt(0)}${(lastName||'').charAt(0)}`.toUpperCase() || (email||'U').charAt(0).toUpperCase();
        const bg = '#2563eb';
        const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="120" fill="#ffffff">${initials}</text></svg>`;
        const buffer = Buffer.from(svg, 'utf8');
        const up = await uploadBuffer(buffer, `worker-${Date.now()}-${Math.round(Math.random()*1e6)}.svg`, 'workers/avatars');
        worker.avatar = up.secure_url || up.url;
      } catch (e) {
        // Fallback: leave empty, frontend shows initials placeholder
      }
    }

    // If no user exists, create a login account for the worker with a temporary password
    let initialPassword = null;
    if (!existingUser) {
      initialPassword = Math.random().toString(36).slice(-10);
      const hash = await bcrypt.hash(initialPassword, 10);
      const userAccount = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        passwordHash: hash,
        userType: 'worker'
      });
      worker.userAccount = userAccount._id;
    } else {
      // Link to existing account if appropriate
      worker.userAccount = existingUser._id;
    }

    await worker.save();
    
    // Log action
    await logWorkerAction(
      worker._id,
      req.user.id,
      'worker_created',
      'worker',
      worker._id,
      `Created new worker: ${worker.fullName}`,
      { targetName: worker.fullName, position, department },
      req
    );
    
    res.status(201).json({ 
      message: 'Worker created successfully', 
      worker: await worker.populate('assignedProperties', 'title city'),
      initialPassword: initialPassword || undefined
    });
  } catch (error) {
    console.error('Create worker error:', error);
    res.status(500).json({ message: 'Failed to create worker' });
  }
});

// Update worker
router.put('/:id', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const worker = await Worker.findOne({ 
      _id: req.params.id, 
      employerId: req.user.id 
    });
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    const {
      firstName, lastName, phone, position, department, salary,
      privileges, assignedProperties, address, emergencyContact, status
    } = req.body;
    
    // Track changes for logging
    const changes = [];
    
    if (firstName && firstName !== worker.firstName) {
      changes.push(`Name: ${worker.firstName} → ${firstName}`);
      worker.firstName = firstName;
    }
    if (lastName && lastName !== worker.lastName) {
      changes.push(`Last name: ${worker.lastName} → ${lastName}`);
      worker.lastName = lastName;
    }
    if (phone && phone !== worker.phone) {
      changes.push(`Phone: ${worker.phone} → ${phone}`);
      worker.phone = phone;
    }
    if (position && position !== worker.position) {
      changes.push(`Position: ${worker.position} → ${position}`);
      worker.position = position;
    }
    if (department && department !== worker.department) {
      changes.push(`Department: ${worker.department} → ${department}`);
      worker.department = department;
    }
    if (status && status !== worker.status) {
      changes.push(`Status: ${worker.status} → ${status}`);
      worker.status = status;
    }
    
    if (salary) {
      if (salary.amount !== undefined && salary.amount !== worker.salary.amount) {
        changes.push(`Salary: ${worker.salary.amount} → ${salary.amount} ${salary.currency || worker.salary.currency}`);
        worker.salary.amount = salary.amount;
      }
      if (salary.currency) worker.salary.currency = salary.currency;
      if (salary.paymentFrequency) worker.salary.paymentFrequency = salary.paymentFrequency;
    }
    
    if (privileges) {
      const privilegeChanges = [];
      Object.keys(privileges).forEach(key => {
        if (worker.privileges[key] !== privileges[key]) {
          privilegeChanges.push(`${key}: ${worker.privileges[key]} → ${privileges[key]}`);
        }
      });
      if (privilegeChanges.length > 0) {
        changes.push(`Privileges: ${privilegeChanges.join(', ')}`);
      }
      worker.privileges = { ...worker.privileges, ...privileges };
    }
    
    if (assignedProperties) {
      worker.assignedProperties = assignedProperties;
      changes.push('Updated assigned properties');
    }
    if (address) worker.address = { ...worker.address, ...address };
    if (emergencyContact) worker.emergencyContact = { ...worker.emergencyContact, ...emergencyContact };
    
    worker.updatedBy = req.user.id;
    await worker.save();
    
    // Log action
    if (changes.length > 0) {
      await logWorkerAction(
        worker._id,
        req.user.id,
        'worker_updated',
        'worker',
        worker._id,
        `Updated worker: ${changes.join('; ')}`,
        { targetName: worker.fullName, changes },
        req
      );
    }
    
    res.json({ 
      message: 'Worker updated successfully', 
      worker: await worker.populate('assignedProperties', 'title city')
    });
  } catch (error) {
    console.error('Update worker error:', error);
    res.status(500).json({ message: 'Failed to update worker' });
  }
});

// Upload worker avatar
router.post('/:id/avatar', requireAuth, requirePropertyOwner, upload.single('avatar'), async (req, res) => {
  try {
    const worker = await Worker.findOne({ 
      _id: req.params.id, 
      employerId: req.user.id 
    });
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const up = await uploadBuffer(req.file.buffer, req.file.originalname, 'workers/avatars');
    const avatarUrl = up.secure_url || up.url;
    worker.avatar = avatarUrl;
    await worker.save();
    
    // Log action
    await logWorkerAction(
      worker._id,
      req.user.id,
      'profile_updated',
      'worker',
      worker._id,
      `Updated avatar for ${worker.fullName}`,
      { targetName: worker.fullName },
      req
    );
    
    res.json({ message: 'Avatar updated successfully', avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

// Create or link worker login account with provided credentials (owner/admin only)
router.post('/:id/account', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const worker = await Worker.findOne({ _id: req.params.id, employerId: req.user.id });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    const { username, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const lower = String(email).toLowerCase();
    let user = worker.userAccount ? await User.findById(worker.userAccount) : await User.findOne({ email: lower });
    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = await User.create({ firstName: worker.firstName, lastName: worker.lastName, email: lower, phone: worker.phone, passwordHash: hash, userType: 'worker', username });
      worker.userAccount = user._id;
      await worker.save();
      await logWorkerAction(worker._id, req.user.id, 'account_created', 'worker', worker._id, `Created worker account for ${worker.fullName}`, { targetName: worker.fullName }, req);
      return res.status(201).json({ message: 'Worker account created', user: { id: user._id, email: user.email } });
    } else {
      // Reset password and ensure worker role
      const hash = await bcrypt.hash(password, 10);
      user.passwordHash = hash;
      user.userType = user.userType || 'worker';
      if (username) user.username = username;
      await user.save();
      worker.userAccount = user._id;
      await worker.save();
      await logWorkerAction(worker._id, req.user.id, 'account_reset', 'worker', worker._id, `Reset worker account credentials for ${worker.fullName}`, { targetName: worker.fullName }, req);
      return res.json({ message: 'Worker account updated', user: { id: user._id, email: user.email } });
    }
  } catch (e) {
    console.error('Create/link worker account error:', e);
    return res.status(500).json({ message: 'Failed to create/link worker account' });
  }
});

// Delete worker
router.delete('/:id', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const worker = await Worker.findOne({ 
      _id: req.params.id, 
      employerId: req.user.id 
    });
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    // Instead of deleting, mark as terminated
    worker.status = 'terminated';
    worker.isActive = false;
    worker.updatedBy = req.user.id;
    await worker.save();
    
    // Log action
    await logWorkerAction(
      worker._id,
      req.user.id,
      'worker_deleted',
      'worker',
      worker._id,
      `Terminated worker: ${worker.fullName}`,
      { targetName: worker.fullName },
      req
    );
    
    res.json({ message: 'Worker terminated successfully' });
  } catch (error) {
    console.error('Delete worker error:', error);
    res.status(500).json({ message: 'Failed to terminate worker' });
  }
});

// Get worker activity logs
router.get('/:id/activity', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const { page = 1, limit = 20, action, startDate, endDate } = req.query;
    
    const worker = await Worker.findOne({ 
      _id: req.params.id, 
      employerId: req.user.id 
    });
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    // Build query
    const query = { workerId: worker._id };
    if (action) query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const logs = await WorkerActionLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await WorkerActionLog.countDocuments(query);
    
    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

// Get worker performance metrics
router.get('/:id/performance', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const worker = await Worker.findOne({ 
      _id: req.params.id, 
      employerId: req.user.id 
    });
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    // Get activity summary
    const activitySummary = await WorkerActionLog.getActivitySummary(worker._id, days);
    
    // Get daily activity
    const dailyActivity = await WorkerActionLog.getDailyActivity(worker._id, Math.min(days, 30));
    
    // Calculate performance metrics
    const totalActions = activitySummary.reduce((sum, item) => sum + item.count, 0);
    const avgSuccessRate = activitySummary.reduce((sum, item) => sum + item.successRate, 0) / activitySummary.length || 0;
    
    res.json({
      worker: {
        id: worker._id,
        name: worker.fullName,
        position: worker.position,
        rating: worker.performance.rating
      },
      metrics: {
        totalActions,
        averageSuccessRate: Math.round(avgSuccessRate * 100),
        tasksCompleted: worker.performance.totalTasksCompleted,
        tasksAssigned: worker.performance.totalTasksAssigned,
        completionRate: worker.performance.totalTasksAssigned > 0 
          ? Math.round((worker.performance.totalTasksCompleted / worker.performance.totalTasksAssigned) * 100)
          : 0
      },
      activitySummary,
      dailyActivity
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

// Update worker privileges
router.put('/:id/privileges', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const worker = await Worker.findOne({ 
      _id: req.params.id, 
      employerId: req.user.id 
    });
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    const { privileges } = req.body;
    const oldPrivileges = { ...worker.privileges };
    
    worker.privileges = { ...worker.privileges, ...privileges };
    worker.updatedBy = req.user.id;
    await worker.save();
    
    // Log privilege changes
    const changes = [];
    Object.keys(privileges).forEach(key => {
      if (oldPrivileges[key] !== privileges[key]) {
        changes.push(`${key}: ${oldPrivileges[key]} → ${privileges[key]}`);
      }
    });
    
    await logWorkerAction(
      worker._id,
      req.user.id,
      'privileges_changed',
      'worker',
      worker._id,
      `Updated privileges for ${worker.fullName}: ${changes.join(', ')}`,
      { targetName: worker.fullName, changes, oldPrivileges, newPrivileges: privileges },
      req
    );
    
    res.json({ message: 'Privileges updated successfully', worker });
  } catch (error) {
    console.error('Update privileges error:', error);
    res.status(500).json({ message: 'Failed to update privileges' });
  }
});

// Worker's own dashboard (for logged-in workers)
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Check if user is a worker
    if (req.user.userType !== 'worker') {
      return res.status(403).json({ message: 'Access denied. Workers only.' });
    }

    // Find worker record linked to this user account
    const worker = await Worker.findOne({ userAccount: req.user.id })
      .populate('assignedProperties', 'name address city category')
      .populate('employerId', 'firstName lastName email');

    if (!worker) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    // Get worker stats
    const stats = {
      assignedProperties: worker.assignedProperties?.length || 0,
      tasksCompleted: worker.performance?.totalTasksCompleted || 0,
      tasksAssigned: worker.performance?.totalTasksAssigned || 0,
      rating: worker.performance?.rating || 0
    };

    // Get recent tasks/actions
    const recentActions = await WorkerActionLog.find({ workerId: worker._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats,
      properties: worker.assignedProperties || [],
      tasks: recentActions,
      worker: {
        id: worker._id,
        name: worker.fullName,
        position: worker.position,
        department: worker.department,
        employeeId: worker.employeeId,
        privileges: worker.privileges,
        performance: worker.performance
      }
    });
  } catch (error) {
    console.error('Worker dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

// Get dashboard summary for workers management
router.get('/dashboard/summary', requireAuth, requirePropertyOwner, async (req, res) => {
  try {
    const employerId = req.user.id;
    
    // Get worker counts by status
    const workerStats = await Worker.aggregate([
      { $match: { employerId: new mongoose.Types.ObjectId(employerId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSalary: { $sum: '$salary.amount' }
        }
      }
    ]);
    
    // Get recent activity
    const recentActivity = await WorkerActionLog.find({ employerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('workerId', 'firstName lastName position');
    
    // Get top performers (by activity)
    const topPerformers = await WorkerActionLog.aggregate([
      { 
        $match: { 
          employerId: new mongoose.Types.ObjectId(employerId),
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        } 
      },
      {
        $group: {
          _id: '$workerId',
          actionCount: { $sum: 1 },
          successRate: { $avg: { $cond: ['$success', 1, 0] } }
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'workers',
          localField: '_id',
          foreignField: '_id',
          as: 'worker'
        }
      },
      { $unwind: '$worker' }
    ]);
    
    res.json({
      workerStats,
      recentActivity,
      topPerformers,
      totalWorkers: await Worker.countDocuments({ employerId }),
      activeWorkers: await Worker.countDocuments({ employerId, status: 'active' })
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;
