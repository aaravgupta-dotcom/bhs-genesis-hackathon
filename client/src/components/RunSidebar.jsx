// client/src/components/RunSidebar.jsx
// Collapsible metadata sidebar with live stopwatch, attempt stats, and clickable stage breadcrumbs

import React, { useState, useEffect } from 'react';
import './RunSidebar.css';

const STAGES = [
  { num: 1, name: 'Spec Parse', desc: 'Natural language specification parser' },
  { num: 2, name: 'Code Gen', desc: 'Autonomous Canvas + JS synthesis' },
  { num: 3, name: 'Sensory Loop', desc: 'Headless browser runtime execution' },
  { num: 4, name: 'Playtest Bot', desc: 'Input simulation & boundary checks' },
  { num: 5, name: 'Self-Healing', desc: 'Targeted root-cause patch cycles' },
  { num: 6, name: 'Verified', desc: 'Playability certified & delivery' },
];

export default function RunSidebar({
  currentStage,
  attempt,
  healCycles,
  maxHealRetries,
  assertions,
  spec,
  isRunning,
  startTime,
  onSelectStageTab,
  activeStageTab,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Live stopwatch
  useEffect(() => {
    if (!isRunning || !startTime) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const passedCount = assertions?.filter(a => a.passed).length || 0;
  const failedCount = assertions?.filter(a => !a.passed).length || 0;

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <aside className={`run-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Toggle Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span className="sidebar-icon">📊</span>
          {!collapsed && <span>Run Telemetry</span>}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-content fade-in">
          {/* ── Metric Cards Grid ── */}
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">ELAPSED TIME</span>
              <span className="metric-value font-mono">
                {formatTime(elapsedSec)}
                {isRunning && <span className="timer-pulse"></span>}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">CURRENT BUILD</span>
              <span className="metric-value font-mono">#{attempt || 1}</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">SELF-HEAL CYCLES</span>
              <span className="metric-value font-mono">
                <span className="highlight-fuchsia">{healCycles}</span> / {maxHealRetries || 5}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">TEST ASSERTIONS</span>
              <div className="metric-assertion-counts font-mono">
                <span className="count-pass">✓ {passedCount}</span>
                <span className="count-divider">/</span>
                <span className="count-fail">✕ {failedCount}</span>
              </div>
            </div>
          </div>

          {/* ── Clickable Stage Stepper / Breadcrumbs ── */}
          <div className="stage-stepper-section">
            <div className="section-label">
              <span>PIPELINE PHASES</span>
              <span className="section-hint">Click to inspect</span>
            </div>

            <div className="stepper-list">
              {STAGES.map(s => {
                const isCurrent = currentStage === s.num;
                const isPast = currentStage > s.num;
                const isSelected = activeStageTab === s.num;

                return (
                  <button
                    key={s.num}
                    type="button"
                    className={`stepper-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectStageTab?.(s.num)}
                  >
                    <div className="stepper-dot">
                      {isPast ? '✓' : isCurrent ? <span className="stepper-pulse"></span> : s.num}
                    </div>
                    <div className="stepper-info">
                      <div className="stepper-name">Stage {s.num}: {s.name}</div>
                      <div className="stepper-desc">{s.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Game Spec Snapshot ── */}
          {spec && (
            <div className="spec-snapshot-section">
              <div className="section-label">SPEC SNAPSHOT</div>
              <div className="spec-card">
                <div className="spec-title">{spec.title}</div>
                <div className="spec-genre-badge">{spec.genre}</div>
                <div className="spec-item">
                  <strong>Win:</strong> {spec.winCondition}
                </div>
                <div className="spec-item">
                  <strong>Loss:</strong> {spec.lossCondition}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
