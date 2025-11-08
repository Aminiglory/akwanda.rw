const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../tables/user');

const router = Router();
const Notification = require('../tables/notification');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_COOKIE = 'akw_token';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // e.g. '.onrender.com' or your apex domain

function buildCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  // Only set domain when explicitly configured to avoid local dev issues
  if (COOKIE_DOMAIN) {
    opts.domain = COOKIE_DOMAIN;
  }
  return opts;
}

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
		res.cookie(TOKEN_COOKIE, token, buildCookieOptions());
		return res.status(201).json({
			user: {
				id: user._id,
				name: `${user.firstName} ${user.lastName}`,
				email: user.email,
				userType: user.userType,
				avatar: user.avatar
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
		res.cookie(TOKEN_COOKIE, token, buildCookieOptions());
		return res.json({
			user: {
				id: user._id,
				name: `${user.firstName} ${user.lastName}`,
				email: user.email,
				userType: user.userType,
				avatar: user.avatar
			},
			token
		});
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

router.post('/logout', (req, res) => {
  const opts = buildCookieOptions();
  res.clearCookie(TOKEN_COOKIE, opts);
  return res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Overdue fines policy: apply 2% penalty and auto-block + commission notice once per overdue item
    let updated = false;
    const now = new Date();
    if (user.fines && Array.isArray(user.fines.items)) {
      for (const item of user.fines.items) {
        if (item.paid) continue;
        if (item.dueAt && item.dueAt < now) {
          // Apply 2% late penalty once
          if (!item.penaltyApplied) {
            const add = Math.round(Number(item.amount || 0) * 0.02);
            if (add > 0) {
              item.amount = Number(item.amount || 0) + add;
              user.fines.totalDue = Number(user.fines.totalDue || 0) + add;
            }
            item.penaltyApplied = true;
            updated = true;
            try {
              await Notification.create({
                type: 'fine_added',
                title: 'Late penalty applied',
                message: `A 2% late penalty has been added to your overdue fine. Please settle your dues to avoid further restrictions.`,
                recipientUser: user._id
              });
            } catch (_) {}
          }
          // Enforce commission/blocked once after due
          if (!item.commissionApplied) {
            item.commissionApplied = true;
            // Block the user if not already
            if (!user.isBlocked) {
              user.isBlocked = true;
              user.blockedAt = new Date();
              user.blockReason = item.reason || 'Unpaid fine overdue';
              updated = true;
              try {
                await Notification.create({
                  type: 'account_blocked',
                  title: 'Account Deactivated',
                  message: 'Your account has been deactivated due to overdue unpaid dues. Please pay to reactivate.',
                  recipientUser: user._id
                });
              } catch (_) {}
            }
            try {
              await Notification.create({
                type: 'commission_due',
                title: 'Commission/Fine due',
                message: 'Your dues are overdue. Please pay to restore full account access.',
                recipientUser: user._id
              });
            } catch (_) {}
          }
        }
      }
      if (updated) await user.save();
    }

    return res.json({
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType,
        avatar: user.avatar,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        bio: user.bio,
        isBlocked: !!user.isBlocked
      }
    });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
