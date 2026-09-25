// client/src/components/TestResults.jsx
// Test assertion results panel with pass/fail status and expandable evidence

import React, { useState } from 'react';
import './TestResults.css';

const ASSERTION_LABELS = {
  no_console_errors: 'No runtime errors',
  canvas_renders_content: 'Canvas renders content',
  game_loop_running: 'Game loop active',
  player_entity_exists: 'Player entity found',
  player_moves_on_input: 'Player responds to input',
  player_cannot_leave_bounds: 'Player stays in bounds',
  score_increments_on_events: 'Score increments on events',
};

const ASSERTION_DESCRIPTIONS = {
  no_console_errors: 'Checks for JavaScript syntax errors, reference errors, and runtime exceptions',
  canvas_renders_content: 'Verifies that the canvas element has non-blank pixel content',
  game_loop_running: 'Counts requestAnimationFrame calls to detect frozen game loops',
  player_entity_exists: 'Checks window.__gameState.player for a valid player entity',
  player_moves_on_input: 'Simulates ArrowRight/d key input and verifies player position changes',
  player_cannot_leave_bounds: 'Holds ArrowLeft + ArrowRight for 2s each, verifies player stays within canvas',
  score_increments_on_events: 'Simulates collect actions and checks window.__gameState.score increments',
};

export default function TestResults({ assertions, healCycles, attempt, isRunning }) {
  const passed = assertions.filter(a => a.passed).length;
  const total = assertions.length;
  const critical = ['no_console_errors', 'canvas_renders_content', 'game_loop_running', 'player_moves_on_input', 'player_cannot_leave_bounds'];
  const criticalPassed = assertions.filter(a => critical.includes(a.name) && a.passed).length;
  const criticalTotal = assertions.filter(a => critical.includes(a.name)).length;

  return (
    <div className="test-results">
      {/* ── Header ── */}
      <div className="results-header">
        <div className="results-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          Test Results
        </div>
        {assertions.length > 0 && (
          <div className="results-summary">
            <span className={`results-count ${passed === total ? 'all-pass' : 'some-fail'}`}>
              {passed}/{total}
            </span>
            <span className="results-label">assertions</span>
            {healCycles > 0 && (
              <span className="badge badge-running" style={{ marginLeft: 8 }}>
                {healCycles} heal{healCycles !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Critical score ── */}
      {assertions.length > 0 && (
        <div className="results-critical-bar">
          <div className="critical-label">
            Critical checks: {criticalPassed}/{criticalTotal}
          </div>
          <div className="critical-progress">
            <div
              className="critical-fill"
              style={{ width: `${criticalTotal > 0 ? (criticalPassed / criticalTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Assertion list ── */}
      <div className="assertions-list">
        {assertions.length === 0 && (
          <div className="assertions-empty">
            {isRunning ? (
              <span>
                <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }}></span>
                {' '}Running assertions...
              </span>
            ) : (
              <span>No test results yet</span>
            )}
          </div>
        )}

        {assertions.map((a, i) => (
          <AssertionRow
            key={`${a.name}-${attempt}`}
            assertion={a}
            isCritical={critical.includes(a.name)}
            description={ASSERTION_DESCRIPTIONS[a.name]}
            index={i}
          />
        ))}
      </div>

      {/* ── Attempt history ── */}
      {attempt > 1 && (
        <div className="attempt-history">
          <div className="history-label">Build history</div>
          <div className="history-pills">
            {Array.from({ length: attempt }, (_, i) => i + 1).map(n => (
              <div
                key={n}
                className={`history-pill ${n === attempt ? 'current' : n < attempt ? 'healed' : ''}`}
              >
                #{n}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssertionRow({ assertion, isCritical, description, index }) {
  const [expanded, setExpanded] = useState(false);
  const { name, label, passed, evidence } = assertion;
  const displayLabel = ASSERTION_LABELS[name] || label || name;

  return (
    <div
      className={`assertion-row ${passed ? 'pass' : 'fail'} ${isCritical ? 'critical' : 'optional'} fade-in`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="assertion-main" onClick={() => evidence && setExpanded(!expanded)}>
        <div className="assertion-icon">
          {passed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          )}
        </div>
        <div className="assertion-info">
          <div className="assertion-name">
            {displayLabel}
            {isCritical && <span className="critical-badge">CRITICAL</span>}
          </div>
          {description && <div className="assertion-desc">{description}</div>}
        </div>
        {evidence && (
          <button
            className="assertion-expand"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            aria-label={expanded ? 'Collapse evidence' : 'Expand evidence'}
          >
            {expanded ? '▾ Hide' : '▸ Evidence'}
          </button>
        )}
      </div>

      {expanded && evidence && (
        <div className="assertion-evidence fade-in">
          {evidence.screenshot && (
            <div className="evidence-screenshot">
              <img
                src={evidence.screenshot}
                alt={`Screenshot for ${name}`}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          {evidence.message && (
            <div className="evidence-text">
              <span className="evidence-key">Message:</span> {evidence.message}
            </div>
          )}
          {evidence.errors?.length > 0 && (
            <div className="evidence-errors">
              {evidence.errors.map((e, i) => (
                <div key={i} className="evidence-error-line">{e}</div>
              ))}
            </div>
          )}
          {(evidence.before || evidence.after) && (
            <div className="evidence-positions">
              <div><span className="evidence-key">Before:</span> {JSON.stringify(evidence.before)}</div>
              <div><span className="evidence-key">After:</span> {JSON.stringify(evidence.after)}</div>
            </div>
          )}
          {evidence.position && (
            <div className="evidence-text">
              <span className="evidence-key">Position:</span> {JSON.stringify(evidence.position)}
            </div>
          )}
          {evidence.canvasSize && (
            <div className="evidence-text">
              <span className="evidence-key">Canvas:</span> {evidence.canvasSize.width}×{evidence.canvasSize.height}
            </div>
          )}
          {(evidence.initialScore !== undefined || evidence.finalScore !== undefined) && (
            <div className="evidence-text">
              <span className="evidence-key">Score:</span> {evidence.initialScore} → {evidence.finalScore}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
