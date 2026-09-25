// client/src/components/ArenaScreen.jsx
// AI vs AI — Game Generation Arena (DeepSeek vs Kimi on NVIDIA NIM)
// Simultaneous parallel generation, independent self-healing, side-by-side telemetry & split-screen play

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ArenaScreen.css';

const API = '';

const PRESETS = [
  {
    icon: '⚡',
    label: 'Neon Space Dodger',
    prompt: 'A high-speed neon space survival game where you pilot an agile triangle ship dodging asteroids and collecting plasma cores',
  },
  {
    icon: '⚔️',
    label: 'Cyber Samurai Slash',
    prompt: 'A top-down arcade slasher where a cyber samurai dodges incoming shurikens and slashes enemy drones for combo score',
  },
  {
    icon: '🏰',
    label: 'Retro Dungeon Escape',
    prompt: 'A retro dungeon crawler where you collect ancient gems, avoid moving fire traps, and escape with gold before health depletes',
  },
  {
    icon: '🎈',
    label: 'Pixel Bubble Pop',
    prompt: 'A fast-paced bubble popping arcade game where colorful bouncing bubbles burst into particles and award multiplying points',
  },
];

export default function ArenaScreen({ user, onShowToast, onNavigateToGenerator }) {
  // ── Battle State ──
  const [prompt, setPrompt] = useState('');
  const [maxHeals, setMaxHeals] = useState(3);
  const [battleState, setBattleState] = useState('idle'); // idle | running | complete | failed
  const [battleId, setBattleId] = useState(null);
  const [battleSpec, setBattleSpec] = useState(null);
  const [ragChunks, setRagChunks] = useState([]);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ── Challenger State ──
  const [deepseekState, setDeepseekState] = useState({
    status: 'idle', // idle | running | testing | healing | complete | failed
    stage: 'Waiting for match...',
    attempt: 0,
    healCycles: 0,
    loc: 0,
    passRate: 0,
    passed: null,
    assertions: [],
    gameUrl: null,
    logs: [],
  });

  const [kimiState, setKimiState] = useState({
    status: 'idle',
    stage: 'Waiting for match...',
    attempt: 0,
    healCycles: 0,
    loc: 0,
    passRate: 0,
    passed: null,
    assertions: [],
    gameUrl: null,
    logs: [],
  });

  // ── Outcome & Preview ──
  const [winner, setWinner] = useState(null);
  const [winnerReason, setWinnerReason] = useState(null);
  const [previewTab, setPreviewTab] = useState('compare'); // 'deepseek' | 'kimi' | 'compare'
  const [battleHistory, setBattleHistory] = useState([]);
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);

  const sseRef = useRef(null);
  const timerRef = useRef(null);
  const deepseekConsoleEndRef = useRef(null);
  const kimiConsoleEndRef = useRef(null);

  // Auto-scroll consoles
  useEffect(() => {
    deepseekConsoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deepseekState.logs]);

  useEffect(() => {
    kimiConsoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [kimiState.logs]);

  // Load past battles
  const loadHistory = useCallback(async () => {
    try {
      const headers = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
      const res = await fetch(`${API}/api/battle`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBattleHistory(data.battles || []);
      }
    } catch (e) {
      console.error('Failed to load battle history:', e);
    }
  }, [user?.token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) sseRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── SSE Event Dispatcher ──
  const handleBattleEvent = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      const model = data.model || 'arena';

      // 1. Shared Arena Level Events
      if (model === 'arena') {
        if (data.type === 'battle_spec') {
          setBattleSpec(data.spec);
          setRagChunks(data.ragChunks || []);
        } else if (data.type === 'battle_complete') {
          setBattleState('complete');
          setWinner(data.winner);
          setWinnerReason(data.winnerReason);
          if (timerRef.current) clearInterval(timerRef.current);

          if (data.runs?.deepseek) {
            setDeepseekState(prev => ({
              ...prev,
              status: data.runs.deepseek.status,
              passed: data.runs.deepseek.passed,
              passRate: data.runs.deepseek.passRate,
              healCycles: data.runs.deepseek.healCycles,
              loc: data.runs.deepseek.loc,
              gameUrl: data.runs.deepseek.gameUrl,
              assertions: data.runs.deepseek.testResult?.assertions || prev.assertions,
            }));
          }

          if (data.runs?.kimi) {
            setKimiState(prev => ({
              ...prev,
              status: data.runs.kimi.status,
              passed: data.runs.kimi.passed,
              passRate: data.runs.kimi.passRate,
              healCycles: data.runs.kimi.healCycles,
              loc: data.runs.kimi.loc,
              gameUrl: data.runs.kimi.gameUrl,
              assertions: data.runs.kimi.testResult?.assertions || prev.assertions,
            }));
          }

          loadHistory();
          onShowToast?.({
            type: 'success',
            title: 'Battle Concluded!',
            message: `Winner: ${data.winner?.toUpperCase()} — ${data.winnerReason}`,
            duration: 6000,
          });
        } else if (data.type === 'battle_error') {
          setBattleState('failed');
          if (timerRef.current) clearInterval(timerRef.current);
          onShowToast?.({
            type: 'error',
            title: 'Arena Error',
            message: data.error || 'Battle execution error',
          });
        }
      }

      // 2. DeepSeek Model Events
      if (model === 'deepseek') {
        setDeepseekState(prev => {
          const nextLogs = [...prev.logs, { ts: data.ts || Date.now(), type: data.type, message: data.message }];
          const updates = { logs: nextLogs };

          if (data.type === 'challenger_code_ready') {
            updates.status = 'testing';
            updates.stage = 'Initial Code Ready (Testing)';
            updates.attempt = data.attempt || 1;
            updates.loc = data.loc || prev.loc;
            updates.gameUrl = data.gameUrl;
          } else if (data.type === 'challenger_test_result') {
            updates.attempt = data.attempt;
            updates.passed = data.passed;
            updates.passRate = data.passRate;
            updates.assertions = data.assertions || [];
            updates.stage = data.passed ? 'Playability Certified' : `Sensory Check: ${data.passRate}%`;
          } else if (data.type === 'challenger_patch_applied') {
            updates.status = 'healing';
            updates.stage = `Self-Healing #${data.healCycle}`;
            updates.healCycles = data.healCycle;
            updates.attempt = data.attempt;
            if (data.gameUrl) updates.gameUrl = data.gameUrl;
          } else if (data.type === 'stage') {
            updates.stage = data.message.replace(/^\[DeepSeek\]\s*/, '');
          }

          return { ...prev, ...updates };
        });
      }

      // 3. Kimi Model Events
      if (model === 'kimi') {
        setKimiState(prev => {
          const nextLogs = [...prev.logs, { ts: data.ts || Date.now(), type: data.type, message: data.message }];
          const updates = { logs: nextLogs };

          if (data.type === 'challenger_code_ready') {
            updates.status = 'testing';
            updates.stage = 'Initial Code Ready (Testing)';
            updates.attempt = data.attempt || 1;
            updates.loc = data.loc || prev.loc;
            updates.gameUrl = data.gameUrl;
          } else if (data.type === 'challenger_test_result') {
            updates.attempt = data.attempt;
            updates.passed = data.passed;
            updates.passRate = data.passRate;
            updates.assertions = data.assertions || [];
            updates.stage = data.passed ? 'Playability Certified' : `Sensory Check: ${data.passRate}%`;
          } else if (data.type === 'challenger_patch_applied') {
            updates.status = 'healing';
            updates.stage = `Self-Healing #${data.healCycle}`;
            updates.healCycles = data.healCycle;
            updates.attempt = data.attempt;
            if (data.gameUrl) updates.gameUrl = data.gameUrl;
          } else if (data.type === 'stage') {
            updates.stage = data.message.replace(/^\[Kimi\]\s*/, '');
          }

          return { ...prev, ...updates };
        });
      }
    } catch (e) {
      console.warn('Error parsing battle SSE message:', e);
    }
  }, [loadHistory, onShowToast]);

  // ── Start Battle ──
  const handleStartBattle = async (selectedPrompt) => {
    const query = (selectedPrompt || prompt).trim();
    if (!query) return;

    if (sseRef.current) sseRef.current.close();
    if (timerRef.current) clearInterval(timerRef.current);

    setBattleState('running');
    setBattleSpec(null);
    setRagChunks([]);
    setWinner(null);
    setWinnerReason(null);
    setElapsedSec(0);
    setPreviewTab('compare');

    setDeepseekState({
      status: 'running',
      stage: 'Deconstructing architecture & RAG recipes...',
      attempt: 0,
      healCycles: 0,
      loc: 0,
      passRate: 0,
      passed: null,
      assertions: [],
      gameUrl: null,
      logs: [],
    });

    setKimiState({
      status: 'running',
      stage: 'Deconstructing architecture & RAG recipes...',
      attempt: 0,
      healCycles: 0,
      loc: 0,
      passRate: 0,
      passed: null,
      assertions: [],
      gameUrl: null,
      logs: [],
    });

    // Start timer
    const startTs = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(parseFloat(((Date.now() - startTs) / 1000).toFixed(1)));
    }, 200);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch(`${API}/api/battle/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: query,
          options: {
            maxHealRetries: maxHeals,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to start battle' }));
        throw new Error(err.error || `Server error: ${res.status}`);
      }

      const { battleId: newBattleId } = await res.json();
      setBattleId(newBattleId);

      // Open SSE stream
      const sse = new EventSource(`${API}/api/battle/stream/${newBattleId}`);
      sseRef.current = sse;
      sse.onmessage = handleBattleEvent;
      sse.onerror = (e) => {
        console.warn('Battle SSE connection waiting / reconnecting...');
      };
    } catch (err) {
      setBattleState('failed');
      if (timerRef.current) clearInterval(timerRef.current);
      onShowToast?.({
        type: 'error',
        title: 'Launch Failed',
        message: err.message,
      });
    }
  };

  const handleReset = () => {
    if (sseRef.current) sseRef.current.close();
    if (timerRef.current) clearInterval(timerRef.current);
    setBattleState('idle');
    setBattleId(null);
    setWinner(null);
    setWinnerReason(null);
  };

  const isRunning = battleState === 'running';
  const isComplete = battleState === 'complete';

  return (
    <div className="arena-screen fade-in">
      {/* ── ARENA HERO BANNER ── */}
      <div className="arena-hero">
        <div className="arena-hero-glow"></div>
        <div className="arena-hero-content">
          <div className="arena-badge-row">
            <span className="arena-tag fuchsia">⚔️ HEAD-TO-HEAD BATTLE ARENA</span>
            <span className="arena-tag dark">NVIDIA NIM POWERED</span>
            <span className="arena-tag outline">RAG GROUNDED · ZERO HALLUCINATION</span>
          </div>
          <h1 className="arena-title">
            DEEPSEEK <span className="vs-accent">VS</span> KIMI
          </h1>
          <p className="arena-subtitle">
            One single prompt. Two LLMs race in parallel to generate, playtest, and autonomously self-heal playable 2D browser games under identical sensory verification.
          </p>
        </div>
      </div>

      {/* ── BATTLE CONTROLS / PROMPT INTAKE ── */}
      {battleState === 'idle' && (
        <div className="arena-setup-card card-elevated">
          {/* Preset Buttons */}
          <div className="arena-presets">
            <span className="presets-label">QUICK ARENA PRESETS:</span>
            <div className="presets-grid">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  className="preset-chip"
                  onClick={() => {
                    setPrompt(p.prompt);
                    handleStartBattle(p.prompt);
                  }}
                >
                  <span className="preset-icon">{p.icon}</span>
                  <span className="preset-name">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Form */}
          <div className="arena-input-section">
            <label className="input-label" htmlFor="arena-prompt">
              ENTER YOUR GAME CONCEPT:
            </label>
            <div className="input-row">
              <textarea
                id="arena-prompt"
                className="arena-textarea"
                placeholder="e.g. A fast-paced cyberpunk survival game where you dodge incoming laser drones, deflect plasma projectiles, and collect power batteries..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
            </div>

            {/* Options Bar */}
            <div className="arena-options-bar">
              <div className="option-item">
                <span className="option-label">Max Self-Heal Cycles:</span>
                <select
                  className="option-select"
                  value={maxHeals}
                  onChange={(e) => setMaxHeals(parseInt(e.target.value, 10))}
                >
                  <option value={1}>1 cycle (Strict)</option>
                  <option value={2}>2 cycles</option>
                  <option value={3}>3 cycles (Balanced)</option>
                  <option value={5}>5 cycles (Thorough)</option>
                </select>
              </div>

              <button
                className="btn btn-primary btn-ignite"
                disabled={!prompt.trim()}
                onClick={() => handleStartBattle(prompt)}
              >
                <span>⚔️ IGNITE DUAL-AI BATTLE</span>
              </button>
            </div>
          </div>

          {/* Model Matchup Card */}
          <div className="matchup-preview-bar">
            <div className="challenger-badge deepseek">
              <div className="challenger-icon">⚡</div>
              <div className="challenger-meta">
                <span className="challenger-name">DeepSeek AI</span>
                <span className="challenger-sub">deepseek-v4.1-flash · NIM API</span>
              </div>
            </div>

            <div className="matchup-vs-token">
              <div className="vs-circle">VS</div>
            </div>

            <div className="challenger-badge kimi">
              <div className="challenger-icon">🌙</div>
              <div className="challenger-meta">
                <span className="challenger-name">Kimi AI</span>
                <span className="challenger-sub">kimi-k3 · NIM API</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVE OR COMPLETED BATTLE ARENA ── */}
      {(isRunning || isComplete) && (
        <div className="arena-active-wrap">
          {/* Battle Header / Live Ticker */}
          <div className="battle-status-bar card-elevated">
            <div className="status-bar-left">
              <div className="battle-pulse-indicator">
                {isRunning ? (
                  <span className="pulse-dot active" />
                ) : (
                  <span className="pulse-dot complete" />
                )}
                <span className="battle-status-text">
                  {isRunning ? 'BATTLE IN PROGRESS' : 'BATTLE CONCLUDED'}
                </span>
              </div>

              {battleSpec && (
                <div className="battle-spec-capsule">
                  <span className="capsule-title">{battleSpec.title}</span>
                  <span className="capsule-genre">[{battleSpec.genre?.toUpperCase()}]</span>
                </div>
              )}
            </div>

            <div className="status-bar-right">
              {ragChunks.length > 0 && (
                <div className="rag-grounding-pill" title="Shared Grounding Recipes Loaded">
                  <span className="rag-icon">🧠</span>
                  <span>RAG Grounded: {ragChunks.length} patterns</span>
                </div>
              )}
              <div className="battle-timer">
                <span className="timer-label">TIME:</span>
                <span className="timer-val">{elapsedSec}s</span>
              </div>
              {isComplete && (
                <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                  ← New Battle
                </button>
              )}
            </div>
          </div>

          {/* ── WINNER CELEBRATION CARD (IF COMPLETE) ── */}
          {isComplete && (
            <div className={`winner-card card-elevated ${winner === 'deepseek' ? 'winner-deepseek' : winner === 'kimi' ? 'winner-kimi' : 'winner-tie'}`}>
              <div className="winner-trophy-badge">
                {winner === 'tie' ? '⚖️' : '🏆'}
              </div>
              <div className="winner-info">
                <div className="winner-title-row">
                  <h2 className="winner-heading">
                    {winner === 'deepseek' && 'CHALLENGER DEEPSEEK CLAIMS VICTORY!'}
                    {winner === 'kimi' && 'CHALLENGER KIMI CLAIMS VICTORY!'}
                    {winner === 'tie' && 'HONORABLE DRAW — PERFECT PARALLEL PLAYABILITY!'}
                  </h2>
                </div>
                <p className="winner-explanation">{winnerReason}</p>
              </div>
            </div>
          )}

          {/* ── COMPARATIVE SCOREBOARD (IF COMPLETE) ── */}
          {isComplete && (
            <div className="arena-scoreboard card-elevated">
              <div className="scoreboard-header">
                <h3>⚔️ HEAD-TO-HEAD SCOREBOARD</h3>
                <span className="scoreboard-subtitle">Empirical browser test results & code metrics</span>
              </div>

              <div className="scoreboard-table-wrap">
                <table className="scoreboard-table">
                  <thead>
                    <tr>
                      <th className="col-metric">METRIC</th>
                      <th className="col-model deepseek-header">DEEPSEEK</th>
                      <th className="col-model kimi-header">KIMI</th>
                      <th className="col-verdict">ADVANTAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="metric-label">Playability Certification</td>
                      <td className={`metric-val ${deepseekState.passed ? 'pass' : 'fail'}`}>
                        {deepseekState.passed ? '✓ Certified Playable' : '✗ Unverified'}
                      </td>
                      <td className={`metric-val ${kimiState.passed ? 'pass' : 'fail'}`}>
                        {kimiState.passed ? '✓ Certified Playable' : '✗ Unverified'}
                      </td>
                      <td className="verdict-val">
                        {deepseekState.passed && !kimiState.passed && <span className="badge-win deepseek">DeepSeek</span>}
                        {kimiState.passed && !deepseekState.passed && <span className="badge-win kimi">Kimi</span>}
                        {deepseekState.passed === kimiState.passed && <span className="badge-tie">Equal</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="metric-label">Sensory Test Pass Rate</td>
                      <td className="metric-val">{deepseekState.passRate}%</td>
                      <td className="metric-val">{kimiState.passRate}%</td>
                      <td className="verdict-val">
                        {deepseekState.passRate > kimiState.passRate && <span className="badge-win deepseek">DeepSeek (+{deepseekState.passRate - kimiState.passRate}%)</span>}
                        {kimiState.passRate > deepseekState.passRate && <span className="badge-win kimi">Kimi (+{kimiState.passRate - deepseekState.passRate}%)</span>}
                        {deepseekState.passRate === kimiState.passRate && <span className="badge-tie">Equal</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="metric-label">Self-Heal Cycles Needed</td>
                      <td className="metric-val">{deepseekState.healCycles} cycle{deepseekState.healCycles === 1 ? '' : 's'}</td>
                      <td className="metric-val">{kimiState.healCycles} cycle{kimiState.healCycles === 1 ? '' : 's'}</td>
                      <td className="verdict-val">
                        {deepseekState.healCycles < kimiState.healCycles && <span className="badge-win deepseek">DeepSeek (Cleaner Code)</span>}
                        {kimiState.healCycles < deepseekState.healCycles && <span className="badge-win kimi">Kimi (Cleaner Code)</span>}
                        {deepseekState.healCycles === kimiState.healCycles && <span className="badge-tie">Equal</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="metric-label">Lines of Code (LOC)</td>
                      <td className="metric-val">{deepseekState.loc} lines</td>
                      <td className="metric-val">{kimiState.loc} lines</td>
                      <td className="verdict-val">
                        <span className="badge-tie">{Math.abs(deepseekState.loc - kimiState.loc)} line delta</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PLAYABLE GAME PREVIEW TABS (IF COMPLETE) ── */}
          {isComplete && (
            <div className="arena-preview-section card-elevated">
              <div className="preview-nav-tabs">
                <button
                  className={`tab-btn ${previewTab === 'compare' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('compare')}
                >
                  <span>⚔️ Split-Screen Compare</span>
                </button>
                <button
                  className={`tab-btn ${previewTab === 'deepseek' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('deepseek')}
                >
                  <span className="tab-dot deepseek-dot" />
                  <span>DeepSeek Game</span>
                </button>
                <button
                  className={`tab-btn ${previewTab === 'kimi' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('kimi')}
                >
                  <span className="tab-dot kimi-dot" />
                  <span>Kimi Game</span>
                </button>
              </div>

              {/* View 1: Split-Screen Comparison */}
              {previewTab === 'compare' && (
                <div className="split-screen-container">
                  <div className="split-game-pane deepseek-pane">
                    <div className="pane-header">
                      <div className="pane-title">
                        <span className="pane-dot deepseek-dot" />
                        <strong>DEEPSEEK BUILD</strong>
                        {winner === 'deepseek' && <span className="mini-winner-tag">🏆 WINNER</span>}
                      </div>
                      <div className="pane-actions">
                        <a
                          href={deepseekState.gameUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          title="Open full window"
                        >
                          ↗
                        </a>
                      </div>
                    </div>
                    <div className="split-iframe-wrapper">
                      {deepseekState.gameUrl ? (
                        <iframe
                          src={deepseekState.gameUrl}
                          title="DeepSeek Game Build"
                          className="arena-iframe"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (
                        <div className="empty-game-state">DeepSeek build not available</div>
                      )}
                    </div>
                    <div className="pane-footer">
                      <span className="focus-hint">Click canvas to focus keyboard controls (Arrow keys / WASD / Space)</span>
                    </div>
                  </div>

                  <div className="split-game-pane kimi-pane">
                    <div className="pane-header">
                      <div className="pane-title">
                        <span className="pane-dot kimi-dot" />
                        <strong>KIMI BUILD</strong>
                        {winner === 'kimi' && <span className="mini-winner-tag">🏆 WINNER</span>}
                      </div>
                      <div className="pane-actions">
                        <a
                          href={kimiState.gameUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          title="Open full window"
                        >
                          ↗
                        </a>
                      </div>
                    </div>
                    <div className="split-iframe-wrapper">
                      {kimiState.gameUrl ? (
                        <iframe
                          src={kimiState.gameUrl}
                          title="Kimi Game Build"
                          className="arena-iframe"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (
                        <div className="empty-game-state">Kimi build not available</div>
                      )}
                    </div>
                    <div className="pane-footer">
                      <span className="focus-hint">Click canvas to focus keyboard controls (Arrow keys / WASD / Space)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: DeepSeek Single Preview */}
              {previewTab === 'deepseek' && (
                <div className="single-preview-container">
                  <div className="single-iframe-wrapper">
                    {deepseekState.gameUrl && (
                      <iframe
                        src={deepseekState.gameUrl}
                        title="DeepSeek Full Build"
                        className="arena-iframe-single"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* View 3: Kimi Single Preview */}
              {previewTab === 'kimi' && (
                <div className="single-preview-container">
                  <div className="single-iframe-wrapper">
                    {kimiState.gameUrl && (
                      <iframe
                        src={kimiState.gameUrl}
                        title="Kimi Full Build"
                        className="arena-iframe-single"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DUAL LIVE TELEMETRY CONSOLES ── */}
          <div className="arena-consoles-grid">
            {/* DeepSeek Live Column */}
            <div className="model-console-card card-elevated deepseek-console">
              <div className="console-card-header">
                <div className="model-header-title">
                  <span className="header-dot deepseek-dot" />
                  <strong>DEEPSEEK AI</strong>
                  <span className="model-id-tag">deepseek-v4.1-flash</span>
                </div>
                <div className="model-stage-badge">
                  {deepseekState.stage}
                </div>
              </div>

              <div className="console-stats-bar">
                <div className="stat-unit">
                  <span className="stat-k">BUILD:</span>
                  <span className="stat-v">#{deepseekState.attempt || 1}</span>
                </div>
                <div className="stat-unit">
                  <span className="stat-k">HEALS:</span>
                  <span className="stat-v">{deepseekState.healCycles}</span>
                </div>
                <div className="stat-unit">
                  <span className="stat-k">PASS RATE:</span>
                  <span className="stat-v">{deepseekState.passRate}%</span>
                </div>
                <div className="stat-unit">
                  <span className="stat-k">LOC:</span>
                  <span className="stat-v">{deepseekState.loc}</span>
                </div>
              </div>

              <div className="console-terminal">
                {deepseekState.logs.length === 0 ? (
                  <div className="console-empty">Awaiting synthesis stream...</div>
                ) : (
                  deepseekState.logs.map((log, i) => (
                    <div key={i} className={`log-line log-${log.type}`}>
                      <span className="log-time">
                        {new Date(log.ts).toTimeString().split(' ')[0]}
                      </span>
                      <span className={`log-tag tag-${log.type}`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="log-msg">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={deepseekConsoleEndRef} />
              </div>
            </div>

            {/* Kimi Live Column */}
            <div className="model-console-card card-elevated kimi-console">
              <div className="console-card-header">
                <div className="model-header-title">
                  <span className="header-dot kimi-dot" />
                  <strong>KIMI AI</strong>
                  <span className="model-id-tag">kimi-k3</span>
                </div>
                <div className="model-stage-badge">
                  {kimiState.stage}
                </div>
              </div>

              <div className="console-stats-bar">
                <div className="stat-unit">
                  <span className="stat-k">BUILD:</span>
                  <span className="stat-v">#{kimiState.attempt || 1}</span>
                </div>
                <div className="stat-unit">
                  <span className="stat-k">HEALS:</span>
                  <span className="stat-v">{kimiState.healCycles}</span>
                </div>
                <div className="stat-unit">
                  <span className="stat-k">PASS RATE:</span>
                  <span className="stat-v">{kimiState.passRate}%</span>
                </div>
                <div className="stat-unit">
                  <span className="stat-k">LOC:</span>
                  <span className="stat-v">{kimiState.loc}</span>
                </div>
              </div>

              <div className="console-terminal">
                {kimiState.logs.length === 0 ? (
                  <div className="console-empty">Awaiting synthesis stream...</div>
                ) : (
                  kimiState.logs.map((log, i) => (
                    <div key={i} className={`log-line log-${log.type}`}>
                      <span className="log-time">
                        {new Date(log.ts).toTimeString().split(' ')[0]}
                      </span>
                      <span className={`log-tag tag-${log.type}`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="log-msg">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={kimiConsoleEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BATTLE HISTORY DRAWER / FOOTER ── */}
      {battleHistory.length > 0 && battleState === 'idle' && (
        <div className="arena-history-section card-elevated">
          <div className="history-header">
            <h3>📜 PAST ARENA SHOWDOWNS</h3>
            <span className="history-count">{battleHistory.length} battles recorded</span>
          </div>

          <div className="history-grid">
            {battleHistory.map((b) => (
              <div
                key={b.id}
                className="history-card"
                onClick={() => {
                  setBattleId(b.id);
                  setBattleSpec(b.spec);
                  setBattleState('complete');
                  setWinner(b.winner);
                  setWinnerReason(b.winner_reason);

                  const deepseekRun = b.runs?.find(r => r.model_name === 'deepseek');
                  const kimiRun = b.runs?.find(r => r.model_name === 'kimi');

                  if (deepseekRun) {
                    setDeepseekState(prev => ({
                      ...prev,
                      status: deepseekRun.status,
                      passed: deepseekRun.status === 'complete',
                      passRate: deepseekRun.pass_rate,
                      healCycles: deepseekRun.heal_cycles,
                      loc: deepseekRun.loc,
                      gameUrl: deepseekRun.game_url,
                    }));
                  }

                  if (kimiRun) {
                    setKimiState(prev => ({
                      ...prev,
                      status: kimiRun.status,
                      passed: kimiRun.status === 'complete',
                      passRate: kimiRun.pass_rate,
                      healCycles: kimiRun.heal_cycles,
                      loc: deepseekRun.loc,
                      gameUrl: kimiRun.game_url,
                    }));
                  }
                }}
              >
                <div className="history-card-top">
                  <span className="history-prompt">{b.title || b.prompt}</span>
                  <span className={`history-winner-pill ${b.winner}`}>
                    {b.winner === 'deepseek' && 'DeepSeek Win'}
                    {b.winner === 'kimi' && 'Kimi Win'}
                    {b.winner === 'tie' && 'Draw'}
                  </span>
                </div>
                <div className="history-card-meta">
                  <span>{new Date(b.created_at).toLocaleDateString()}</span>
                  <span>· {b.runs?.length || 0} models</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
