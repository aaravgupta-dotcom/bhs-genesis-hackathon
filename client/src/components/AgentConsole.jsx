// client/src/components/AgentConsole.jsx
// Real-time SSE log stream panel — the "Agent Console"

import React, { useEffect, useRef, useState } from 'react';
import './AgentConsole.css';

const STAGE_LABELS = {
  1: 'Spec Parse',
  2: 'Code Gen',
  3: 'Sensory Loop',
  4: 'Playtest Bot',
  5: 'Self-Healing',
  6: 'Verified',
};

const EVENT_ICONS = {
  stage:   '══',
  info:    '·',
  success: '✓',
  error:   '✗',
  warning: '⚠',
  test:    '▶',
  spec:    '§',
  patch:   '⟳',
  code_ready: '⚙',
  test_result: '■',
  patch_applied: '⟳',
  pipeline_complete: '★',
  pipeline_failed: '✗',
  pipeline_error: '✗',
};

const EVENT_CLASS = {
  stage:   'log-stage',
  info:    'log-info',
  success: 'log-success',
  error:   'log-error',
  warning: 'log-warning',
  test:    'log-test',
  patch:   'log-patch',
  patch_applied: 'log-patch',
  pipeline_complete: 'log-complete',
  pipeline_failed: 'log-error',
  pipeline_error: 'log-error',
  code_ready: 'log-info',
  test_result: 'log-test',
};

export default function AgentConsole({ jobId, events, currentStage, isRunning }) {
  const logEndRef = useRef(null);
  const containerRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [filter, setFilter] = useState('all');

  // Auto-scroll to bottom unless user scrolled up
  useEffect(() => {
    if (!userScrolled && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, userScrolled]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setUserScrolled(!atBottom);
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'errors') return ['error', 'warning'].includes(e.type);
    if (filter === 'tests') return ['test', 'test_result'].includes(e.type);
    if (filter === 'stages') return e.type === 'stage';
    return true;
  });

  const stageProgress = Math.min(currentStage, 6);

  return (
    <div className={`agent-console ${isRunning ? 'active-agent' : ''}`}>
      {/* ── Header ── */}
      <div className="console-header">
        <div className="console-title">
          {isRunning && <span className="console-live-dot"></span>}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          Agent Console
          {isRunning && <span className="badge badge-running" style={{ marginLeft: 8 }}>LIVE</span>}
        </div>

        {/* Stage progress */}
        <div className="console-stage-bar">
          {[1,2,3,4,5,6].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`stage-dot ${s < stageProgress ? 'done' : s === stageProgress ? 'active' : 'pending'}`}
                   title={STAGE_LABELS[s]}>
                <span className="stage-dot-label">{s}</span>
              </div>
              {i < 5 && (
                <div className={`stage-line ${s < stageProgress ? 'done' : s === stageProgress ? 'active' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Filters */}
        <div className="console-filters">
          {['all','stages','tests','errors'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="console-divider" />

      {/* ── Log body ── */}
      <div
        className="console-log"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {filteredEvents.length === 0 && (
          <div className="console-empty">
            {isRunning ? (
              <span>Waiting for agent output<span className="cursor-blink">_</span></span>
            ) : (
              <span>Start a generation to see the live agent log here</span>
            )}
          </div>
        )}

        {filteredEvents.map((event, i) => (
          <LogLine key={i} event={event} />
        ))}

        {isRunning && (
          <div className="console-working-line">
            <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }}></span>
            <span className="log-text" style={{ color: 'var(--fuchsia)' }}>
              Agent working<span className="cursor-blink">_</span>
            </span>
          </div>
        )}

        <div ref={logEndRef} />
      </div>

      {/* ── Footer ── */}
      <div className="console-footer">
        <span>{events.length} events</span>
        {userScrolled && (
          <button className="btn-ghost scroll-bottom-btn" onClick={() => {
            setUserScrolled(false);
            logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}>
            ↓ Jump to latest
          </button>
        )}
      </div>
    </div>
  );
}

function LogLine({ event }) {
  const [expanded, setExpanded] = useState(false);
  const icon = EVENT_ICONS[event.type] || '·';
  const cls = EVENT_CLASS[event.type] || 'log-info';
  const ts = new Date(event.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const hasExtra = event.assertions || event.errors || event.spec || event.diagnosis || event.state;

  return (
    <div className={`log-line ${cls} ${event.type === 'stage' ? 'log-line-stage' : ''}`}>
      <span className="log-ts">{ts}</span>
      <span className="log-icon">{icon}</span>
      <span className="log-msg">{event.message}</span>

      {/* Inline assertion summary */}
      {event.assertions && (
        <div className="log-assertions">
          {event.assertions.map((a, i) => (
            <span key={i} className={`assertion-chip ${a.passed ? 'pass' : 'fail'}`}>
              {a.passed ? '✓' : '✗'} {a.name}
            </span>
          ))}
        </div>
      )}

      {/* Expandable extra */}
      {hasExtra && !event.assertions && (
        <button className="log-expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? '▾' : '▸'}
        </button>
      )}

      {expanded && (
        <pre className="log-extra">
          {event.diagnosis && <div><span className="ex-key">Diagnosis:</span> {event.diagnosis}</div>}
          {event.errors?.length > 0 && (
            <div><span className="ex-key">Errors:</span> {event.errors.join('; ')}</div>
          )}
          {event.spec && <div>{JSON.stringify(event.spec, null, 2)}</div>}
          {event.state && <div>{JSON.stringify(event.state, null, 2)}</div>}
        </pre>
      )}
    </div>
  );
}
