const { Router } = require('express');
const jwt = require('jsonwebtoken');
const CarClient = require('../tables/carClient');

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

// Create client
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, type, companyName, notes } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const client = await CarClient.create({
      owner: req.user.id,
      name: String(name).trim(),
      email: email || '',
      phone: phone || '',
      type: type || 'individual',
      companyName: companyName || '',
      notes: notes || '',
    });

    return res.status(201).json({ client });
  } catch (e) {
    console.error('CarClient create error', e);
    return res.status(500).json({ message: 'Failed to create client' });
  }
});

// List clients
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, type } = req.query;
    const query = { owner: req.user.id };

    if (type) query.type = type;
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      query.$or = [
        { name: rx },
        { email: rx },
        { phone: rx },
        { companyName: rx },
      ];
    }

    const clients = await CarClient.find(query).sort({ createdAt: -1 });
    return res.json({ clients });
  } catch (e) {
    console.error('CarClient list error', e);
    return res.status(500).json({ message: 'Failed to load clients' });
  }
});

// Update client
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const client = await CarClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const isOwner = String(client.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const { name, email, phone, type, companyName, notes } = req.body || {};
    if (name !== undefined) client.name = String(name).trim();
    if (email !== undefined) client.email = email || '';
    if (phone !== undefined) client.phone = phone || '';
    if (type !== undefined) client.type = type || 'individual';
    if (companyName !== undefined) client.companyName = companyName || '';
    if (notes !== undefined) client.notes = notes || '';

    await client.save();
    return res.json({ client });
  } catch (e) {
    console.error('CarClient update error', e);
    return res.status(500).json({ message: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const client = await CarClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const isOwner = String(client.owner) === String(req.user.id);
    const isAdmin = req.user.userType === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    await client.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    console.error('CarClient delete error', e);
    return res.status(500).json({ message: 'Failed to delete client' });
  }
});

module.exports = router;
