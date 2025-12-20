const { Router } = require('express');
const jwt = require('jsonwebtoken');
const CarClient = require('../tables/carClient');
const CarRental = require('../tables/carRental');
const CarContract = require('../tables/carContract');

const router = Router();
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

async function ensureClientForOwner(clientId, user) {
  if (!clientId) return null;
  const client = await CarClient.findById(clientId).select('owner name');
  if (!client) return null;
  const isOwner = String(client.owner) === String(user.id);
  const isAdmin = user.userType === 'admin';
  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  return client;
}

async function ensureCarForOwner(carId, user) {
  if (!carId) return null;
  const car = await CarRental.findById(carId).select('owner vehicleName brand model');
  if (!car) return null;
  const isOwner = String(car.owner) === String(user.id);
  const isAdmin = user.userType === 'admin';
  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  return car;
}

// Create contract
router.post('/', requireAuth, async (req, res) => {
  try {
    const { client: clientId, car: carId, startDate, endDate, amount, status, fileUrl, notes } = req.body || {};
    if (!clientId || !startDate || !endDate || amount === undefined) {
      return res.status(400).json({ message: 'client, startDate, endDate and amount are required' });
    }

    const client = await ensureClientForOwner(clientId, req.user);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    let car = null;
    if (carId) {
      car = await ensureCarForOwner(carId, req.user);
      if (!car) return res.status(404).json({ message: 'Car not found' });
    }

    const contract = await CarContract.create({
      owner: req.user.id,
      client: client._id,
      car: car ? car._id : undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      amount: Number(amount),
      status: status || 'draft',
      fileUrl: fileUrl || '',
      notes: notes || '',
    });

    return res.status(201).json({ contract });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    console.error('CarContract create error', e);
    return res.status(500).json({ message: 'Failed to create contract' });
  }
});

// List contracts
router.get('/', requireAuth, async (req, res) => {
  try {
    const { client: clientId, car: carId, status, from, to } = req.query;

    const query = { owner: req.user.id };
    if (clientId) query.client = clientId;
    if (carId) query.car = carId;
    if (status) query.status = status;

    if (from || to) {
      query.startDate = {};
      if (from) query.startDate.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.startDate.$lte = end;
      }
    }

    const contracts = await CarContract.find(query)
      .populate('client', 'name email')
      .populate('car', 'vehicleName brand model')
      .sort({ startDate: -1, createdAt: -1 });

    return res.json({ contracts });
  } catch (e) {
    console.error('CarContract list error', e);
    return res.status(500).json({ message: 'Failed to load contracts' });
  }
});

// Summary / reports for contracts
// GET /api/car-contracts/summary?client=&car=&from=&to=
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { client: clientId, car: carId, from, to } = req.query;

    const match = { owner: req.user.id };
    if (clientId) match.client = clientId;
    if (carId) match.car = carId;

    if (from || to) {
      match.startDate = {};
      if (from) match.startDate.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        match.startDate.$lte = end;
      }
    }

    const [byStatus, totals] = await Promise.all([
      CarContract.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
      CarContract.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const overall = totals[0] || { count: 0, totalAmount: 0 };

    const statusMap = {
      draft: { count: 0, totalAmount: 0 },
      active: { count: 0, totalAmount: 0 },
      completed: { count: 0, totalAmount: 0 },
      cancelled: { count: 0, totalAmount: 0 },
    };
    for (const row of byStatus) {
      if (!row || !row._id) continue;
      const key = row._id;
      if (!statusMap[key]) statusMap[key] = { count: 0, totalAmount: 0 };
      statusMap[key].count = row.count || 0;
      statusMap[key].totalAmount = row.totalAmount || 0;
    }

    return res.json({
      totalContracts: overall.count || 0,
      totalAmount: overall.totalAmount || 0,
      byStatus: statusMap,
    });
  } catch (e) {
    console.error('CarContract summary error', e);
    return res.status(500).json({ message: 'Failed to load contract summary' });
  }
});

// Update contract
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const contract = await CarContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    const isOwner = String(contract.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const { startDate, endDate, amount, status, fileUrl, notes } = req.body || {};
    if (startDate !== undefined) contract.startDate = new Date(startDate);
    if (endDate !== undefined) contract.endDate = new Date(endDate);
    if (amount !== undefined) contract.amount = Number(amount);
    if (status !== undefined) contract.status = status || 'draft';
    if (fileUrl !== undefined) contract.fileUrl = fileUrl || '';
    if (notes !== undefined) contract.notes = notes || '';

    await contract.save();
    return res.json({ contract });
  } catch (e) {
    console.error('CarContract update error', e);
    return res.status(500).json({ message: 'Failed to update contract' });
  }
});

// Delete contract
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const contract = await CarContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    const isOwner = String(contract.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    await contract.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    console.error('CarContract delete error', e);
    return res.status(500).json({ message: 'Failed to delete contract' });
  }
});

module.exports = router;
