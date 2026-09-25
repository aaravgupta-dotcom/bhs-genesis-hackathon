// client/src/components/SelfHealingLab.jsx
// Chaos Monkey & Universal Self-Healing Diagnostic Studio
// Interactive live demonstration of the sensory detection watchdog and autonomous repair loop

import React, { useState, useRef, useEffect } from 'react';
import './SelfHealingLab.css';

const BUG_SCENARIOS = [
  {
    id: 'undefined_prop',
    name: 'Hard Error: Undefined Property',
    category: 'HARD_ERROR',
    severity: 'CRITICAL',
    description: 'Entity accesses undefined coordinates during collision check (TypeError: Cannot read properties of undefined)',
    corruptedCode: `// Corrupted line in collision loop:
if (checkCollision(player, enemies[i].hitbox.bounds)) { ... } // Error: hitbox is undefined!`,
    fixedCode: `// Autonomous Self-Heal AST Patch:
const hitbox = enemies[i]?.hitbox?.bounds || { x: enemies[i].x, y: enemies[i].y, width: 24, height: 24 };
if (checkCollision(player, hitbox)) { ... }`,
    diagnosis: 'TypeError: Cannot read properties of undefined (reading bounds) at checkCollision (game.js:142:31). Null-safe accessor injected with bounding box fallback.'
  },
  {
    id: 'canvas_blackout',
    name: 'Blank Canvas: Stalled Render Loop',
    category: 'CANVAS_EMPTY',
    severity: 'HIGH',
    description: 'clearRect called without drawing entities, leaving zero non-black pixel changes for >2000ms',
    corruptedCode: `// Corrupted render loop:
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
return; // Accidental early return before drawEntities()!`,
    fixedCode: `// Autonomous Self-Heal AST Patch:
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
drawStars(ctx);
drawPlayer(ctx, player);
drawAsteroids(ctx, asteroids);`,
    diagnosis: 'Sensory Watchdog: 0 non-background pixels detected across 120 consecutive frames. Restored entity render pipeline.'
  },
  {
    id: 'nan_physics',
    name: 'Physics Anomaly: NaN Coordinates',
    category: 'BROKEN_PHYSICS',
    severity: 'HIGH',
    description: 'Division by zero in velocity vector turns player coordinates into NaN, teleporting entity offscreen',
    corruptedCode: `// Corrupted vector normalization:
const len = Math.sqrt(dx * dx + dy * dy);
player.vx = (dx / len) * speed; // When len === 0, player.vx = NaN!`,
    fixedCode: `// Autonomous Self-Heal AST Patch:
const len = Math.hypot(dx, dy);
player.vx = len > 0.001 ? (dx / len) * speed : 0;
player.x = Number.isFinite(player.x) ? player.x : canvas.width / 2;`,
    diagnosis: 'Math Error: NaN propagation in entity velocity vector. Added epsilon guard and finite state recovery.'
  },
  {
    id: 'frozen_loop',
    name: 'Stuck Execution: Infinite While Loop',
    category: 'FROZEN_FRAME',
    severity: 'CRITICAL',
    description: 'Loop condition counter missing increment, causing complete browser main thread hang',
    corruptedCode: `// Corrupted spawner loop:
let count = 0;
while (count < targetEnemies) {
  spawnEnemy(); // Bug: count++ is omitted!
}`,
    fixedCode: `// Autonomous Self-Heal AST Patch:
let count = 0;
while (count < targetEnemies) {
  spawnEnemy();
  count++; // Increment restored
}`,
    diagnosis: 'Watchdog Timeout: rAF tick delayed > 5000ms. Detected infinite while loop in entity spawner.'
  },
  {
    id: 'input_lock',
    name: 'Input Lock: Unresponsive Keydown',
    category: 'UNRESPONSIVE_INPUT',
    severity: 'MEDIUM',
    description: 'Window keyboard listener registered with incorrect event names, preventing ship movement',
    corruptedCode: `// Corrupted event registration:
window.addEventListener('keypressed', (e) => { ... }); // Bug: 'keypressed' is non-standard!`,
    fixedCode: `// Autonomous Self-Heal AST Patch:
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });`,
    diagnosis: 'Input Test Bot: Simulated ArrowLeft/Right yielded 0 position delta over 60 frames. Re-bound standard keydown/keyup.'
  },
];

export default function SelfHealingLab({ onRemixPrompt, onNavigateToGenerator }) {
  const [selectedBug, setSelectedBug] = useState(BUG_SCENARIOS[0]);
  const [labState, setLabState] = useState('healthy'); // healthy | glitched | healing | verified
  const [activeStep, setActiveStep] = useState(0); // 0..5
  const [logs, setLogs] = useState([]);
  const [healCycle, setHealCycle] = useState(0);
  const [fps, setFps] = useState(60);

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    player: { x: 200, y: 150, vx: 2, vy: 1, angle: 0 },
    asteroids: [
      { x: 100, y: 80, vx: 1.2, vy: 0.8, r: 18 },
      { x: 300, y: 200, vx: -0.9, vy: 1.1, r: 24 },
      { x: 220, y: 50, vx: 0.7, vy: -1.3, r: 15 },
    ],
    glitchGlitch: false,
    blackout: false,
  });

  // Simulated Canvas Game Engine Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();
    let frameCount = 0;

    const render = (time) => {
      animRef.current = requestAnimationFrame(render);
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      frameCount++;

      if (frameCount % 30 === 0) {
        setFps(labState === 'glitched' ? 0 : Math.round(58 + Math.random() * 4));
      }

      // Check blackout bug
      if (stateRef.current.blackout) {
        ctx.fillStyle = '#08080C';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw sensory alert text
        ctx.fillStyle = '#FF2E7E';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('⚠ SENSORY WATCHDOG: 0 NON-BACKGROUND PIXELS DETECTED', 40, canvas.height / 2);
        return;
      }

      // Normal clear
      ctx.fillStyle = '#14151C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 47) % canvas.width;
        const sy = (i * 31 + frameCount * 0.5) % canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Glitch visual distortion
      if (stateRef.current.glitchGlitch) {
        ctx.fillStyle = 'rgba(216, 18, 91, 0.25)';
        for (let g = 0; g < 4; g++) {
          const gy = Math.random() * canvas.height;
          ctx.fillRect(0, gy, canvas.width, Math.random() * 8 + 2);
        }
      }

      // Update & Draw Asteroids
      const { asteroids, player } = stateRef.current;
      asteroids.forEach(a => {
        if (labState !== 'glitched') {
          a.x = (a.x + a.vx + canvas.width) % canvas.width;
          a.y = (a.y + a.vy + canvas.height) % canvas.height;
        }

        ctx.strokeStyle = '#62677A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Update & Draw Player
      if (labState !== 'glitched') {
        player.x = (player.x + player.vx + canvas.width) % canvas.width;
        player.y = (player.y + player.vy + canvas.height) % canvas.height;
        player.angle += 0.02;
      }

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      // Ship body
      ctx.fillStyle = stateRef.current.glitchGlitch ? '#EF4444' : '#D8125B';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      // Shield glow
      ctx.strokeStyle = stateRef.current.glitchGlitch ? '#EF4444' : '#FF2E7E';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [labState]);

  // Inject Bug handler
  const handleInjectBug = () => {
    setLabState('glitched');
    setActiveStep(1);
    stateRef.current.glitchGlitch = true;
    if (selectedBug.id === 'canvas_blackout') {
      stateRef.current.blackout = true;
    }

    setLogs(prev => [
      { type: 'FATAL', msg: `[SensoryWatchdog] ${selectedBug.name} triggered!`, ts: new Date().toLocaleTimeString() },
      { type: 'DETECTOR', msg: `Failure Class: ${selectedBug.category} (${selectedBug.severity})`, ts: new Date().toLocaleTimeString() }
    ]);
  };

  // Run Autonomous Self-Healing Sequence
  const handleTriggerHeal = () => {
    setLabState('healing');
    setActiveStep(2);

    const stepLogs = [
      { step: 2, delay: 500, log: { type: 'DIAGNOSE', msg: `AST Diagnostic: ${selectedBug.diagnosis}`, ts: new Date().toLocaleTimeString() } },
      { step: 3, delay: 1200, log: { type: 'PATCH', msg: `Generated unified AST diff patch (Confidence: 99.2%)`, ts: new Date().toLocaleTimeString() } },
      { step: 4, delay: 2000, log: { type: 'SANDBOX', msg: `Playwright headless sandbox: 10/10 assertions PASS`, ts: new Date().toLocaleTimeString() } },
      { step: 5, delay: 2700, log: { type: 'VERIFIED', msg: `Candidate build hot-reloaded. 60 FPS restored.`, ts: new Date().toLocaleTimeString() } },
    ];

    stepLogs.forEach(({ step, delay, log }) => {
      setTimeout(() => {
        setActiveStep(step);
        setLogs(prev => [...prev, log]);

        if (step === 5) {
          stateRef.current.glitchGlitch = false;
          stateRef.current.blackout = false;
          setLabState('verified');
          setHealCycle(c => c + 1);
        }
      }, delay);
    });
  };

  const handleReset = () => {
    stateRef.current.glitchGlitch = false;
    stateRef.current.blackout = false;
    setLabState('healthy');
    setActiveStep(0);
    setLogs([]);
  };

  return (
    <div className="self-healing-lab fade-in">
      {/* ── Header ── */}
      <div className="lab-header-card">
        <div className="lab-title-group">
          <div className="lab-badge">
            <span>🛠️ UNIVERSAL DEBUGGER & SENSORY LOOP</span>
          </div>
          <h2>Self-Healing Chaos Diagnostic Lab</h2>
          <p className="lab-subtitle">
            Experience the automated self-debugging pipeline in real-time. Intentionally inject game failure classes and watch the sensory watchdog catch, diagnose, and auto-heal the running code.
          </p>
        </div>

        <div className="lab-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              onRemixPrompt?.(`A high-speed survival game with bullet hell mechanics, full self-healing crash recovery, and instant respawn`);
              onNavigateToGenerator?.();
            }}
          >
            <span>⚡ Generate Self-Healing Game</span>
          </button>
        </div>
      </div>

      {/* ── 5-Stage Visual Workflow ── */}
      <div className="pipeline-tracker-card">
        <div className="tracker-steps">
          <div className={`t-step ${activeStep >= 1 ? (activeStep === 1 ? 'error' : 'done') : 'pending'}`}>
            <span className="step-num">01</span>
            <span className="step-label">Sensory Watchdog</span>
            <span className="step-status">{activeStep === 1 ? 'BUG DETECTED' : activeStep > 1 ? '✓ TRIPPED' : 'MONITORING'}</span>
          </div>
          <div className="t-arrow">→</div>
          <div className={`t-step ${activeStep >= 2 ? (activeStep === 2 ? 'active' : 'done') : 'pending'}`}>
            <span className="step-num">02</span>
            <span className="step-label">AST Diagnosis</span>
            <span className="step-status">{activeStep === 2 ? 'PARSING...' : activeStep > 2 ? '✓ ROOT CAUSE' : 'STANDBY'}</span>
          </div>
          <div className="t-arrow">→</div>
          <div className={`t-step ${activeStep >= 3 ? (activeStep === 3 ? 'active' : 'done') : 'pending'}`}>
            <span className="step-num">03</span>
            <span className="step-label">Diff Synthesis</span>
            <span className="step-status">{activeStep === 3 ? 'PATCHING...' : activeStep > 3 ? '✓ PATCH READY' : 'STANDBY'}</span>
          </div>
          <div className="t-arrow">→</div>
          <div className={`t-step ${activeStep >= 4 ? (activeStep === 4 ? 'active' : 'done') : 'pending'}`}>
            <span className="step-num">04</span>
            <span className="step-label">Headless Sandbox</span>
            <span className="step-status">{activeStep === 4 ? 'TESTING...' : activeStep > 4 ? '✓ 10/10 PASS' : 'STANDBY'}</span>
          </div>
          <div className="t-arrow">→</div>
          <div className={`t-step ${activeStep === 5 ? 'verified' : 'pending'}`}>
            <span className="step-num">05</span>
            <span className="step-label">Verified Playable</span>
            <span className="step-status">{activeStep === 5 ? '✓ 60 FPS LIVE' : 'STANDBY'}</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Grid ── */}
      <div className="lab-main-grid">
        {/* Left: Scenarios Selector */}
        <div className="scenarios-panel">
          <h3 className="panel-title">1. Select Failure Class</h3>
          <div className="scenarios-list">
            {BUG_SCENARIOS.map((bug) => (
              <div
                key={bug.id}
                className={`scenario-card ${selectedBug.id === bug.id ? 'active' : ''}`}
                onClick={() => { setSelectedBug(bug); handleReset(); }}
              >
                <div className="scenario-header">
                  <span className="scenario-name">{bug.name}</span>
                  <span className="badge badge-fail">{bug.severity}</span>
                </div>
                <p className="scenario-desc">{bug.description}</p>
                <span className="scenario-cat font-mono">{bug.category}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Live Sandbox Canvas */}
        <div className="canvas-panel">
          <div className="canvas-header-bar">
            <div className="live-status font-mono">
              <span className={`status-indicator ${labState}`}></span>
              <span>STATE: {labState.toUpperCase()}</span>
              <span className="fps-counter">FPS: {fps}</span>
              <span className="heal-count highlight-fuchsia">HEALS: {healCycle}</span>
            </div>

            <div className="canvas-actions">
              {labState === 'healthy' && (
                <button className="btn btn-danger btn-sm" onClick={handleInjectBug}>
                  💥 Inject Bug
                </button>
              )}
              {labState === 'glitched' && (
                <button className="btn btn-primary btn-sm btn-pulse" onClick={handleTriggerHeal}>
                  🛠️ Auto-Heal Now
                </button>
              )}
              {labState === 'verified' && (
                <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                  ↺ Reset Test
                </button>
              )}
            </div>
          </div>

          <div className="canvas-box">
            <canvas
              ref={canvasRef}
              width={520}
              height={320}
              className={`live-sandbox-canvas ${labState === 'glitched' ? 'glitch-border' : ''}`}
            />
          </div>

          {/* Diff Inspector */}
          <div className="diff-inspector">
            <div className="diff-tabs-bar">
              <span className="diff-title font-mono">CODE DIFF: {selectedBug.category}</span>
            </div>
            <div className="diff-columns font-mono">
              <div className="diff-col diff-corrupted">
                <div className="diff-label">❌ Corrupted Candidate</div>
                <pre><code>{selectedBug.corruptedCode}</code></pre>
              </div>
              <div className="diff-col diff-fixed">
                <div className="diff-label">✓ Autonomous Healed Patch</div>
                <pre><code>{selectedBug.fixedCode}</code></pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Watchdog Console */}
        <div className="telemetry-panel">
          <div className="telemetry-header">
            <h3 className="panel-title">Sensory Telemetry</h3>
            <span className="font-mono text-xs text-neutral-400">WATCHDOG V2.4</span>
          </div>

          <div className="console-stream font-mono">
            {logs.length === 0 ? (
              <div className="console-empty">
                <span>[Watchdog] Ready. Click 'Inject Bug' to simulate error traps.</span>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`console-line line-${log.type.toLowerCase()}`}>
                  <span className="c-ts">[{log.ts}]</span>
                  <span className={`c-tag tag-${log.type.toLowerCase()}`}>{log.type}</span>
                  <span className="c-msg">{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
