// client/src/components/PromptScreen.jsx
// Stage 1: Landing screen with prompt input and spec display

import React, { useState, useRef } from 'react';
import './PromptScreen.css';

const DEMO_PROMPTS = [
  "A top-down shooter where you dodge bullet waves and collect power-ups",
  "A platformer where you dodge falling rocks and collect gems for points",
  "A simple space invaders clone with alien enemies and a shield system",
];

export default function PromptScreen({ onStart, isLoading, spec, initialPrompt, onNavigate }) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  React.useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      textareaRef.current?.focus();
    }
  }, [initialPrompt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (trimmed.length < 10) {
      setError('Please describe your game in at least 10 characters.');
      return;
    }
    setError('');
    onStart(trimmed);
  };

  const handleDemoPrompt = (p) => {
    setPrompt(p);
    textareaRef.current?.focus();
  };

  return (
    <div className="prompt-screen fade-in">
      {/* ── Hero ── */}
      <div className="prompt-hero">
        <div className="prompt-hero-eyebrow">
          <span className="badge badge-running">
            <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }}></span>
            AI-POWERED
          </span>
        </div>
        <h1 className="prompt-hero-title">
          Game<br />
          <span className="glow-text">Architect</span>
        </h1>
        <p className="prompt-hero-sub">
          Describe any game. Watch an AI write, test, break, and fix it — in real time.
        </p>
      </div>

      {/* ── Main input ── */}
      <form className="prompt-form" onSubmit={handleSubmit}>
        <div className="prompt-input-wrap">
          <label className="prompt-label" htmlFor="game-prompt">
            Describe the game you want
          </label>
          <textarea
            ref={textareaRef}
            id="game-prompt"
            className={`prompt-textarea ${error ? 'error' : ''}`}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(''); }}
            placeholder="e.g. A top-down shooter where you dodge bullet waves and collect power-ups to upgrade your ship..."
            rows={4}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) handleSubmit(e);
            }}
          />
          {error && <p className="prompt-error">{error}</p>}
          <div className="prompt-hint">
            <span>⌘ + Enter to generate</span>
            <span>{prompt.length} chars</span>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary prompt-submit"
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Generate Game
            </>
          )}
        </button>
      </form>

      {/* ── Quick demo prompts ── */}
      <div className="prompt-demos">
        <span className="prompt-demos-label">Quick start:</span>
        <div className="prompt-demos-list">
          {DEMO_PROMPTS.map((p, i) => (
            <button
              key={i}
              className="prompt-demo-chip"
              onClick={() => handleDemoPrompt(p)}
              disabled={isLoading}
              type="button"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Spec display (shows after Stage 1 completes) ── */}
      {spec && (
        <div className="prompt-spec fade-in">
          <div className="prompt-spec-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Game Spec Parsed
          </div>
          <div className="prompt-spec-body">
            <div className="spec-row">
              <span className="spec-key">Title</span>
              <span className="spec-val">{spec.title}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Genre</span>
              <span className="spec-val">{spec.genre}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Controls</span>
              <span className="spec-val">{spec.player?.controls?.join(', ')}</span>
            </div>
            <div className="spec-checklist">
              {spec.mechanics?.map((m, i) => (
                <div key={i} className="spec-check-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {m}
                </div>
              ))}
            </div>
            <div className="spec-row">
              <span className="spec-key">Win</span>
              <span className="spec-val">{spec.winCondition}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Loss</span>
              <span className="spec-val">{spec.lossCondition}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Pipeline overview ── */}
      <div className="prompt-pipeline-overview">
        <div className="pipeline-step">
          <div className="pipeline-step-num">01</div>
          <div className="pipeline-step-text">Parse prompt into game spec</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-step">
          <div className="pipeline-step-num">02</div>
          <div className="pipeline-step-text">Generate HTML5 Canvas game</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-step">
          <div className="pipeline-step-num">03</div>
          <div className="pipeline-step-text">Headless browser testing</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-step">
          <div className="pipeline-step-num">04</div>
          <div className="pipeline-step-text">AI playtest bot</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-step">
          <div className="pipeline-step-num">05</div>
          <div className="pipeline-step-text">Self-heal failures</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-step active">
          <div className="pipeline-step-num glow-text">06</div>
          <div className="pipeline-step-text">Verified playable</div>
        </div>
      </div>
    </div>
  );
}
