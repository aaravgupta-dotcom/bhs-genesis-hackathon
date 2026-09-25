// server/routes/battle.js
// REST & SSE endpoints for AI vs AI Game Generation Arena (DeepSeek vs Kimi)

import express from 'express';
import { startBattle, getActiveBattle } from '../services/arena.js';
import { initJob, registerClient, unregisterClient, getLog } from '../utils/logger.js';
import { getBattleDetail, listUserBattles, getOrCreateUser } from '../db/index.js';

const router = express.Router();

/**
 * Helper to extract or provision user from auth token
 */
function getUserId(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-user-token'];
  try {
    const user = getOrCreateUser(token || null);
    return user ? user.id : 'anonymous';
  } catch (e) {
    return 'anonymous';
  }
}

/**
 * POST /api/battle/start
 * Initiate a head-to-head battle between DeepSeek and Kimi
 */
router.post('/start', async (req, res) => {
  const { prompt, options = {} } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const userId = getUserId(req);
  const battleId = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Initialize event stream job
  initJob(battleId);

  // Launch parallel dual-pipeline battle in the background
  startBattle(battleId, prompt.trim(), userId, options).catch((err) => {
    console.error(`Battle ${battleId} unhandled failure:`, err);
  });

  res.json({
    ok: true,
    battleId,
    message: 'Battle ignited — DeepSeek vs Kimi race underway',
  });
});

/**
 * GET /api/battle/stream/:battleId
 * Real-time SSE stream delivering interleaved dual-model progress events
 */
router.get('/stream/:battleId', (req, res) => {
  const { battleId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  registerClient(battleId, res);

  // Send historical log if connecting after start
  const history = getLog(battleId);
  for (const event of history) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  req.on('close', () => {
    unregisterClient(battleId, res);
  });
});

/**
 * GET /api/battle/:battleId
 * Get current snapshot or complete summary of a battle
 */
router.get('/:battleId', (req, res) => {
  const { battleId } = req.params;

  // Check active in-memory battle first
  const active = getActiveBattle(battleId);
  if (active) {
    return res.json({ battle: active });
  }

  // Fallback to database
  const record = getBattleDetail(battleId);
  if (!record) {
    return res.status(404).json({ error: 'Battle not found' });
  }

  res.json({ battle: record });
});

/**
 * GET /api/battles (or /api/battle/history)
 * List past battles
 */
router.get('/', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-user-token'];
  const showAll = req.query.all === 'true' || !token;
  const userId = showAll ? 'all' : getUserId(req);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);

  const battles = listUserBattles(userId, { limit, offset });
  res.json({ battles });
});

export default router;
