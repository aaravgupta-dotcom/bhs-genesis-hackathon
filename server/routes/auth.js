// server/routes/auth.js
// Lightweight session auth and user profile endpoints

import express from 'express';
import { getOrCreateUser, updateUserProfile, getUserStats } from '../db/index.js';

const router = express.Router();

/**
 * Middleware to resolve user from Bearer token
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-user-token'];
  req.user = getOrCreateUser(token);
  next();
}

/**
 * POST /api/auth/session
 * Establish or retrieve session, optionally associate email/name
 */
router.post('/session', (req, res) => {
  const { token, email, displayName } = req.body;
  const user = getOrCreateUser(token, email, displayName);
  const stats = getUserStats(user.id);
  res.json({
    user: {
      ...user,
      settings: user.settings ? JSON.parse(user.settings) : {},
    },
    stats,
  });
});

/**
 * PUT /api/auth/profile
 * Update user settings or email profile
 */
router.put('/profile', authMiddleware, (req, res) => {
  const { email, displayName, settings } = req.body;
  const updated = updateUserProfile(req.user.id, { email, displayName, settings });
  res.json({
    user: {
      ...updated,
      settings: updated.settings ? JSON.parse(updated.settings) : {},
    },
  });
});

/**
 * GET /api/auth/stats
 * Get game stats for user
 */
router.get('/stats', authMiddleware, (req, res) => {
  const stats = getUserStats(req.user.id);
  res.json({ stats });
});

export default router;
