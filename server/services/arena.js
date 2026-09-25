// server/services/arena.js
// Dual-LLM Race Orchestrator: DeepSeek vs Kimi on NVIDIA NIM
// Enforces 100% fair battle conditions: shared spec, shared RAG corpus, identical test harness

import { callLLM } from './llm.js';
import { runTests } from './playwright-runner.js';
import { applyPatch } from '../utils/patch.js';
import { emit } from '../utils/logger.js';
import { withWatchdog } from '../utils/watchdog.js';
import { getRAGContextForSpec } from './rag/index.js';
import {
  createBattleRecord,
  updateBattleSpec,
  saveBattleRun,
  recordBattleEvent,
  finalizeBattle,
  getBattleDetail,
} from '../db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.join(__dirname, '..', 'games');
if (!fs.existsSync(GAME_DIR)) fs.mkdirSync(GAME_DIR, { recursive: true });

// Active in-memory battles store
const battles = new Map();

export function getActiveBattle(battleId) {
  return battles.get(battleId);
}

/**
 * Start a Head-to-Head Battle between DeepSeek and Kimi
 *
 * @param {string} battleId
 * @param {string} prompt - Single user game prompt
 * @param {string} userId - User session ID
 * @param {object} options - Configurable battle parameters
 */
export async function startBattle(battleId, prompt, userId = 'anonymous', options = {}) {
  const modelAId = options.modelA || process.env.ARENA_MODEL_A || 'qwen/qwen3.8-27b';
  const modelBId = options.modelB || process.env.ARENA_MODEL_B || 'openai/gpt-oss-120b';
  const maxHeals = options.maxHealRetries ?? 3;

  const getDisplayName = (id, fallback) => {
    if (id.includes('120b')) return 'OpenAI 120B';
    if (id.includes('20b')) return 'OpenAI 20B';
    if (id.includes('qwen')) return 'Qwen 3.8';
    if (id.includes('kimi')) return 'Kimi K3';
    if (id.includes('gemini')) return 'Gemini Flash';
    return fallback;
  };
  const displayNameA = getDisplayName(modelAId, 'OpenAI 120B');
  const displayNameB = getDisplayName(modelBId, 'OpenAI 20B');

  const log = (model, type, message, data = {}) => {
    emit(battleId, type, message, { model, ...data });
    try {
      recordBattleEvent(battleId, model, type, message, data);
    } catch (e) {}
  };

  const battle = {
    id: battleId,
    userId,
    prompt,
    status: 'running',
    modelA: { name: 'deepseek', id: modelAId, displayName: displayNameA },
    modelB: { name: 'kimi', id: modelBId, displayName: displayNameB },
    spec: null,
    ragChunks: [],
    runs: { deepseek: null, kimi: null },
    winner: null,
    winnerReason: null,
    startTime: Date.now(),
  };
  battles.set(battleId, battle);

  try {
    createBattleRecord({ id: battleId, userId, prompt });
  } catch (e) {
    console.error('Failed to create battle DB record:', e.message);
  }

  try {
    // ════════════════════════════════════════════════════════════
    // PHASE 1 — SHARED GAME SPEC & SHARED RAG RETRIEVAL (Run Once)
    // ════════════════════════════════════════════════════════════
    log('arena', 'stage', '══ ARENA: Parsing shared game architecture & spec ══');

    const spec = await withWatchdog(
      () => generateSharedSpec(prompt, log),
      90000,
      'Arena Spec Generation'
    );
    battle.spec = spec;

    // Retrieve shared RAG recipes so both models are grounded on identical code patterns
    const { chunks: ragChunks, formattedText: ragContext } = getRAGContextForSpec(spec, 4);
    battle.ragChunks = ragChunks;

    try {
      updateBattleSpec(battleId, spec, ragChunks.map(c => ({ id: c.id, title: c.title })));
    } catch (e) {}

    log('arena', 'info', `Shared Grounding Active: ${ragChunks.length} RAG recipes loaded (${ragChunks.map(c => c.title).join(', ')})`);
    emit(battleId, 'battle_spec', 'Shared architecture and RAG corpus prepared', {
      model: 'arena',
      spec,
      ragChunks: ragChunks.map(c => ({ id: c.id, title: c.title })),
    });

    log('arena', 'stage', `⚔️ THE ARENA IS LIVE: ${displayNameA} (${modelAId}) vs ${displayNameB} (${modelBId})`);

    // ════════════════════════════════════════════════════════════
    // PHASE 2 — PARALLEL RACE EXECUTION (Promise.allSettled)
    // ════════════════════════════════════════════════════════════
    const [resultA, resultB] = await Promise.allSettled([
      runChallengerPipeline(battleId, 'deepseek', modelAId, displayNameA, spec, ragContext, maxHeals, log),
      runChallengerPipeline(battleId, 'kimi', modelBId, displayNameB, spec, ragContext, maxHeals, log),
    ]);


    const runA = resultA.status === 'fulfilled' ? resultA.value : createFailedRun('deepseek', modelAId, resultA.reason);
    const runB = resultB.status === 'fulfilled' ? resultB.value : createFailedRun('kimi', modelBId, resultB.reason);

    battle.runs.deepseek = runA;
    battle.runs.kimi = runB;

    // ════════════════════════════════════════════════════════════
    // PHASE 3 — SCOREBOARD COMPARISON & WINNER DETERMINATION
    // ════════════════════════════════════════════════════════════
    const { winner, reason } = evaluateBattleWinner(runA, runB);
    battle.winner = winner;
    battle.winnerReason = reason;
    battle.status = 'complete';

    try {
      finalizeBattle(battleId, { winner, winnerReason: reason, status: 'complete' });
    } catch (e) {}

    log('arena', 'success', `🏆 BATTLE CONCLUDED! Winner: ${winner.toUpperCase()} — ${reason}`);

    emit(battleId, 'battle_complete', `Battle complete: ${winner.toUpperCase()} wins!`, {
      model: 'arena',
      winner,
      winnerReason: reason,
      runs: {
        deepseek: runA,
        kimi: runB,
      },
      spec,
    });

  } catch (err) {
    console.error('Arena execution failed:', err);
    battle.status = 'failed';
    log('arena', 'error', `Arena halted due to error: ${err.message}`);
    try {
      finalizeBattle(battleId, { winner: 'none', winnerReason: err.message, status: 'failed' });
    } catch (e) {}
    emit(battleId, 'battle_error', `Battle error: ${err.message}`, {
      model: 'arena',
      error: err.message,
    });
  }

  battles.set(battleId, battle);
  return battle;
}

/**
 * Executes a single model's generate -> test -> self-heal loop in sandbox isolation
 */
async function runChallengerPipeline(battleId, modelKey, modelId, displayName, spec, ragContext, maxHeals, log) {
  const startTime = Date.now();
  log(modelKey, 'stage', `[${displayName}] Synthesizing initial game build with RAG recipes...`);

  let attempt = 1;
  let healCycles = 0;
  let currentCode = null;
  let latestTestResult = null;
  let status = 'running';

  // Initial code generation
  currentCode = await withWatchdog(
    () => generateChallengerCode(modelId, spec, ragContext),
    120000,
    `${displayName} Code Synthesis`
  );


  saveChallengerFile(battleId, modelKey, attempt, currentCode);
  const loc = currentCode.split('\n').length;
  log(modelKey, 'info', `[${displayName}] Initial build compiled (${loc} lines of code). Dispatching to sensory sandbox...`);

  emit(battleId, 'challenger_code_ready', `[${displayName}] Initial build ready`, {
    model: modelKey,
    attempt,
    loc,
    gameUrl: `/games/${battleId}_${modelKey}_v${attempt}.html`,
  });

  // Sensory test + Self-Healing Loop
  let converged = false;

  while (!converged && healCycles <= maxHeals) {
    if (healCycles > 0) {
      log(modelKey, 'stage', `[${displayName}] Healing cycle ${healCycles}/${maxHeals} — verifying patched build #${attempt}...`);
    } else {
      log(modelKey, 'stage', `[${displayName}] Running sensory test suite on build #${attempt}...`);
    }

    const testResult = await runTests(
      `${battleId}_${modelKey}`,
      currentCode,
      attempt,
      (type, msg, data) => log(modelKey, type, `[${displayName}] ${msg}`, data),
      spec
    );
    latestTestResult = testResult;

    const passedCount = testResult.assertions.filter(a => a.passed).length;
    const totalCount = testResult.assertions.length;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

    log(modelKey, testResult.passed ? 'success' : 'warning',
      `[${displayName}] Build #${attempt} result: ${passedCount}/${totalCount} assertions passed (${passRate}%)`
    );

    emit(battleId, 'challenger_test_result', `[${displayName}] Build #${attempt} tests completed`, {
      model: modelKey,
      attempt,
      passed: testResult.passed,
      passRate,
      assertions: testResult.assertions,
    });

    if (testResult.passed) {
      converged = true;
      status = 'complete';
      log(modelKey, 'success', `[${displayName}] ✓ Playability certified! (Passed 100% of critical tests in ${healCycles} heal cycle${healCycles === 1 ? '' : 's'})`);
      break;
    }

    if (healCycles >= maxHeals) {
      status = 'partial';
      log(modelKey, 'warning', `[${displayName}] Reached maximum heal limit (${maxHeals}). Finalizing best effort.`);
      break;
    }

    // ── Self-Healing Trigger ──
    healCycles++;
    attempt++;
    log(modelKey, 'patch', `[${displayName}] Self-healing triggered: diagnosing ${testResult.failurePackage.length} failure(s)...`);

    const patchResult = await withWatchdog(
      () => diagnoseAndPatchChallenger(modelId, currentCode, testResult.failurePackage),
      45000,
      `${displayName} Self-Healing Patch`
    );

    if (patchResult.patchedCode) {
      currentCode = patchResult.patchedCode;
      saveChallengerFile(battleId, modelKey, attempt, currentCode);
      log(modelKey, 'patch', `[${displayName}] Surgical fix applied: ${patchResult.diagnosis.slice(0, 150)}...`);
      emit(battleId, 'challenger_patch_applied', `[${displayName}] Surgical patch applied for Build #${attempt}`, {
        model: modelKey,
        attempt,
        healCycle: healCycles,
        diagnosis: patchResult.diagnosis,
        gameUrl: `/games/${battleId}_${modelKey}_v${attempt}.html`,
      });
    } else {
      log(modelKey, 'error', `[${displayName}] Patch generation failed — proceeding with current build`);
      break;
    }
  }

  const elapsedSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
  const finalLoc = currentCode ? currentCode.split('\n').length : 0;
  const passedAssertions = latestTestResult ? latestTestResult.assertions.filter(a => a.passed).length : 0;
  const totalAssertions = latestTestResult ? latestTestResult.assertions.length : 0;
  const passRate = totalAssertions > 0 ? Math.round((passedAssertions / totalAssertions) * 100) : 0;
  const finalGameUrl = `/games/${battleId}_${modelKey}_v${attempt}.html`;
  const finalThumb = latestTestResult?.screenshots?.final
    ? `/screenshots/${path.basename(latestTestResult.screenshots.final)}`
    : null;

  const runSummary = {
    modelName: modelKey,
    modelId,
    displayName,
    status,
    passed: latestTestResult?.passed || false,
    attempt,
    healCycles,
    passRate,
    passedAssertions,
    totalAssertions,
    loc: finalLoc,
    elapsedSec,
    gameUrl: finalGameUrl,
    thumbnailUrl: finalThumb,
    finalCode: currentCode,
    testResult: latestTestResult,
  };

  try {
    saveBattleRun(battleId, runSummary);
  } catch (e) {
    console.error(`Failed to save battle run for ${modelKey}:`, e.message);
  }

  return runSummary;
}

/**
 * Evaluate Head-to-Head winner using deterministic ranking hierarchy:
 * 1. Playability certified (100% critical assertions passed)
 * 2. Pass rate percentage
 * 3. Fewer heal cycles needed
 * 4. Lower latency (generation time)
 */
function evaluateBattleWinner(runA, runB) {
  const aPassed = runA.passed;
  const bPassed = runB.passed;

  // 1. Certified Playability
  if (aPassed && !bPassed) {
    return {
      winner: 'deepseek',
      reason: 'DeepSeek achieved 100% certified playability passing all critical browser tests, while Kimi failed test assertions.',
    };
  }
  if (bPassed && !aPassed) {
    return {
      winner: 'kimi',
      reason: 'Kimi achieved 100% certified playability passing all critical browser tests, while DeepSeek failed test assertions.',
    };
  }

  // 2. Both passed OR both failed: compare pass rates
  if (runA.passRate !== runB.passRate) {
    const higher = runA.passRate > runB.passRate ? 'deepseek' : 'kimi';
    const higherRate = Math.max(runA.passRate, runB.passRate);
    const lowerRate = Math.min(runA.passRate, runB.passRate);
    return {
      winner: higher,
      reason: `${higher === 'deepseek' ? 'DeepSeek' : 'Kimi'} scored higher test pass rate (${higherRate}% vs ${lowerRate}%).`,
    };
  }

  // 3. Compare heal cycles (fewer self-heals needed = higher initial code quality)
  if (runA.healCycles !== runB.healCycles) {
    const fewer = runA.healCycles < runB.healCycles ? 'deepseek' : 'kimi';
    const fewerCount = Math.min(runA.healCycles, runB.healCycles);
    const moreCount = Math.max(runA.healCycles, runB.healCycles);
    return {
      winner: fewer,
      reason: `${fewer === 'deepseek' ? 'DeepSeek' : 'Kimi'} converged in fewer self-heal cycles (${fewerCount} vs ${moreCount}).`,
    };
  }

  // 4. Compare execution speed (latency)
  const timeDiff = Math.abs(runA.elapsedSec - runB.elapsedSec);
  if (timeDiff >= 1.0) {
    const faster = runA.elapsedSec < runB.elapsedSec ? 'deepseek' : 'kimi';
    const fasterTime = Math.min(runA.elapsedSec, runB.elapsedSec);
    const slowerTime = Math.max(runA.elapsedSec, runB.elapsedSec);
    return {
      winner: faster,
      reason: `${faster === 'deepseek' ? 'DeepSeek' : 'Kimi'} generated and verified faster (${fasterTime}s vs ${slowerTime}s).`,
    };
  }

  return {
    winner: 'tie',
    reason: 'Both models performed flawlessly with identical pass rates and comparable generation speeds.',
  };
}

function createFailedRun(modelKey, modelId, reason) {
  return {
    modelName: modelKey,
    modelId,
    displayName: modelKey === 'deepseek' ? 'DeepSeek' : 'Kimi',
    status: 'failed',
    passed: false,
    attempt: 1,
    healCycles: 0,
    passRate: 0,
    passedAssertions: 0,
    totalAssertions: 0,
    loc: 0,
    elapsedSec: 0,
    gameUrl: null,
    thumbnailUrl: null,
    finalCode: null,
    testResult: null,
    error: reason?.message || String(reason),
  };
}

// ── LLM Prompts & Code Generation ─────────────────────────────────────────────

async function generateSharedSpec(prompt, log) {
  const system = `You are a world-class 2D game designer. Convert the game request into a balanced, structured specification.
Return ONLY valid JSON with this exact schema:
{
  "title": "Short energetic title",
  "genre": "arcade | action | roguelike | puzzle | shooter | platformer",
  "description": "one sentence game summary",
  "mechanics": ["array", "of", "core", "mechanics"],
  "player": {
    "controls": ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d", "Space"],
    "abilities": ["move", "action"]
  },
  "entities": ["player", "target", "obstacle"],
  "winCondition": "clear condition to achieve win status",
  "lossCondition": "clear condition to trigger lost status",
  "scoring": "how score increments",
  "canvasSize": { "width": 800, "height": 600 }
}`;

  const response = await callLLM(system, `Design a playable 2D game: "${prompt}"`, {
    json_mode: true,
    temperature: 0.3,
  });

  try {
    return JSON.parse(response);
  } catch {
    return {
      title: 'Arena Showdown',
      genre: 'arcade',
      description: prompt,
      mechanics: ['move', 'dodge', 'score'],
      player: {
        controls: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'Space'],
        abilities: ['move', 'dodge'],
      },
      entities: ['player', 'hazard', 'bonus'],
      winCondition: 'Score 100 points',
      lossCondition: 'Health drops to 0',
      scoring: 'Collect bonuses to gain score',
      canvasSize: { width: 800, height: 600 },
    };
  }
}

async function generateChallengerCode(modelId, spec, ragContext) {
  const system = `You are an elite competitive game developer competing in an AI Code Arena.
Generate a complete, self-contained, playable HTML5 Canvas game in ONE file.

MANDATORY RULES:
1. Return ONLY the complete HTML code starting with <!DOCTYPE html> — NO markdown fences, no conversational text.
2. CONTINUOUS GAME STATE: Expose and update window.__gameState in the game loop:
   window.__gameState = {
     player: { x: player.x, y: player.y, width: player.width, height: player.height, health: player.health, speed: player.speed },
     score: score,
     status: status, // 'playing' | 'won' | 'lost'
     entities: entities
   };
3. INPUT HANDLING:
   - 'const keys = {};' at top level.
   - Window key listeners: window.addEventListener('keydown', ...) and 'keyup'.
   - Focus canvas on click: canvas.addEventListener('click', () => window.focus());
4. BOUNDARY CLAMPING:
   - player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
   - player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
5. ZERO PLAYABILITY BUGS:
   - Do NOT reduce health unconditionally every tick. Only reduce health on confirmed collisions!
   - Keep requestAnimationFrame active on game over to render the Game Over banner and allow restart.
   - Clean, compact, under 170 lines of code.

${ragContext}

GAME SPECIFICATION:
${JSON.stringify(spec, null, 2)}`;

  const code = await callLLM(system, 'Generate the complete tournament-grade HTML5 Canvas game now.', {
    model: modelId,
    temperature: 0.35,
    max_tokens: 2800,
    timeoutMs: 95000,
  });


  return cleanCode(code);
}

async function diagnoseAndPatchChallenger(modelId, currentCode, failurePackage) {
  const failureDescriptions = failurePackage.map((f, i) => `
FAILURE #${i + 1}:
Assertion: ${f.name}
Expected: ${f.expected}
Actual: ${f.actual}
${f.evidence?.message ? `Evidence: ${f.evidence.message}` : ''}
`).join('\n');

  const system = `You are a master runtime game debugger.
Diagnose why this HTML5 Canvas game failed automated sensory playtests, then provide the corrected source code.

OUTPUT FORMAT:
DIAGNOSIS:
[Brief explanation of the root cause and patch plan]

<<<FULL_REPLACEMENT>>>
[complete corrected HTML document]`;

  const userMsg = `FAILING CODE:
${currentCode}

FAILURES DETECTED IN BROWSER PLAYTEST:
${failureDescriptions}

Fix the bugs and output the corrected HTML code.`;

  try {
    const response = await callLLM(system, userMsg, {
      model: modelId,
      temperature: 0.2,
      max_tokens: 2400,
      timeoutMs: 95000,
    });


    let diagnosis = 'Automated diagnosis performed';
    const diagMatch = response.match(/DIAGNOSIS:\s*([\s\S]*?)(?:<<<FULL_REPLACEMENT>>>|$)/i);
    if (diagMatch) diagnosis = diagMatch[1].trim();

    const patchedCode = applyPatch(currentCode, response);
    return { patchedCode, diagnosis };
  } catch (err) {
    return { patchedCode: null, diagnosis: err.message };
  }
}

function cleanCode(code) {
  code = code.replace(/^```(?:html|javascript|js)?\n/, '').replace(/```$/, '').trim();
  const htmlStart = code.indexOf('<!DOCTYPE');
  const html2Start = code.indexOf('<html');
  const start = Math.min(
    htmlStart >= 0 ? htmlStart : Infinity,
    html2Start >= 0 ? html2Start : Infinity
  );
  if (start !== Infinity) {
    code = code.slice(start);
  }
  return code;
}

function saveChallengerFile(battleId, modelKey, attempt, code) {
  const filePath = path.join(GAME_DIR, `${battleId}_${modelKey}_v${attempt}.html`);
  fs.writeFileSync(filePath, code, 'utf8');
}
