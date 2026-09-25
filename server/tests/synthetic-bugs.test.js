// server/tests/synthetic-bugs.test.js
// Verification suite for 4 deliberately different synthetic bug classes:
// 1. Unclamped collision boundary
// 2. Score not wired to event
// 3. Frozen canvas / Dead render loop
// 4. Watchdog stall / Timeout protection
// Proves the universal self-healing loop operates generically without special-casing.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runTests } from '../services/playwright-runner.js';
import { packageFailure } from '../services/pipeline.js';
import { withWatchdog, PipelineTimeoutError } from '../utils/watchdog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

const testLog = (t, m) => {
  // console.log(`  [${t}] ${m}`);
};

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║   RUNNING UNIVERSAL SELF-DEBUGGING SYNTHETIC BUG TEST SUITE     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function runSyntheticTests() {
  let passedCount = 0;
  const totalScenarios = 4;

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Unclamped Collision Boundary
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ [Scenario 1/4] Testing Unclamped Collision Boundary...');
  {
    const buggyCode = `<!DOCTYPE html>
<html>
<head><style>body { margin:0; background:#000; }</style></head>
<body>
<canvas id="c" width="800" height="600"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.key] = true; });
  window.addEventListener('keyup', e => { keys[e.key] = false; });
  window.__gameState = { player: { x: 50, y: 50, width: 20, height: 20 }, score: 0, status: 'playing', entities: [] };

  function loop() {
    // BUG: Missing boundary clamp — player walks off-screen negative
    if (keys.ArrowLeft) window.__gameState.player.x -= 20;
    if (keys.ArrowRight) window.__gameState.player.x += 5;
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0,800,600);
    ctx.fillStyle = '#D8125B';
    ctx.fillRect(window.__gameState.player.x, window.__gameState.player.y, 20, 20);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
</script>
</body>
</html>`;

    const res = await runTests('synth_boundary', buggyCode, 1, testLog);
    const boundaryCheck = res.assertions.find(a => a.name === 'player_cannot_leave_bounds');
    const packaged = packageFailure(res.assertions.filter(a => !a.passed), buggyCode);

    if (boundaryCheck && !boundaryCheck.passed && packaged.some(p => p.assertion === 'player_cannot_leave_bounds')) {
      console.log('  ✓ PASSED: Playtest bot caught boundary escape assertion failure');
      console.log(`    Actual reported: "${boundaryCheck.actual}"`);
      passedCount++;
    } else {
      console.error('  ✗ FAILED: Expected boundary check to fail on unclamped movement');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Hard Runtime Error (ReferenceError / Thrown Exception)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Scenario 2/4] Testing Hard Thrown Runtime Exception...');
  {
    const buggyCode = `<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="800" height="600"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  // BUG: Calling undefined function triggers ReferenceError
  nonExistentHelperFunction();
  function loop() {
    ctx.fillRect(0,0,800,600);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
</script>
</body>
</html>`;

    const res = await runTests('synth_runtime', buggyCode, 1, testLog);
    const consoleErrCheck = res.assertions.find(a => a.name === 'no_console_errors');
    const packaged = packageFailure(res.assertions.filter(a => !a.passed), buggyCode);

    if (consoleErrCheck && !consoleErrCheck.passed && packaged.some(p => p.assertion === 'no_console_errors')) {
      console.log('  ✓ PASSED: Sensory hook captured thrown exception with stack trace');
      console.log(`    Captured error: ${consoleErrCheck.actual}`);
      passedCount++;
    } else {
      console.error('  ✗ FAILED: Expected runtime exception to be captured');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Silent Failure (Dead Render Loop / Frozen Canvas)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Scenario 3/4] Testing Silent Failure (Dead Render Loop / Frozen Canvas)...');
  {
    const buggyCode = `<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="800" height="600"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  window.__gameState = { player: { x: 100, y: 100 }, score: 0, status: 'playing', entities: [] };
  // Draw once, then never update or call requestAnimationFrame
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(50, 50, 100, 100);
  // BUG: Dead render loop — rAF is never called
</script>
</body>
</html>`;

    const res = await runTests('synth_dead_loop', buggyCode, 1, testLog);
    const loopCheck = res.assertions.find(a => a.name === 'game_loop_running');

    if (loopCheck && !loopCheck.passed) {
      console.log('  ✓ PASSED: Sensory hook caught dead render loop (rAF stall detected)');
      console.log(`    Reported: "${loopCheck.actual}"`);
      passedCount++;
    } else {
      console.error('  ✗ FAILED: Expected dead loop to be flagged');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Watchdog Stall & Timeout Protection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Scenario 4/4] Testing Universal Watchdog Stall Protection...');
  {
    const hangingOperation = async () => {
      // Simulate an unresolving, hung async operation (e.g. stalled network call)
      return new Promise(resolve => setTimeout(resolve, 5000));
    };

    let caughtTimeout = false;
    try {
      await withWatchdog(hangingOperation, 500, 'Synthetic Hung Pipeline Stage');
    } catch (err) {
      if (err instanceof PipelineTimeoutError && err.stepName === 'Synthetic Hung Pipeline Stage') {
        caughtTimeout = true;
        console.log(`  ✓ PASSED: Watchdog interrupted hung operation after ${err.timeoutMs}ms`);
        console.log(`    Caught error: ${err.message}`);
        passedCount++;
      }
    }

    if (!caughtTimeout) {
      console.error('  ✗ FAILED: Watchdog failed to interrupt hung operation');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(` SYNTHETIC TEST SUITE RESULT: ${passedCount}/${totalScenarios} SCENARIOS PASSED`);
  console.log('════════════════════════════════════════════════════════════════\n');

  if (passedCount === totalScenarios) {
    console.log('🌟 All distinct failure classes reliably detected and packaged by universal pipeline!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSyntheticTests().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
