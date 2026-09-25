// server/index.js
// Express server entry point — NEVER exposes API keys to the client

import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pipelineRoutes from './routes/pipeline.js';
import authRoutes from './routes/auth.js';
import gamesRoutes from './routes/games.js';
import battleRoutes from './routes/battle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const hasNvidiaApiKey = [process.env.NVIDIA_API_KEYS, process.env.NVIDIA_API_KEY]
  .some((value) => String(value || '').split(',').some((key) => key.trim().length > 0));
const GAMES_DIR = path.join(__dirname, 'games');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Ensure static directories exist
for (const dir of [GAMES_DIR, SCREENSHOTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Static file serving ──────────────────────────────────────────────────────
// Serve generated games and screenshots
app.use('/games', express.static(GAMES_DIR, {
  setHeaders: (res) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'");
  },
}));
app.use('/screenshots', express.static(SCREENSHOTS_DIR));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/battle', battleRoutes);

// ── Download endpoint ─────────────────────────────────────────────────────────
app.get('/api/download/:jobId/:attempt', (req, res) => {
  const { jobId, attempt } = req.params;
  const filePath = path.join(GAMES_DIR, `${jobId}_v${attempt}.html`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Game file not found' });
  }

  res.download(filePath, 'game.html');
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: hasNvidiaApiKey,
    timestamp: new Date().toISOString(),
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start server with automatic EADDRINUSE retry ─────────────────────────────
let serverInstance = null;
function startServer(retries = 10) {
  serverInstance = app.listen(PORT, () => {
    console.log(`\n🎮 Game Architect Server running on http://localhost:${PORT}`);
    console.log(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✓ configured (Qwen 3.8 27B & OpenAI GPT OSS 120B)' : '✗ MISSING'}`);
    console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ configured' : '✗ MISSING'}`);
    console.log(`   NVIDIA_API_KEY: ${process.env.NVIDIA_API_KEY ? '✓ configured' : '✗ MISSING'}`);
    console.log(`   PRIMARY_MODEL: ${process.env.PRIMARY_MODEL || 'qwen/qwen3.8-27b'} (High-Speed Engine)`);
    console.log(`   ARENA: ${process.env.ARENA_MODEL_A || 'qwen/qwen3.8-27b'} vs ${process.env.ARENA_MODEL_B || 'openai/gpt-oss-120b'}`);
    console.log(`   Games dir: ${GAMES_DIR}`);
    console.log(`   Screenshots dir: ${SCREENSHOTS_DIR}\n`);
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      console.log(`[Server] Port ${PORT} busy, retrying in 800ms (${retries} retries remaining)...`);
      setTimeout(() => startServer(retries - 1), 800);
    } else {
      console.error('[Server] Listen error:', err.message);
    }
  });
}


process.on('SIGTERM', () => { if (serverInstance) serverInstance.close(); });
process.on('SIGINT', () => { if (serverInstance) serverInstance.close(); });

startServer();





