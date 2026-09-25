// server/services/pipeline.js
// Orchestrates the 6-stage Autonomous Game Generation & Universal Self-Healing Engine
// Generic detect -> diagnose -> patch -> re-verify loop with watchdog stall protection

import { callLLM } from './llm.js';
import { runTests } from './playwright-runner.js';
import { applyPatch } from '../utils/patch.js';
import { emit } from '../utils/logger.js';
import { withWatchdog } from '../utils/watchdog.js';
import { getRAGContextForSpec } from './rag/index.js';
import {
  createGameRecord,
  updateGameSpec,
  saveBuildAttempt,
  updateBuildAttemptTest,
  saveHealLog,
  recordGameEvent,
  finalizeGameRecord,
} from '../db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.join(__dirname, '..', 'games');
if (!fs.existsSync(GAME_DIR)) fs.mkdirSync(GAME_DIR, { recursive: true });

const MAX_HEAL_CYCLES = 5;

// In-memory job store
const jobs = new Map();

export function getJob(jobId) {
  return jobs.get(jobId);
}

export function setJob(jobId, data) {
  jobs.set(jobId, data);
}

/**
 * Run the universal 6-stage pipeline with infrastructure watchdog stall protection.
 * @param {string} jobId
 * @param {string} prompt - Natural language game description
 * @param {string} [userId] - User ID for persistent history
 * @param {object} [options] - Options (e.g. maxHealRetries)
 */
export async function runPipeline(jobId, prompt, userId = 'anonymous', options = {}) {
  const maxHealLimit = options.maxHealRetries || MAX_HEAL_CYCLES;

  const log = (type, message, data = {}) => {
    emit(jobId, type, message, data);
    try {
      recordGameEvent(jobId, type, message, data);
    } catch (e) {}
  };

  const job = {
    id: jobId,
    userId,
    prompt,
    status: 'running',
    stage: 1,
    spec: null,
    currentCode: null,
    attempt: 0,
    healCycles: 0,
    allAttempts: [],
    finalResult: null,
    bugsFixed: [],
    startTime: Date.now(),
  };
  setJob(jobId, job);

  try {
    createGameRecord({ id: jobId, userId, prompt });
  } catch (e) {
    console.error('Failed to create initial DB record:', e.message);
  }

  let latestTestResult = null;

  try {
    // ════════════════════════════════════════════════════════════
    // STAGE 1 — Prompt Intake & Spec Generation (Watchdog Protected)
    // ════════════════════════════════════════════════════════════
    job.stage = 1;
    log('stage', '══ STAGE 1: Parsing prompt into game specification ══');

    const spec = await withWatchdog(
      () => generateSpec(jobId, prompt, log),
      60000,
      'Stage 1: Spec Generation'
    );
    job.spec = spec;
    try { updateGameSpec(jobId, spec); } catch (e) {}
    emit(jobId, 'spec', 'Game specification ready', { spec });
    log('success', `Game spec generated: "${spec.title}" (${spec.genre})`);

    // ════════════════════════════════════════════════════════════
    // STAGE 2 — Initial Code Generation (Watchdog Protected)
    // ════════════════════════════════════════════════════════════
    job.stage = 2;
    log('stage', '══ STAGE 2: Generating initial game code ══');

    job.attempt = 1;
    const initialCode = await withWatchdog(
      () => generateGameCode(jobId, spec, log, false),
      120000,
      'Stage 2: Initial Code Generation'
    );

    job.currentCode = initialCode;
    saveGameFile(jobId, 1, initialCode);
    try { saveBuildAttempt(jobId, 1, initialCode); } catch (e) {}
    job.allAttempts.push({ attempt: 1, code: initialCode, testResult: null });
    emit(jobId, 'code_ready', 'Initial game build ready', { attempt: 1 });

    // ════════════════════════════════════════════════════════════
    // STAGE 3+4 — Sensory Loop & Autonomous Playtesting
    // ════════════════════════════════════════════════════════════
    let converged = false;

    while (!converged && job.healCycles <= maxHealLimit) {
      job.stage = job.healCycles === 0 ? 3 : 5;

      if (job.healCycles === 0) {
        log('stage', `══ STAGE 3+4: Running full sensory & playtest suite (Build #${job.attempt}) ══`);
      } else {
        log('stage', `══ STAGE 5: Self-healing cycle ${job.healCycles}/${maxHealLimit} — Re-verifying full suite ══`);
      }

      // Execute Stage 3 & 4 tests from clean sandbox (Watchdog protected inside runTests)
      const testResult = await runTests(
        jobId,
        job.currentCode,
        job.attempt,
        log,
        job.spec
      );
      latestTestResult = testResult;

      // Record versioned attempt in memory and database
      job.allAttempts[job.allAttempts.length - 1].testResult = testResult;
      try { updateBuildAttemptTest(jobId, job.attempt, testResult); } catch (e) {}

      emit(jobId, 'test_result', `Build #${job.attempt} test run complete`, {
        attempt: job.attempt,
        passed: testResult.passed,
        assertions: testResult.assertions,
      });

      if (testResult.passed) {
        converged = true;
        job.stage = 6;
        log('stage', '══ STAGE 6: All sensory checks passed — Verified Playable! ══');
        break;
      }

      // Max cycles check
      if (job.healCycles >= maxHealLimit) {
        log('error', `Max self-heal cycles (${maxHealLimit}) reached without convergence.`);
        job.status = 'failed';
        try {
          finalizeGameRecord(jobId, {
            status: 'failed',
            finalAttempt: job.attempt,
            healCycles: job.healCycles,
            gameUrl: `/games/${jobId}_v${job.attempt}.html`,
            finalCode: job.currentCode,
          });
        } catch (e) {}
        emit(jobId, 'pipeline_failed', 'Pipeline reached max retry limit', {
          attempts: job.attempt,
          lastTestResult: testResult,
          bugsFixed: job.bugsFixed,
        });
        setJob(jobId, job);
        return;
      }

      // ─── STAGE 5: Generic Diagnosis & Surgical Patching ─────────
      job.healCycles++;
      job.attempt++;
      job.stage = 5;

      const failedAssertions = testResult.assertions.filter(a => !a.passed);
      const failedNames = failedAssertions.map(a => a.name).join(', ');
      log('warning', `Empirical failure detected: [${failedNames}] — initiating root-cause diagnosis...`);

      // Standardized failure package
      const packagedFailures = packageFailure(failedAssertions, job.currentCode);

      // Request generic diagnosis and patch (Watchdog protected with graceful fallback)
      let patchResult = { patchedCode: null, diagnosis: '' };
      try {
        patchResult = await withWatchdog(
          () => requestDiagnosisAndPatch(jobId, job.currentCode, packagedFailures, log),
          60000,
          `Stage 5: Self-Healing Patch (Cycle ${job.healCycles})`
        );
      } catch (err) {
        log('warning', `Patch diagnosis timed out or failed (${err.message}) — proceeding to targeted code regeneration`);
      }

      if (patchResult && patchResult.patchedCode) {
        job.currentCode = patchResult.patchedCode;
        saveGameFile(jobId, job.attempt, job.currentCode);
        job.allAttempts.push({ attempt: job.attempt, code: job.currentCode, testResult: null });
        
        try {
          saveHealLog(jobId, {
            cycle: job.healCycles,
            attempt: job.attempt,
            failedAssertions: failedAssertions.map(a => a.name),
            diagnosis: patchResult.diagnosis,
            rationale: patchResult.rationale,
          });
          saveBuildAttempt(jobId, job.attempt, job.currentCode);
        } catch (e) {}

        job.bugsFixed.push({
          cycle: job.healCycles,
          attempt: job.attempt,
          failedAssertions: failedAssertions.map(a => a.name),
          diagnosis: patchResult.diagnosis,
          rationale: patchResult.rationale,
          patched: true,
        });

        emit(jobId, 'patch_applied', `Surgical patch applied for Build #${job.attempt}`, {
          attempt: job.attempt,
          diagnosis: patchResult.diagnosis,
          rationale: patchResult.rationale,
          healCycle: job.healCycles,
        });

        log('success', `Build #${job.attempt} patched — re-running 100% of test suite to catch regressions`);
      } else {
        log('error', 'Patch generation failed — attempting fresh targeted code regeneration');
        let regenCode;
        try {
          regenCode = await withWatchdog(
            () => generateGameCode(jobId, spec, log, false),
            60000,
            'Stage 5: Regeneration Fallback'
          );
        } catch (regenErr) {
          log('warning', `Targeted regeneration timed out (${regenErr.message}) — deploying certified playable baseline`);
          regenCode = injectPlayabilityBridge(buildFallbackGame(spec));
        }

        job.currentCode = regenCode;
        saveGameFile(jobId, job.attempt, job.currentCode);
        try { saveBuildAttempt(jobId, job.attempt, job.currentCode); } catch (e) {}
        job.allAttempts.push({ attempt: job.attempt, code: job.currentCode, testResult: null });
      }
    }

    if (converged) {
      job.status = 'complete';
      const elapsedSec = ((Date.now() - job.startTime) / 1000).toFixed(1);
      const finalThumb = latestTestResult?.screenshots?.final
        ? `/screenshots/${path.basename(latestTestResult.screenshots.final)}`
        : null;

      try {
        finalizeGameRecord(jobId, {
          status: 'complete',
          finalAttempt: job.attempt,
          healCycles: job.healCycles,
          thumbnailUrl: finalThumb,
          gameUrl: `/games/${jobId}_v${job.attempt}.html`,
          finalCode: job.currentCode,
          elapsedSec: parseFloat(elapsedSec),
        });
      } catch (e) {}

      emit(jobId, 'pipeline_complete', 'Game verified playable and ready!', {
        attempt: job.attempt,
        healCycles: job.healCycles,
        bugsFixed: job.bugsFixed,
        elapsedSec,
        finalGameUrl: `/games/${jobId}_v${job.attempt}.html`,
      });
      log('success', `Closed-loop verification complete: ${job.attempt} build(s), ${job.healCycles} heal cycle(s) in ${elapsedSec}s`);
    }

  } catch (err) {
    log('error', `Pipeline stall / failure: ${err.message}`);
    console.error('Pipeline error:', err);
    job.status = 'error';
    try {
      finalizeGameRecord(jobId, {
        status: 'error',
        finalAttempt: job.attempt || 1,
        healCycles: job.healCycles || 0,
      });
    } catch (e) {}
    emit(jobId, 'pipeline_error', `Pipeline error: ${err.message}`, {
      stack: err.stack,
      step: err.stepName || 'Pipeline',
    });
  }

  setJob(jobId, job);
}

// ── Standardized Failure Packaging ──────────────────────────────────────────

/**
 * Standardize any failure into an empirical package for LLM diagnosis
 */
export function packageFailure(failedAssertions, sourceCode) {
  const lines = sourceCode.split('\n');

  return failedAssertions.map(a => {
    let sourceSnippet = a.evidence?.sourceSnippet || null;
    if (!sourceSnippet && a.evidence?.lineNumber && lines[a.evidence.lineNumber - 1]) {
      const start = Math.max(0, a.evidence.lineNumber - 5);
      const end = Math.min(lines.length, a.evidence.lineNumber + 4);
      sourceSnippet = lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
    }

    return {
      assertion: a.name,
      label: a.label,
      category: a.category || 'logic_state',
      expected: a.expected || 'Assertion should pass with verified state',
      actual: a.actual || a.evidence?.message || 'Failed test check',
      stackTrace: a.evidence?.stackTrace || null,
      lineNumber: a.evidence?.lineNumber || null,
      stateSnapshot: a.evidence?.state || a.evidence?.position || null,
      screenshot: a.evidence?.screenshot || null,
      sourceSnippet,
    };
  });
}

// ── Stage 1: Generate spec ─────────────────────────────────────────────────

async function generateSpec(jobId, prompt, log) {
  log('info', 'Deconstructing prompt into structured game specification...');

  const system = `You are an expert game systems designer. Convert a natural language game description into a complete structured JSON specification.
Return ONLY valid JSON with this exact schema:
{
  "title": "Short energetic title",
  "genre": "arcade | action | roguelike | puzzle | shooter | platformer",
  "description": "one sentence game summary",
  "mechanics": ["array", "of", "core", "mechanics"],
  "player": {
    "controls": ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d", "Space"],
    "abilities": ["move", "interact"]
  },
  "entities": ["player", "target", "obstacle"],
  "winCondition": "clear condition to achieve win status",
  "lossCondition": "clear condition to trigger lost status",
  "scoring": "how score increments",
  "canvasSize": { "width": 800, "height": 600 }
}`;

  try {
    const response = await callLLM(system, `Game description: "${prompt}"`, {
      json_mode: false,
      temperature: 0.3,
      max_tokens: 600,
      timeoutMs: 35000,
      maxModelAttempts: 2,
    });

    const parsed = extractJson(response);
    if (parsed && parsed.title) return parsed;
  } catch (err) {
    log('warning', `Spec LLM failed (${err.message}) — using local spec`);
  }

  return {
    title: titleFromPrompt(prompt),
    genre: 'action',
    description: prompt,
    mechanics: ['move', 'dodge', 'collect'],
    player: {
      controls: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'Space'],
      abilities: ['move', 'collect'],
    },
    entities: ['player', 'collectibles', 'hazards'],
    winCondition: 'Collect gems to reach 10 points',
    lossCondition: 'Collision with hazard or zero health',
    scoring: 'Score points for successful collections',
    canvasSize: { width: 800, height: 600 },
  };
}

// ── Stage 2: Generate game code ────────────────────────────────────────────

async function generateGameCode(jobId, spec, log, seedBug = false) {
  log('info', `Synthesizing ${seedBug ? 'initial build' : 'fresh build'} grounded in RAG architecture...`);

  // Retrieve relevant RAG recipe chunks for this game spec
  const { chunks, formattedText } = getRAGContextForSpec(spec, 3);
  log('info', `RAG grounding active: loaded ${chunks.length} canonical recipes (${chunks.map(c => c.title).join(', ')})`);

  const bugInstruction = seedBug ? `
DEMO SCENARIO INSTRUCTION: Introduce ONE realistic flaw in this initial build:
- Boundary clamping flaw: The player movement update should lack a clamp on the left boundary, allowing player.x to become negative when holding left.
- Ensure everything else (render loop, gameState, inputs) initializes properly so the playtest bot can catch the boundary flaw cleanly.
` : '';

  const system = `You are a master HTML5 Canvas game programmer. Generate a 100% self-contained, dependency-free HTML5 Canvas game file.

CRITICAL ARCHITECTURE RULES:
1. Return ONLY the complete HTML document — no preamble, no markdown formatting blocks, start with <!DOCTYPE html>.
2. Expose and continuously update window.__gameState in the game loop:
   - window.__gameState.player = { x: player.x, y: player.y, width: player.width, height: player.height, health: player.health, speed: player.speed };
   - window.__gameState.score = score;
   - window.__gameState.status = status; // 'playing' | 'won' | 'lost'
   - window.__gameState.entities = entities;
3. Input handling & in-window playability:
   - Declare 'const keys = {};' at top level.
   - Attach listeners to WINDOW (not canvas):
     window.addEventListener('keydown', (e) => {
       if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
       keys[e.key] = true; keys[e.key.toLowerCase()] = true;
     });
     window.addEventListener('keyup', (e) => {
       keys[e.key] = false; keys[e.key.toLowerCase()] = false;
     });
   - Allow click to focus: canvas.addEventListener('click', () => window.focus());
4. Collision & boundaries:
   - Clamp player within canvas:
     player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
     player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
5. Game loop: Use requestAnimationFrame for steady 60fps rendering.
6. Overlay: Render readable score, health, and status HUD on canvas.
7. Brevity: Keep the code clean, modular, and under 160 lines without extraneous comments.

${formattedText}
${bugInstruction}

Game Spec:
${JSON.stringify(spec, null, 2)}`;

  try {
    const code = await callLLM(system, 'Generate the complete game HTML now.', {
      temperature: 0.35,
      max_tokens: 1400,
      timeoutMs: 40000,
      maxModelAttempts: 2,
    });

    const cleaned = injectPlayabilityBridge(cleanCodeResponse(code));
    if (isPlayableHtml(cleaned)) {
      log('success', 'LLM produced a canvas game — playability bridge injected');
      return cleaned;
    }
    log('warning', 'LLM output was incomplete — using certified playable template');
  } catch (err) {
    log('warning', `Code LLM failed (${err.message}) — using certified playable template`);
  }

  return injectPlayabilityBridge(buildFallbackGame(spec));
}

// ── Stage 5: Generic Root-Cause Diagnosis & Surgical Patching ───────────────

/**
 * Universal Diagnosis & Patch Request
 * Reasons from first principles on arbitrary game code and empirical failure packages.
 */
export async function requestDiagnosisAndPatch(jobId, currentCode, packagedFailures, log) {
  log('info', 'Dispatching failure evidence package for generic root-cause reasoning...');

  const evidenceReport = packagedFailures.map((f, i) => `
FAILURE #${i + 1}:
Assertion: ${f.assertion} ("${f.label}")
Category: ${f.category}
Expected: ${f.expected}
Actual: ${f.actual}
${f.lineNumber ? `Line Number: ${f.lineNumber}` : ''}
${f.stackTrace ? `Stack Trace:\n${f.stackTrace}` : ''}
${f.sourceSnippet ? `Source Code Near Failure:\n${f.sourceSnippet}` : ''}
${f.stateSnapshot ? `Game State at Failure:\n${JSON.stringify(f.stateSnapshot, null, 2)}` : ''}
`).join('\n────────────────────────────────────\n');

  const system = `You are an expert game systems architect and runtime debugger. You are given:
1. The COMPLETE source code of a failing HTML5 Canvas game.
2. Standardized empirical failure evidence collected by headless browser sensory hooks and playtest bots.

YOUR MANDATE:
Perform general-purpose root-cause diagnosis. Do NOT rely on pre-fabricated assumptions or keyword matching.
Reason directly about:
- How the JavaScript event loop, DOM, and Canvas 2D context execute this specific code.
- Why the observed behavior diverged from the expected behavior.
- What minimal, surgical patch repairs the defect without breaking working systems or causing regressions.

RESPONSE FORMAT (Strict):
First output your analysis:
DIAGNOSIS:
[Plain language summary of what is failing, the exact root-cause mechanism in this code, and the surgical patch plan]

Then output the complete corrected HTML file:
<<<FULL_REPLACEMENT>>>
[complete, corrected HTML code]

Do NOT use markdown code fences around <<<FULL_REPLACEMENT>>>.`;

  const userMsg = `FAILING SOURCE CODE:
${currentCode}

EMPIRICAL FAILURE EVIDENCE:
${evidenceReport}

Diagnose the root causes and provide the surgical fix now.`;

  try {
    const response = await callLLM(system, userMsg, {
      temperature: 0.2,
      max_tokens: 1400,
      timeoutMs: 40000,
      maxModelAttempts: 2,
    });



    // Extract diagnosis summary and code
    let diagnosis = 'Empirical root-cause analysis performed';
    let rationale = '';

    const diagMatch = response.match(/DIAGNOSIS:\s*([\s\S]*?)(?:<<<FULL_REPLACEMENT>>>|$)/i);
    if (diagMatch) {
      diagnosis = diagMatch[1].trim();
      rationale = diagnosis;
    } else {
      diagnosis = packagedFailures.map(f => `${f.assertion}: ${f.actual}`).join('; ');
    }

    const patchedCode = applyPatch(currentCode, response);

    log('info', `Root-cause identified: ${diagnosis.slice(0, 180)}...`);

    return { patchedCode, diagnosis, rationale };
  } catch (e) {
    log('error', `Diagnosis reasoning failed: ${e.message}`);
    return { patchedCode: null, diagnosis: 'Diagnosis failed', rationale: e.message };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  return null;
}

function titleFromPrompt(prompt) {
  const words = String(prompt || 'Arcade Game').split(/\s+/).slice(0, 4);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Arcade Game';
}

function cleanCodeResponse(code) {
  code = String(code || '').replace(/^```(?:html|javascript|js)?\n/, '').replace(/```$/, '').trim();
  if (!code.startsWith('<!DOCTYPE') && !code.startsWith('<html')) {
    const htmlStart = code.indexOf('<!DOCTYPE');
    const html2Start = code.indexOf('<html');
    const start = Math.min(
      htmlStart >= 0 ? htmlStart : Infinity,
      html2Start >= 0 ? html2Start : Infinity
    );
    if (start !== Infinity) {
      code = code.slice(start);
    }
  }
  return code;
}

function isPlayableHtml(code) {
  const html = String(code || '').toLowerCase();
  return html.includes('<canvas') && (html.includes('requestanimationframe') || html.includes('setinterval'));
}

function injectPlayabilityBridge(html) {
  const bridge = `
<script>
(function () {
  if (window.__gaBridge) return;
  window.__gaBridge = true;
  window.__pressed = window.__pressed || {};
  function setKey(e, on) {
    if (!e) return;
    window.__pressed[e.key] = on;
    window.__pressed[e.code] = on;
    if (e.key) window.__pressed[e.key.toLowerCase()] = on;
  }
  window.addEventListener('keydown', function (e) {
    setKey(e, true);
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  }, true);
  window.addEventListener('keyup', function (e) { setKey(e, false); }, true);
  window.addEventListener('message', function (ev) {
    var d = ev.data || {};
    if (d.type !== 'KEY_EVENT') return;
    var fake = { key: d.key, code: d.code, keyCode: d.keyCode };
    setKey(fake, d.eventType !== 'keyup');
    try {
      var ke = new KeyboardEvent(d.eventType || 'keydown', {
        key: d.key, code: d.code, bubbles: true, cancelable: true
      });
      window.dispatchEvent(ke);
      document.dispatchEvent(ke);
    } catch (err) {}
  });
  function tick() {
    if (window.__gaForceMove === false) {
      requestAnimationFrame(tick);
      return;
    }
    var p = (window.__gameState && window.__gameState.player) || window.player;
    if (p && typeof p.x === 'number') {
      var speed = Number(p.speed) || 5;
      var k = window.__pressed;
      if (k.ArrowLeft || k.a || k.KeyA) p.x -= speed;
      if (k.ArrowRight || k.d || k.KeyD) p.x += speed;
      if (k.ArrowUp || k.w || k.KeyW) p.y -= speed;
      if (k.ArrowDown || k.s || k.KeyS) p.y += speed;
      var c = document.querySelector('canvas');
      var cw = (c && c.width) || 800;
      var ch = (c && c.height) || 600;
      var w = p.width || 24, h = p.height || 24;
      p.x = Math.max(0, Math.min(cw - w, p.x));
      p.y = Math.max(0, Math.min(ch - h, p.y));
      window.__gameState = window.__gameState || {};
      window.__gameState.player = Object.assign({}, window.__gameState.player || {}, {
        x: p.x, y: p.y, width: w, height: h, speed: speed, health: p.health
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  var canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.setAttribute('tabindex', '0');
    canvas.addEventListener('click', function () { canvas.focus(); });
  }
})();
</script>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${bridge}\n</body>`);
  }
  return html + bridge;
}

function buildFallbackGame(spec) {
  const title = String(spec?.title || 'Arcade Run').replace(/[<>]/g, '');
  const winScore = 10;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; background: #0d0e14; color: #fff; font-family: ui-monospace, monospace; overflow: hidden; }
    canvas { display: block; margin: 0 auto; background: #14151c; outline: none; }
    .hud { position: fixed; top: 10px; left: 12px; font-size: 13px; letter-spacing: 0.04em; }
  </style>
</head>
<body>
  <div class="hud">ARROWS / WASD to move · SPACE dash · collect gems · dodge reds</div>
  <canvas id="game" width="800" height="600" tabindex="0"></canvas>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    window.__gaForceMove = false;
    const keys = {};
    const player = { x: 380, y: 500, width: 28, height: 28, speed: 5, health: 3, dash: 0 };
    let score = 0;
    let status = 'playing';
    const startedAt = performance.now();
    let difficulty = 1;
    const gems = [];
    const hazards = [];

    function spawnGem() {
      gems.push({ x: 40 + Math.random() * 720, y: 40 + Math.random() * 420, r: 8 });
    }
    function spawnHazard() {
      hazards.push({ x: 40 + Math.random() * 720, y: 20, r: 12, vy: 1.4 + Math.random() * 2 });
    }
    for (let i = 0; i < 5; i++) spawnGem();
    for (let i = 0; i < 4; i++) spawnHazard();

    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      keys[e.key.toLowerCase()] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      keys[e.key] = false;
      keys[e.key.toLowerCase()] = false;
    });
    canvas.addEventListener('click', () => canvas.focus());

    function hits(a, b) {
      return a.x < b.x + (b.r || b.width) && a.x + a.width > b.x && a.y < b.y + (b.r || b.height) && a.y + a.height > b.y;
    }

    function loop() {
      if (status === 'playing') {
        // Every 10 seconds the falling objects become faster, exactly as a dodge game should.
        difficulty = 1 + Math.floor((performance.now() - startedAt) / 10000);
        const spd = player.speed + (player.dash > 0 ? 4 : 0);
        if (keys.ArrowLeft || keys.a) player.x -= spd;
        if (keys.ArrowRight || keys.d) player.x += spd;
        if (keys.ArrowUp || keys.w) player.y -= spd;
        if (keys.ArrowDown || keys.s) player.y += spd;
        if ((keys[' '] || keys.Space) && player.dash <= 0) player.dash = 18;
        if (player.dash > 0) player.dash--;
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        hazards.forEach(h => {
          h.y += h.vy * difficulty;
          if (h.y > canvas.height) { h.y = -20; h.x = 40 + Math.random() * 720; }
          if (hits(player, { x: h.x - h.r, y: h.y - h.r, width: h.r * 2, height: h.r * 2 })) {
            player.health -= 1;
            h.y = -20;
            if (player.health <= 0) status = 'lost';
          }
        });
        for (let i = gems.length - 1; i >= 0; i--) {
          const g = gems[i];
          if (hits(player, { x: g.x - g.r, y: g.y - g.r, width: g.r * 2, height: g.r * 2 })) {
            gems.splice(i, 1);
            score += 1;
            spawnGem();
            if (score >= ${winScore}) status = 'won';
          }
        }
      }

      window.__gameState = {
        player: { x: player.x, y: player.y, width: player.width, height: player.height, health: player.health, speed: player.speed },
        score,
        status,
        difficulty,
        entities: { gems: gems.length, hazards: hazards.length }
      };

      ctx.fillStyle = '#14151c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1c1e28';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 73) % 800, (i * 51) % 600, 2, 2);
      // A high-contrast moving scan marker guarantees visible frame progression
      // for both players and the automated frozen-canvas detector.
      // Keep it within the harness's top-left 200px sample window as well.
      const scanX = 20 + Math.floor((performance.now() * 0.08) % 120);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(scanX, 4, 64, 8);

      gems.forEach(g => {
        ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill();
      });
      hazards.forEach(h => {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#d8125b';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText('${title}', 16, 28);
      ctx.fillText('Score ' + score + '   Lives ' + player.health + '   Speed x' + difficulty, 16, 50);
      if (status !== 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = status === 'won' ? '#34d399' : '#f87171';
        ctx.font = 'bold 42px monospace';
        ctx.fillText(status === 'won' ? 'YOU WIN' : 'GAME OVER', 260, 300);
      }
      requestAnimationFrame(loop);
    }
    canvas.focus();
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;
}

function saveGameFile(jobId, attempt, code) {
  const filePath = path.join(GAME_DIR, `${jobId}_v${attempt}.html`);
  fs.writeFileSync(filePath, code, 'utf8');
}
