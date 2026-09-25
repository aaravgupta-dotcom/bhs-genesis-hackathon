// server/routes/pipeline.js
// REST + SSE endpoints for the game generation pipeline

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runPipeline, getJob } from '../services/pipeline.js';
import { initJob, registerClient, unregisterClient, getLog, emit } from '../utils/logger.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

/**
 * POST /api/pipeline/start
 * Start a new game generation pipeline job
 */
router.post('/start', authMiddleware, async (req, res) => {
  const { prompt, options } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Please provide a game description (at least 5 characters)' });
  }

  // The pipeline has a certified local game template, so generation remains usable
  // when a provider key is missing or temporarily unavailable.

  const jobId = uuidv4();
  initJob(jobId);

  const userId = req.user?.id || 'anonymous';
  const userSettings = req.user?.settings ? (typeof req.user.settings === 'string' ? JSON.parse(req.user.settings) : req.user.settings) : {};
  const runOpts = {
    maxHealRetries: options?.maxHealRetries || userSettings?.maxHealRetries || 5,
    ...options,
  };

  // Start pipeline async — don't await
  runPipeline(jobId, prompt.trim(), userId, runOpts).catch(err => {
    console.error(`Pipeline ${jobId} crashed:`, err);
    emit(jobId, 'pipeline_error', `Fatal pipeline error: ${err.message}`);
  });

  res.json({ jobId });
});

/**
 * GET /api/pipeline/stream/:jobId
 * SSE stream for real-time log events
 */
router.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send heartbeat immediately
  res.write(': heartbeat\n\n');

  // Send any existing log events (catch-up for reconnects)
  const existingLog = getLog(jobId);
  for (const event of existingLog) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  registerClient(jobId, res);

  // Heartbeat every 20s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterClient(jobId, res);
  });
});

/**
 * GET /api/pipeline/status/:jobId
 * Get current job status + all data
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Return job without the full code (too large for status polling)
  const { currentCode, allAttempts, ...rest } = job;
  res.json({
    ...rest,
    attemptCount: allAttempts?.length || 0,
    hasCode: !!currentCode,
  });
});

/**
 * GET /api/pipeline/log/:jobId
 * Get full event log for a job
 */
router.get('/log/:jobId', (req, res) => {
  const { jobId } = req.params;
  const log = getLog(jobId);
  res.json({ jobId, events: log });
});

export default router;
