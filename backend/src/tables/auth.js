const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../tables/user');

const router = Router();
const Notification = require('../tables/notification');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_COOKIE = 'akw_token';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // e.g. '.onrender.com' or your apex domain
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || JWT_SECRET;

const SECURITY_QUESTION_BANK = [
	{ key: 'first_school_name', label: 'First school name' },
	{ key: 'favorite_childhood_food', label: 'Favorite childhood food' },
	{ key: 'birth_city', label: 'City you were born in' },
	{ key: 'first_pet_name', label: 'Name of your first pet' },
	{ key: 'mothers_maiden_name', label: "Mother’s maiden name" },
	{ key: 'best_friend_childhood', label: 'Name of your best childhood friend' },
	{ key: 'first_job_company', label: 'Name of your first job company' },
	{ key: 'favorite_teacher', label: 'Name of your favorite teacher' },
	{ key: 'favorite_sport', label: 'Favorite sport' },
	{ key: 'favorite_movie_childhood', label: 'Favorite childhood movie' }
];

const SECURITY_RECOVERY_MAX_ATTEMPTS = 3;
const SECURITY_RECOVERY_LOCK_MINUTES = 15;

function buildCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  // In production we want a secure, cross-site cookie (for use with a separate frontend origin).
  // In local/dev over plain HTTP, a `secure` + `SameSite=None` cookie will be rejected by browsers,
  // which causes sessions to be lost on refresh. So we relax these flags when not in production.
  const opts = {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
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

function signResetToken(payload) {
	return jwt.sign(payload, RESET_TOKEN_SECRET, { expiresIn: '10m' });
}

function verifyResetToken(token) {
	return jwt.verify(token, RESET_TOKEN_SECRET);
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

function normalizeAnswer(a) {
	return String(a || '').trim().toLowerCase();
}

function safeSecurityQuestions(u) {
	const list = Array.isArray(u.securityQuestions) ? u.securityQuestions : [];
	const bankByKey = new Map(SECURITY_QUESTION_BANK.map((q) => [q.key, q.label]));
	return list.map((q, idx) => {
		const k = String(q?.questionKey || '').trim();
		const labelFromKey = k ? bankByKey.get(k) : undefined;
		return { index: idx, questionKey: k || undefined, question: labelFromKey || q.question };
	});
}

function hasValidSecurityQuestionsList(list) {
	if (!Array.isArray(list) || list.length !== 3) return false;
	const bank = new Set(SECURITY_QUESTION_BANK.map((q) => q.key));
	const normalizedLabelToKey = new Map(
		SECURITY_QUESTION_BANK.map((q) => [String(q.label).trim().toLowerCase(), q.key])
	);
	const derivedKeys = [];
	for (const item of list) {
		let k = String(item?.questionKey || '').trim();
		if (!k) {
			const legacyLabel = String(item?.question || '').trim().toLowerCase();
			k = normalizedLabelToKey.get(legacyLabel) || '';
		}
		if (!k || !bank.has(k)) return false;
		if (!item?.answerHash) return false;
		derivedKeys.push(k);
	}
	const uniq = new Set(derivedKeys.map((x) => String(x).trim()));
	return uniq.size === 3;
}

function validateAndNormalizeSecurityQuestionsInput(input) {
	if (!Array.isArray(input) || input.length !== 3) {
		return { ok: false, message: 'Exactly 3 security questions are required' };
	}
	const bank = new Map(SECURITY_QUESTION_BANK.map((q) => [q.key, q.label]));
	const seen = new Set();
	const normalized = [];
	for (const item of input) {
		const questionKey = String(item?.questionKey || '').trim();
		const answer = normalizeAnswer(item?.answer);
		if (!questionKey || !bank.has(questionKey)) {
			return { ok: false, message: 'Invalid security question selection' };
		}
		if (seen.has(questionKey)) {
			return { ok: false, message: 'Security questions must be unique' };
		}
		if (!answer) {
			return { ok: false, message: 'Each security question must include an answer' };
		}
		seen.add(questionKey);
		normalized.push({ questionKey, question: bank.get(questionKey), answer });
	}
	return { ok: true, value: normalized };
}

router.post('/register', async (req, res) => {
	try {
		const { firstName, lastName, email, phone, password, userType, securityQuestions } = req.body;
		if (!firstName || !lastName || !email || !phone || !password) {
			return res.status(400).json({ message: 'Missing required fields' });
		}
		// Validate security questions (predefined list)
		const validated = validateAndNormalizeSecurityQuestionsInput(securityQuestions);
		if (!validated.ok) return res.status(400).json({ message: validated.message });
		const sq = [];
		for (const item of validated.value) {
			sq.push({ questionKey: item.questionKey, question: item.question, answerHash: await bcrypt.hash(item.answer, 10) });
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
			userType: userType || 'guest',
			securityQuestions: sq,
			securityQuestionsSetAt: sq.length ? new Date() : undefined
		});
		const token = signToken({ id: user._id, email: user.email, userType: user.userType, name: `${user.firstName} ${user.lastName}` });
		res.cookie(TOKEN_COOKIE, token, buildCookieOptions());
		return res.status(201).json({
			user: {
				id: user._id,
				name: `${user.firstName} ${user.lastName}`,
				email: user.email,
				userType: user.userType,
				avatar: user.avatar,
				securityQuestionsSet: hasValidSecurityQuestionsList(user.securityQuestions)
			},
			token
		});
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Public endpoint: get security question prompts for an account (by email)
router.get('/security-questions', async (req, res) => {
	try {
		const email = String(req.query.email || '').toLowerCase().trim();
		if (!email) return res.status(400).json({ message: 'Email is required' });
		const user = await User.findOne({ email }).select('securityQuestions');
		if (!user) return res.status(404).json({ message: 'No account found with that email' });
		const qs = safeSecurityQuestions(user);
		if (!hasValidSecurityQuestionsList(user.securityQuestions)) return res.status(400).json({ message: 'Security questions are not set for this account' });
		return res.json({ questions: qs });
	} catch (e) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Logged-in endpoint: set security questions (required for existing accounts)
router.post('/security-questions', authMiddleware, async (req, res) => {
	try {
		const { securityQuestions, currentAnswers } = req.body || {};
		const validated = validateAndNormalizeSecurityQuestionsInput(securityQuestions);
		if (!validated.ok) return res.status(400).json({ message: validated.message });
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: 'User not found' });

		const existingSq = Array.isArray(user.securityQuestions) ? user.securityQuestions : [];
		if (hasValidSecurityQuestionsList(existingSq)) {
			// Do not allow editing without verifying all current answers
			if (!Array.isArray(currentAnswers) || currentAnswers.length !== 3) {
				return res.status(403).json({ message: 'Verification required to change security questions' });
			}
			for (let i = 0; i < 3; i++) {
				const provided = normalizeAnswer(currentAnswers[i]);
				const ok = await bcrypt.compare(provided, existingSq[i].answerHash);
				if (!ok) return res.status(403).json({ message: 'Verification required to change security questions' });
			}
		}
		const sq = [];
		for (const item of validated.value) {
			sq.push({ questionKey: item.questionKey, question: item.question, answerHash: await bcrypt.hash(item.answer, 10) });
		}
		user.securityQuestions = sq;
		user.securityQuestionsSetAt = new Date();
		await user.save();
		return res.json({ message: 'Security questions saved', securityQuestionsSet: true });
	} catch (e) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Public endpoint: verify security answers + reset password
router.post('/reset-with-security-questions', async (req, res) => {
	try {
		const { email, resetToken, newPassword } = req.body || {};
		const em = String(email || '').toLowerCase().trim();
		if (!em || !resetToken || !newPassword) {
			return res.status(400).json({ message: 'Email, reset token and new password are required' });
		}
		let decoded;
		try {
			decoded = verifyResetToken(String(resetToken));
		} catch (_) {
			return res.status(401).json({ message: 'Reset token is invalid or expired' });
		}
		if (String(decoded?.email || '') !== em || decoded?.purpose !== 'password_reset') {
			return res.status(401).json({ message: 'Reset token is invalid or expired' });
		}
		if (String(newPassword).length < 6) {
			return res.status(400).json({ message: 'New password must be at least 6 characters' });
		}
		const user = await User.findOne({ email: em }).select('passwordHash');
		if (!user) {
			return res.status(404).json({ message: 'No account found with that email' });
		}
		user.passwordHash = await bcrypt.hash(String(newPassword), 10);
		await user.save();
		return res.json({ message: 'Password has been reset. You can now log in with your new password.' });
	} catch (e) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Public endpoint: verify security answers and return a short-lived reset token
router.post('/verify-security-answers', async (req, res) => {
	try {
		const { email, answers } = req.body || {};
		const em = String(email || '').toLowerCase().trim();
		if (!em || !Array.isArray(answers) || answers.length !== 3) {
			return res.status(400).json({ message: 'Email and 3 answers are required' });
		}
		const user = await User.findOne({ email: em }).select('securityQuestions securityRecoveryFailedAttempts securityRecoveryLockedUntil');
		if (!user) {
			return res.status(404).json({ message: 'No account found with that email' });
		}
		const now = new Date();
		if (user.securityRecoveryLockedUntil && user.securityRecoveryLockedUntil > now) {
			return res.status(429).json({ message: 'Too many failed attempts. Try again later.' });
		}
		// Lock expired -> reset counters
		if (user.securityRecoveryLockedUntil && user.securityRecoveryLockedUntil <= now) {
			user.securityRecoveryLockedUntil = undefined;
			user.securityRecoveryFailedAttempts = 0;
			await user.save();
		}
		const sq = Array.isArray(user.securityQuestions) ? user.securityQuestions : [];
		if (!hasValidSecurityQuestionsList(sq)) {
			return res.status(400).json({ message: 'Security questions are not set for this account' });
		}
		let allOk = true;
		for (let i = 0; i < 3; i++) {
			const provided = normalizeAnswer(answers[i]);
			const ok = await bcrypt.compare(provided, sq[i].answerHash);
			if (!ok) {
				allOk = false;
				break;
			}
		}
		if (!allOk) {
			user.securityRecoveryFailedAttempts = Number(user.securityRecoveryFailedAttempts || 0) + 1;
			if (user.securityRecoveryFailedAttempts >= SECURITY_RECOVERY_MAX_ATTEMPTS) {
				user.securityRecoveryFailedAttempts = SECURITY_RECOVERY_MAX_ATTEMPTS;
				user.securityRecoveryLockedUntil = new Date(Date.now() + SECURITY_RECOVERY_LOCK_MINUTES * 60 * 1000);
				await user.save();
				return res.status(429).json({ message: 'Too many failed attempts. Try again later.' });
			}
			await user.save();
			return res.status(401).json({ message: 'Security answers are incorrect' });
		}
		// success -> reset counters
		user.securityRecoveryFailedAttempts = 0;
		user.securityRecoveryLockedUntil = undefined;
		await user.save();
		const token = signResetToken({ purpose: 'password_reset', email: em });
		return res.json({ resetToken: token });
	} catch (e) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Simple no-email password reset using email + phone verification
router.post('/reset-with-phone', async (req, res) => {
	try {
		return res.status(410).json({ message: 'Password reset by phone is disabled. Use security questions.' });
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
				avatar: user.avatar,
				securityQuestionsSet: hasValidSecurityQuestionsList(user.securityQuestions)
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
                recipientUser: user._id,
                audience: 'host'
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
                  recipientUser: user._id,
                  audience: 'host'
                });
              } catch (_) {}
            }
            try {
              await Notification.create({
                type: 'commission_due',
                title: 'Commission/Fine due',
                message: 'Your dues are overdue. Please pay to restore full account access.',
                recipientUser: user._id,
                audience: 'host'
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
			isBlocked: !!user.isBlocked,
			securityQuestionsSet: hasValidSecurityQuestionsList(user.securityQuestions)
      }
    });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
