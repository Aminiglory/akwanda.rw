const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../tables/user');

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_COOKIE = 'akw_token';

function signToken(payload) {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
	const token = req.cookies[TOKEN_COOKIE] || (req.headers.authorization || '').replace('Bearer ', '');
	if (!token) return res.status(401).json({ message: 'Unauthorized' });
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (e) {
		return res.status(401).json({ message: 'Invalid token' });
	}
}

router.post('/register', async (req, res) => {
	try {
		const { firstName, lastName, email, phone, password, userType } = req.body;
		if (!firstName || !lastName || !email || !phone || !password) {
			return res.status(400).json({ message: 'Missing required fields' });
		}
		const existing = await User.findOne({ email: email.toLowerCase() });
		if (existing) return res.status(409).json({ message: 'Email already registered' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({
			firstName,
			lastName,
			email: email.toLowerCase(),
			phone,
			passwordHash,
			userType: userType || 'guest'
		});
		const token = signToken({ id: user._id, email: user.email, userType: user.userType, name: `${user.firstName} ${user.lastName}` });
		res.cookie(TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'lax' });
		return res.status(201).json({
			user: {
				id: user._id,
				name: `${user.firstName} ${user.lastName}`,
				email: user.email,
				userType: user.userType
			},
			token
		});
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) return res.status(401).json({ message: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
		const token = signToken({ id: user._id, email: user.email, userType: user.userType, name: `${user.firstName} ${user.lastName}` });
		res.cookie(TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'lax' });
		return res.json({
			user: {
				id: user._id,
				name: `${user.firstName} ${user.lastName}`,
				email: user.email,
				userType: user.userType
			},
			token
		});
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

router.post('/logout', (req, res) => {
	res.clearCookie(TOKEN_COOKIE);
	return res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, async (req, res) => {
	const user = await User.findById(req.user.id).select('_id firstName lastName email userType');
	if (!user) return res.status(404).json({ message: 'User not found' });
	return res.json({
		user: {
			id: user._id,
			name: `${user.firstName} ${user.lastName}`,
			email: user.email,
			userType: user.userType
		}
	});
});

module.exports = router;


