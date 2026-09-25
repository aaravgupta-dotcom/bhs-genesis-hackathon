// client/src/components/GameDetailModal.jsx
// Deep-dive detail modal with tabs: Play, Console Log Replay, Test Results, and Patch History

import React, { useState, useEffect, useRef } from 'react';
import VirtualController from './VirtualController.jsx';
import './GameDetailModal.css';

export default function GameDetailModal({
  gameId,
  user,
  onClose,
  onRemixPrompt,
  onShowToast,
}) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('play'); // play | console | tests | patches
  const [selectedAttempt, setSelectedAttempt] = useState(1);
  const [logFilter, setLogFilter] = useState('all');
  const [isScanlinesActive, setIsScanlinesActive] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!gameId || !user?.token) return;
    setLoading(true);

    fetch(`/api/games/${gameId}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load game details');
        return res.json();
      })
      .then(data => {
        setGame(data.game);
        if (data.game?.final_attempt) {
          setSelectedAttempt(data.game.final_attempt);
        }
      })
      .catch(err => {
        onShowToast?.({ type: 'error', title: 'Load Failed', message: err.message });
        onClose();
      })
      .finally(() => setLoading(false));
  }, [gameId, user?.token]);

  if (!gameId) return null;

  const currentAttemptData = game?.attempts?.find(a => a.attempt_number === selectedAttempt) || game?.attempts?.[0];
  const assertions = currentAttemptData?.testResult?.assertions || [];
  const events = game?.events || [];

  const filteredEvents = events.filter(e => {
    if (logFilter === 'stages') return e.type === 'stage';
    if (logFilter === 'tests') return e.type === 'test' || e.type === 'test_result';
    if (logFilter === 'errors') return e.type === 'error' || e.type === 'warning';
    return true;
  });

  const playUrl = game?.game_url || `/games/${game?.id}_v${selectedAttempt}.html`;
  const downloadUrl = game?.game_url ? game.game_url : `/api/download/${game?.id}/${selectedAttempt}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content detail-modal fade-in" onClick={e => e.stopPropagation()}>
        {/* ── Modal Header ── */}
        <div className="modal-header detail-header">
          <div className="detail-title-group">
            <div className="detail-genre">{game?.genre || 'Arcade'}</div>
            <h3>{game?.title || 'Game Archive Detail'}</h3>
          </div>
          <div className="detail-header-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                onRemixPrompt(game?.prompt);
                onClose();
              }}
            >
              ⚡ Remix Prompt
            </button>
            <a
              href={downloadUrl}
              download={`${game?.title || 'game'}_v${selectedAttempt}.html`}
              className="btn btn-secondary btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              ⬇ Download
            </a>
            <button className="btn-ghost modal-close-btn" onClick={onClose} aria-label="Close detail modal">
              ✕
            </button>
          </div>
        </div>

        {/* ── Tabs Navigation Bar ── */}
        <div className="detail-tabs-bar">
          <div className="tabs-nav">
            <button
              className={`detail-tab-btn ${activeTab === 'play' ? 'active' : ''}`}
              onClick={() => setActiveTab('play')}
            >
              🎮 Play Game
            </button>
            <button
              className={`detail-tab-btn ${activeTab === 'console' ? 'active' : ''}`}
              onClick={() => setActiveTab('console')}
            >
              📜 Console Replay ({events.length})
            </button>
            <button
              className={`detail-tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
              onClick={() => setActiveTab('tests')}
            >
              🧪 Sensory Tests ({assertions.length})
            </button>
            <button
              className={`detail-tab-btn ${activeTab === 'patches' ? 'active' : ''}`}
              onClick={() => setActiveTab('patches')}
            >
              🛠 Patch History ({game?.healLogs?.length || 0})
            </button>
          </div>

          {/* Attempt Selector */}
          {game?.attempts?.length > 1 && (
            <div className="attempt-selector">
              <label>Build Version:</label>
              <select
                value={selectedAttempt}
                onChange={e => setSelectedAttempt(parseInt(e.target.value, 10))}
                className="attempt-select"
              >
                {game.attempts.map(a => (
                  <option key={a.attempt_number} value={a.attempt_number}>
                    Build #{a.attempt_number} {a.testResult?.passed ? '(✓ Pass)' : '(Failed)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Tab Panels Content ── */}
        <div className="modal-body detail-body">
          {loading ? (
            <div className="detail-loading">
              <span className="spinner-fuchsia"></span>
              <p>Reconstituting game session & telemetry...</p>
            </div>
          ) : (
            <>
              {/* ── TAB 1: PLAY ── */}
              {activeTab === 'play' && (
                <div className="detail-play-view fade-in">
                  <div className={`play-frame-bezel ${isScanlinesActive ? 'crt-scanlines' : ''}`}>
                    <iframe
                      ref={iframeRef}
                      src={playUrl}
                      className="detail-iframe"
                      title={game?.title}
                      sandbox="allow-scripts allow-same-origin allow-modals"
                    />
                  </div>
                  <div className="play-instructions-bar">
                    <span>🎮 <strong>Controls:</strong> Arrow Keys / WASD · Space to interact · Click canvas to focus</span>
                    <a href={playUrl} target="_blank" rel="noopener noreferrer" className="open-tab-link">
                      Open in New Tab ↗
                    </a>
                  </div>
                  <VirtualController
                    iframeRef={iframeRef}
                    onScanlineToggle={() => setIsScanlinesActive(!isScanlinesActive)}
                    isScanlinesActive={isScanlinesActive}
                  />
                </div>
              )}

              {/* ── TAB 2: CONSOLE LOG REPLAY ── */}
              {activeTab === 'console' && (
                <div className="detail-console-view fade-in">
                  <div className="console-filter-bar">
                    <span className="filter-label">Filter Log:</span>
                    {['all', 'stages', 'tests', 'errors'].map(f => (
                      <button
                        key={f}
                        className={`filter-btn ${logFilter === f ? 'active' : ''}`}
                        onClick={() => setLogFilter(f)}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="detail-terminal-panel font-mono">
                    {filteredEvents.length === 0 ? (
                      <div className="terminal-empty">No events recorded for this filter.</div>
                    ) : (
                      filteredEvents.map((ev, i) => (
                        <div key={i} className={`terminal-line line-${ev.type || 'info'}`}>
                          <span className="line-ts">
                            {new Date(ev.ts || Date.now()).toLocaleTimeString()}
                          </span>
                          <span className="line-type">[{ev.type?.toUpperCase()}]</span>
                          <span className="line-msg">{ev.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3: TEST RESULTS ── */}
              {activeTab === 'tests' && (
                <div className="detail-tests-view fade-in">
                  <div className="tests-summary-bar">
                    <div className="summary-pill pass">
                      ✓ {assertions.filter(a => a.passed).length} Passed
                    </div>
                    <div className="summary-pill fail">
                      ✕ {assertions.filter(a => !a.passed).length} Failed
                    </div>
                    <span className="test-context-label">
                      Showing empirical sensory checks for Build #{selectedAttempt}
                    </span>
                  </div>

                  <div className="detail-assertions-list">
                    {assertions.length === 0 ? (
                      <div className="terminal-empty">No assertion record stored for this build.</div>
                    ) : (
                      assertions.map((a, i) => (
                        <div key={i} className={`assertion-card ${a.passed ? 'passed' : 'failed'}`}>
                          <div className="assertion-head">
                            <span className="assertion-status-icon">{a.passed ? '✓' : '✕'}</span>
                            <div className="assertion-titles">
                              <span className="assertion-name">{a.label || a.name}</span>
                              <span className="assertion-code font-mono">{a.name}</span>
                            </div>
                            <span className={`badge ${a.passed ? 'badge-pass' : 'badge-fail'}`}>
                              {a.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </div>

                          <div className="assertion-details">
                            {a.expected && (
                              <div className="detail-row">
                                <span className="detail-k">Expected:</span>
                                <span className="detail-v">{a.expected}</span>
                              </div>
                            )}
                            {a.actual && (
                              <div className="detail-row">
                                <span className="detail-k">Actual:</span>
                                <span className="detail-v">{a.actual}</span>
                              </div>
                            )}
                            {a.evidence?.screenshot && (
                              <div className="detail-screenshot">
                                <img src={a.evidence.screenshot} alt={a.name} className="assertion-screenshot-img" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 4: PATCH HISTORY ── */}
              {activeTab === 'patches' && (
                <div className="detail-patches-view fade-in">
                  {!game?.healLogs || game.healLogs.length === 0 ? (
                    <div className="library-empty-state" style={{ margin: '20px auto', padding: '30px' }}>
                      <div className="empty-state-icon">✨</div>
                      <h4>Zero Self-Heal Cycles Required</h4>
                      <p>This game build converged on attempt #1 with all critical sensory checks passing!</p>
                    </div>
                  ) : (
                    <div className="patches-timeline">
                      {game.healLogs.map((heal, i) => (
                        <div key={i} className="patch-card">
                          <div className="patch-badge">
                            HEAL CYCLE #{heal.cycle} (TO BUILD #{heal.attempt})
                          </div>
                          <div className="patch-failures">
                            <strong>Repaired Failures:</strong>
                            <div className="failure-tags">
                              {heal.failedAssertions?.map((f, j) => (
                                <span key={j} className="badge badge-fail font-mono">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div className="patch-diagnosis">
                            <strong>Root-Cause Diagnosis:</strong>
                            <p>{heal.diagnosis || 'Empirical patch applied'}</p>
                          </div>
                          {heal.rationale && (
                            <div className="patch-rationale">
                              <strong>Patch Rationale:</strong>
                              <p>{heal.rationale}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
