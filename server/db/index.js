// server/db/index.js
// SQLite database setup, schema migration, and repository accessors

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'game_architect.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT,
    token TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    settings TEXT
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    title TEXT,
    genre TEXT,
    spec_json TEXT,
    status TEXT NOT NULL,
    final_attempt INTEGER DEFAULT 1,
    heal_cycles INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    game_url TEXT,
    final_code TEXT,
    elapsed_sec REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
  CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

  CREATE TABLE IF NOT EXISTS game_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    code TEXT NOT NULL,
    test_result_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS game_heal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    cycle INTEGER NOT NULL,
    attempt INTEGER NOT NULL,
    failed_assertions_json TEXT,
    diagnosis TEXT,
    rationale TEXT,
    patched INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS game_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    data_json TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);

  CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    title TEXT,
    genre TEXT,
    spec_json TEXT,
    rag_context_json TEXT,
    status TEXT NOT NULL,
    winner TEXT,
    winner_reason TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_battles_user_id ON battles(user_id);
  CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles(created_at);

  CREATE TABLE IF NOT EXISTS battle_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    status TEXT NOT NULL,
    final_attempt INTEGER DEFAULT 1,
    heal_cycles INTEGER DEFAULT 0,
    pass_rate REAL DEFAULT 0,
    passed_assertions INTEGER DEFAULT 0,
    total_assertions INTEGER DEFAULT 0,
    loc INTEGER DEFAULT 0,
    elapsed_sec REAL DEFAULT 0,
    game_url TEXT,
    thumbnail_url TEXT,
    final_code TEXT,
    test_result_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(battle_id) REFERENCES battles(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_battle_runs_battle_id ON battle_runs(battle_id);

  CREATE TABLE IF NOT EXISTS battle_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    data_json TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(battle_id) REFERENCES battles(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_battle_events_battle_id ON battle_events(battle_id);
`);

// Ensure default anonymous user exists for unauthenticated sessions
db.prepare(`
  INSERT OR IGNORE INTO users (id, email, display_name, token, created_at, settings)
  VALUES ('anonymous', NULL, 'Anonymous Architect', 'tok_anon_default', 0, '{}')
`).run();

export default db;

// ── User Management ─────────────────────────────────────────────────────────

export function getOrCreateUser(token, email = null, displayName = null) {
  if (token) {
    const existing = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
    if (existing) return existing;
  }

  // Create new user
  const id = 'usr_' + Math.random().toString(36).substring(2, 10);
  const newToken = token || 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const now = Date.now();
  const defaultSettings = JSON.stringify({
    maxHealRetries: 5,
    preferredGenre: 'all',
    themeDensity: 'comfortable',
  });

  const stmt = db.prepare(`
    INSERT INTO users (id, email, display_name, token, created_at, settings)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, email, displayName || (email ? email.split('@')[0] : 'Architect #' + id.slice(-4)), newToken, now, defaultSettings);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function updateUserProfile(id, { email, displayName, settings }) {
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!current) return null;

  const newEmail = email !== undefined ? email : current.email;
  const newName = displayName !== undefined ? displayName : current.display_name;
  const newSettings = settings ? JSON.stringify(settings) : current.settings;

  db.prepare(`
    UPDATE users SET email = ?, display_name = ?, settings = ? WHERE id = ?
  `).run(newEmail, newName, newSettings, id);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ── Game Management ─────────────────────────────────────────────────────────

export function createGameRecord({ id, userId, prompt }) {
  const now = Date.now();
  const user = userId ? db.prepare('SELECT id FROM users WHERE id = ?').get(userId) : null;
  const validUserId = user ? user.id : 'anonymous';
  db.prepare(`
    INSERT INTO games (id, user_id, prompt, status, created_at, updated_at)
    VALUES (?, ?, ?, 'running', ?, ?)
  `).run(id, validUserId, prompt, now, now);
}


export function updateGameSpec(id, spec) {
  db.prepare(`
    UPDATE games 
    SET title = ?, genre = ?, spec_json = ?, updated_at = ?
    WHERE id = ?
  `).run(spec.title || 'Untitled Game', spec.genre || 'Action', JSON.stringify(spec), Date.now(), id);
}

export function saveBuildAttempt(gameId, attemptNumber, code, testResult = null) {
  db.prepare(`
    INSERT INTO game_attempts (game_id, attempt_number, code, test_result_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(gameId, attemptNumber, code, testResult ? JSON.stringify(testResult) : null, Date.now());
}

export function updateBuildAttemptTest(gameId, attemptNumber, testResult) {
  db.prepare(`
    UPDATE game_attempts
    SET test_result_json = ?
    WHERE game_id = ? AND attempt_number = ?
  `).run(JSON.stringify(testResult), gameId, attemptNumber);
}

export function saveHealLog(gameId, { cycle, attempt, failedAssertions, diagnosis, rationale }) {
  db.prepare(`
    INSERT INTO game_heal_logs (game_id, cycle, attempt, failed_assertions_json, diagnosis, rationale, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    gameId,
    cycle,
    attempt,
    JSON.stringify(failedAssertions || []),
    diagnosis || '',
    rationale || '',
    Date.now()
  );
}

export function recordGameEvent(gameId, type, message, data = {}) {
  db.prepare(`
    INSERT INTO game_events (game_id, event_type, message, data_json, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(gameId, type, message, JSON.stringify(data), Date.now());
}

export function finalizeGameRecord(id, { status, finalAttempt, healCycles, thumbnailUrl, gameUrl, finalCode, elapsedSec }) {
  db.prepare(`
    UPDATE games 
    SET status = ?, final_attempt = ?, heal_cycles = ?, thumbnail_url = ?, game_url = ?, final_code = ?, elapsed_sec = ?, updated_at = ?
    WHERE id = ?
  `).run(
    status,
    finalAttempt || 1,
    healCycles || 0,
    thumbnailUrl || null,
    gameUrl || null,
    finalCode || null,
    elapsedSec || null,
    Date.now(),
    id
  );
}

// ── Querying Library & History ──────────────────────────────────────────────

export function listUserGames(userId, { status, search, genre, limit = 20, offset = 0, sort = 'newest' } = {}) {
  let query = 'SELECT * FROM games WHERE user_id = ?';
  const params = [userId];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (genre && genre !== 'all') {
    query += ' AND LOWER(genre) = LOWER(?)';
    params.push(genre);
  }

  if (search && search.trim()) {
    query += ' AND (LOWER(title) LIKE ? OR LOWER(prompt) LIKE ?)';
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term);
  }

  if (sort === 'oldest') {
    query += ' ORDER BY created_at ASC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const games = db.prepare(query).all(...params);

  // Parse specs for each game
  return games.map(g => ({
    ...g,
    spec: g.spec_json ? JSON.parse(g.spec_json) : null,
  }));
}

export function countUserGames(userId, { status, search, genre } = {}) {
  let query = 'SELECT COUNT(*) as count FROM games WHERE user_id = ?';
  const params = [userId];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (genre && genre !== 'all') {
    query += ' AND LOWER(genre) = LOWER(?)';
    params.push(genre);
  }

  if (search && search.trim()) {
    query += ' AND (LOWER(title) LIKE ? OR LOWER(prompt) LIKE ?)';
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term);
  }

  return db.prepare(query).get(...params).count;
}

export function listAllGames({ status, search, genre, limit = 20, offset = 0, sort = 'newest' } = {}) {
  let query = 'SELECT * FROM games WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (genre && genre !== 'all') {
    query += ' AND LOWER(genre) LIKE LOWER(?)';
    params.push(`%${genre}%`);
  }

  if (search && search.trim()) {
    query += ' AND (LOWER(title) LIKE ? OR LOWER(prompt) LIKE ?)';
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term);
  }

  if (sort === 'oldest') {
    query += ' ORDER BY created_at ASC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const games = db.prepare(query).all(...params);

  return games.map(g => ({
    ...g,
    spec: g.spec_json ? JSON.parse(g.spec_json) : null,
  }));
}

export function countAllGames({ status, search, genre } = {}) {
  let query = 'SELECT COUNT(*) as count FROM games WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (genre && genre !== 'all') {
    query += ' AND LOWER(genre) LIKE LOWER(?)';
    params.push(`%${genre}%`);
  }

  if (search && search.trim()) {
    query += ' AND (LOWER(title) LIKE ? OR LOWER(prompt) LIKE ?)';
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term);
  }

  return db.prepare(query).get(...params).count;
}

export function getUserStats(userId) {
  const total = db.prepare('SELECT COUNT(*) as count FROM games WHERE user_id = ?').get(userId).count;
  const verified = db.prepare("SELECT COUNT(*) as count FROM games WHERE user_id = ? AND status = 'complete'").get(userId).count;
  const totalHeals = db.prepare(`
    SELECT COUNT(*) as count 
    FROM game_heal_logs 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = ?)
  `).get(userId).count || 0;
  return { total, verified, totalHeals };
}

export function getFullGameDetail(gameId) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return null;

  const attempts = db.prepare('SELECT * FROM game_attempts WHERE game_id = ? ORDER BY attempt_number ASC').all(gameId);
  const healLogs = db.prepare('SELECT * FROM game_heal_logs WHERE game_id = ? ORDER BY cycle ASC').all(gameId);
  const events = db.prepare('SELECT * FROM game_events WHERE game_id = ? ORDER BY id ASC').all(gameId);

  return {
    ...game,
    spec: game.spec_json ? JSON.parse(game.spec_json) : null,
    attempts: attempts.map(a => ({
      ...a,
      testResult: a.test_result_json ? JSON.parse(a.test_result_json) : null,
    })),
    healLogs: healLogs.map(h => ({
      ...h,
      failedAssertions: h.failed_assertions_json ? JSON.parse(h.failed_assertions_json) : [],
    })),
    events: events.map(e => ({
      ts: e.timestamp,
      type: e.event_type,
      message: e.message,
      ...(e.data_json ? JSON.parse(e.data_json) : {}),
    })),
  };
}

// ── Battle & Arena Management ────────────────────────────────────────────────

export function createBattleRecord({ id, userId, prompt }) {
  const now = Date.now();
  const user = userId ? db.prepare('SELECT id FROM users WHERE id = ?').get(userId) : null;
  const validUserId = user ? user.id : 'anonymous';
  db.prepare(`
    INSERT INTO battles (id, user_id, prompt, status, created_at, updated_at)
    VALUES (?, ?, ?, 'running', ?, ?)
  `).run(id, validUserId, prompt, now, now);
}


export function updateBattleSpec(id, spec, ragChunks = []) {
  db.prepare(`
    UPDATE battles
    SET title = ?, genre = ?, spec_json = ?, rag_context_json = ?, updated_at = ?
    WHERE id = ?
  `).run(
    spec.title || 'Arena Game',
    spec.genre || 'Action',
    JSON.stringify(spec),
    JSON.stringify(ragChunks),
    Date.now(),
    id
  );
}

export function saveBattleRun(battleId, {
  modelName,
  modelId,
  status = 'running',
  attempt = 1,
  healCycles = 0,
  passRate = 0,
  passedAssertions = 0,
  totalAssertions = 0,
  loc = 0,
  elapsedSec = 0,
  gameUrl = null,
  thumbnailUrl = null,
  finalCode = null,
  testResult = null,
}) {
  const existing = db.prepare('SELECT id FROM battle_runs WHERE battle_id = ? AND model_name = ?').get(battleId, modelName);
  const now = Date.now();

  if (existing) {
    db.prepare(`
      UPDATE battle_runs
      SET model_id = ?, status = ?, final_attempt = ?, heal_cycles = ?, pass_rate = ?,
          passed_assertions = ?, total_assertions = ?, loc = ?, elapsed_sec = ?,
          game_url = ?, thumbnail_url = ?, final_code = ?, test_result_json = ?
      WHERE id = ?
    `).run(
      modelId, status, attempt, healCycles, passRate,
      passedAssertions, totalAssertions, loc, elapsedSec,
      gameUrl, thumbnailUrl, finalCode, testResult ? JSON.stringify(testResult) : null,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO battle_runs (
        battle_id, model_name, model_id, status, final_attempt, heal_cycles, pass_rate,
        passed_assertions, total_assertions, loc, elapsed_sec, game_url, thumbnail_url,
        final_code, test_result_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      battleId, modelName, modelId, status, attempt, healCycles, passRate,
      passedAssertions, totalAssertions, loc, elapsedSec, gameUrl, thumbnailUrl,
      finalCode, testResult ? JSON.stringify(testResult) : null, now
    );
  }
}

export function recordBattleEvent(battleId, modelName, type, message, data = {}) {
  db.prepare(`
    INSERT INTO battle_events (battle_id, model_name, event_type, message, data_json, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(battleId, modelName, type, message, JSON.stringify(data), Date.now());
}

export function finalizeBattle(id, { winner, winnerReason, status = 'complete' }) {
  db.prepare(`
    UPDATE battles
    SET status = ?, winner = ?, winner_reason = ?, updated_at = ?
    WHERE id = ?
  `).run(status, winner, winnerReason, Date.now(), id);
}

export function getBattleDetail(battleId) {
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);
  if (!battle) return null;

  const runs = db.prepare('SELECT * FROM battle_runs WHERE battle_id = ? ORDER BY id ASC').all(battleId);
  const events = db.prepare('SELECT * FROM battle_events WHERE battle_id = ? ORDER BY id ASC').all(battleId);

  return {
    ...battle,
    spec: battle.spec_json ? JSON.parse(battle.spec_json) : null,
    ragChunks: battle.rag_context_json ? JSON.parse(battle.rag_context_json) : [],
    runs: runs.map(r => ({
      ...r,
      testResult: r.test_result_json ? JSON.parse(r.test_result_json) : null,
    })),
    events: events.map(e => ({
      id: e.id,
      model: e.model_name,
      type: e.event_type,
      message: e.message,
      ts: e.timestamp,
      ...(e.data_json ? JSON.parse(e.data_json) : {}),
    })),
  };
}

export function listUserBattles(userId, { limit = 20, offset = 0 } = {}) {
  let query = `
    SELECT b.*,
      (SELECT COUNT(*) FROM battle_runs WHERE battle_id = b.id) as run_count
    FROM battles b
  `;
  const params = [];

  if (userId && userId !== 'all') {
    query += ' WHERE b.user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const battles = db.prepare(query).all(...params);

  return battles.map(b => {
    const runs = db.prepare('SELECT model_name, model_id, status, heal_cycles, pass_rate, loc, elapsed_sec, game_url, thumbnail_url FROM battle_runs WHERE battle_id = ?').all(b.id);
    return {
      ...b,
      spec: b.spec_json ? JSON.parse(b.spec_json) : null,
      runs,
    };
  });
}

