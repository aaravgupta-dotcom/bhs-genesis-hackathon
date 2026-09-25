// client/src/components/VerifiedState.jsx
// Final "Verified Playable" state — celebratory, on-brand fuchsia glow

import React, { useState } from 'react';
import './VerifiedState.css';

export default function VerifiedState({ jobId, attempt, gameUrl, healCycles, bugsFixed, spec, onReset }) {
  const [showReport, setShowReport] = useState(false);
  const downloadUrl = `/api/download/${jobId}/${attempt}`;
  const gameFullUrl = gameUrl;

  return (
    <div className="verified-state fade-in">
      {/* ── Hero banner ── */}
      <div className="verified-hero">
        <div className="verified-glow-ring">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div className="verified-headline">
          <h2>Verified<br /><span>Playable</span></h2>
          <div className="verified-stats">
            <div className="stat">
              <span className="stat-num">{attempt}</span>
              <span className="stat-label">build{attempt !== 1 ? 's' : ''}</span>
            </div>
            <div className="stat-div">|</div>
            <div className="stat">
              <span className="stat-num">{healCycles}</span>
              <span className="stat-label">self-heal{healCycles !== 1 ? 's' : ''}</span>
            </div>
            <div className="stat-div">|</div>
            <div className="stat">
              <span className="stat-num">{bugsFixed?.length || 0}</span>
              <span className="stat-label">bug{(bugsFixed?.length || 0) !== 1 ? 's' : ''} fixed</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Game embed ── */}
      <div className="verified-game-wrap">
        <div className="verified-game-label">
          <span className="verified-badge">✓ VERIFIED PLAYABLE</span>
          {spec?.title && <span className="game-title-label">{spec.title}</span>}
        </div>
        <div className="verified-iframe-container">
          <iframe
            src={gameFullUrl}
            className="verified-iframe"
            title="Verified game"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="verified-actions">
        <a
          href={downloadUrl}
          className="btn btn-primary"
          download="game.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Game
        </a>
        <button className="btn btn-secondary" onClick={() => setShowReport(!showReport)}>
          {showReport ? 'Hide Report' : 'View Report'}
        </button>
        <button className="btn btn-ghost" onClick={onReset}>
          ← New Game
        </button>
      </div>

      {/* ── Report ── */}
      {showReport && (
        <div className="verified-report fade-in">
          <div className="report-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Generation Report
          </div>

          <div className="report-section">
            <div className="report-section-title">Summary</div>
            <div className="report-row">
              <span className="report-key">Game</span>
              <span className="report-val">{spec?.title || 'Custom Game'}</span>
            </div>
            <div className="report-row">
              <span className="report-key">Genre</span>
              <span className="report-val">{spec?.genre}</span>
            </div>
            <div className="report-row">
              <span className="report-key">Total Builds</span>
              <span className="report-val">{attempt}</span>
            </div>
            <div className="report-row">
              <span className="report-key">Self-Heal Cycles</span>
              <span className="report-val">{healCycles}</span>
            </div>
          </div>

          {bugsFixed?.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">Bugs Detected & Fixed</div>
              {bugsFixed.map((bug, i) => (
                <div key={i} className="bug-report-item">
                  <div className="bug-cycle">Heal #{bug.cycle}</div>
                  <div className="bug-assertions">
                    Failed: {bug.failedAssertions.join(', ')}
                  </div>
                  <div className="bug-diagnosis">{bug.diagnosis}</div>
                </div>
              ))}
            </div>
          )}

          {spec && (
            <div className="report-section">
              <div className="report-section-title">Game Specification</div>
              <div className="report-row">
                <span className="report-key">Win condition</span>
                <span className="report-val">{spec.winCondition}</span>
              </div>
              <div className="report-row">
                <span className="report-key">Loss condition</span>
                <span className="report-val">{spec.lossCondition}</span>
              </div>
              <div className="report-row">
                <span className="report-key">Mechanics</span>
                <span className="report-val">{spec.mechanics?.join(', ')}</span>
              </div>
              <div className="report-row">
                <span className="report-key">Controls</span>
                <span className="report-val">{spec.player?.controls?.join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
