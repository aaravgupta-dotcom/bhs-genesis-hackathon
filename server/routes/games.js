// server/routes/games.js
// Endpoints for querying games history, library search, filtering, and detail replay

import express from 'express';
import { authMiddleware } from './auth.js';
import { listUserGames, countUserGames, listAllGames, countAllGames, getFullGameDetail } from '../db/index.js';

const router = express.Router();

/**
 * GET /api/games
 * List games for the current user or global showcase with search, filter, sorting, and pagination
 */
router.get('/', authMiddleware, (req, res) => {
  const {
    scope = 'all', // default to 'all' so users always see available games, or filter by 'user'
    status = 'all',
    genre = 'all',
    search = '',
    sort = 'newest',
    page = 1,
    limit = 12,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * limitNum;

  const queryFn = (scope === 'user' && req.user?.id) ? listUserGames : listAllGames;
  const countFn = (scope === 'user' && req.user?.id) ? countUserGames : countAllGames;
  const firstArg = (scope === 'user' && req.user?.id) ? req.user.id : { status, genre, search, sort, limit: limitNum, offset };

  let games;
  let total;

  if (scope === 'user' && req.user?.id) {
    games = listUserGames(req.user.id, { status, genre, search, sort, limit: limitNum, offset });
    total = countUserGames(req.user.id, { status, genre, search });
  } else {
    games = listAllGames({ status, genre, search, sort, limit: limitNum, offset });
    total = countAllGames({ status, genre, search });
  }

  res.json({
    games,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasMore: offset + games.length < total,
    },
  });
});

/**
 * GET /api/games/:id
 * Retrieve full game detail: all build attempts, test results, heal logs, and event logs for replay
 */
router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const game = getFullGameDetail(id);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({ game });
});

export default router;
