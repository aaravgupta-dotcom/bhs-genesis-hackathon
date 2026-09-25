// client/src/components/GamePreview.jsx
// Live preview iframe — updates with each new candidate build, fully playable directly in-window

import React, { useState, useRef, useEffect } from 'react';
import VirtualController from './VirtualController.jsx';
import './GamePreview.css';

export default function GamePreview({ jobId, attempt, isThinking, gameUrl }) {
  const [iframeKey, setIframeKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScanlinesActive, setIsScanlinesActive] = useState(false);
  const iframeRef = useRef(null);
  const viewportRef = useRef(null);

  const fullUrl = gameUrl || null;

  const handleReload = () => {
    setLoadError(false);
    setIframeKey(k => k + 1);
  };

  const handleFocusGame = () => {
    try {
      if (iframeRef.current) {
        iframeRef.current.focus();
        iframeRef.current.contentWindow?.focus();
        setIsFocused(true);
      }
    } catch (e) {
      // Focus fallback
    }
  };

  // Auto-focus the game once a build loads
  useEffect(() => {
    if (fullUrl && !isThinking) {
      const timer = setTimeout(() => {
        handleFocusGame();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [fullUrl, attempt, isThinking]);

  // Forward parent keyboard into the iframe so arrows work without clicking first
  useEffect(() => {
    if (!fullUrl) return;

    const forward = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const payload = {
        type: 'KEY_EVENT',
        eventType: e.type,
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
      };
      try { win.postMessage(payload, '*'); } catch {}
      try {
        win.dispatchEvent(new KeyboardEvent(e.type, {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          bubbles: true,
          cancelable: true,
        }));
      } catch {}
    };

    window.addEventListener('keydown', forward, { capture: true });
    window.addEventListener('keyup', forward, { capture: true });
    return () => {
      window.removeEventListener('keydown', forward, { capture: true });
      window.removeEventListener('keyup', forward, { capture: true });
    };
  }, [fullUrl, iframeKey, attempt]);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`game-preview ${isThinking ? 'thinking' : ''} ${!fullUrl ? 'empty' : ''} ${isFullscreen ? 'preview-fullscreen' : ''}`}>
      {/* ── Header ── */}
      <div className="preview-header">
        <div className="preview-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Game Preview
          {fullUrl && !isThinking && (
            <span className="badge badge-pass" style={{ marginLeft: 8 }}>
              PLAYABLE NOW
            </span>
          )}
        </div>
        <div className="preview-meta">
          {attempt > 0 && (
            <span className="preview-attempt-badge">
              Build #{attempt}
              {isThinking && <span className="badge badge-running" style={{ marginLeft: 6 }}>GENERATING</span>}
            </span>
          )}
          {fullUrl && !isThinking && (
            <>
              <button className="btn-ghost preview-control-btn" onClick={handleFocusGame} title="Focus game keyboard input">
                🎮 Focus Game
              </button>
              <button className="btn-ghost preview-control-btn" onClick={handleReload} title="Restart current build">
                ↺ Restart
              </button>
              <button className="btn-ghost preview-control-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                {isFullscreen ? '✕ Exit' : '⛶ Fullscreen'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Interactive Play Banner ── */}
      {fullUrl && !isThinking && (
        <div className={`preview-play-bar ${isFocused ? 'focused' : ''}`} onClick={handleFocusGame}>
          <div className="play-bar-hint">
            <span className="play-icon">▶</span>
            <strong>Click inside or press buttons to play</strong>
            <span className="play-controls">Controls: Arrow Keys / WASD · Space to interact</span>
          </div>
          <button className="btn btn-secondary play-focus-btn" onClick={handleFocusGame}>
            {isFocused ? '✓ Keyboard Active' : '🎮 Click to Focus'}
          </button>
        </div>
      )}

      {/* ── Preview area ── */}
      <div
        className={`preview-viewport ${isScanlinesActive ? 'crt-scanlines' : ''}`}
        ref={viewportRef}
        onClick={handleFocusGame}
      >
        {isThinking && !fullUrl && (
          <div className="preview-thinking">
            <div className="thinking-animation">
              <div className="thinking-ring ring-1"></div>
              <div className="thinking-ring ring-2"></div>
              <div className="thinking-ring ring-3"></div>
              <div className="thinking-core">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
            </div>
            <p className="thinking-label">Generating game code<span className="cursor-blink">_</span></p>
          </div>
        )}

        {isThinking && fullUrl && (
          <div className="preview-thinking-overlay">
            <span className="spinner"></span>
            <span>Self-testing build #{attempt}...</span>
          </div>
        )}

        {!fullUrl && !isThinking && (
          <div className="preview-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeOpacity="0.3"/>
              <line x1="8" y1="21" x2="16" y2="21" strokeOpacity="0.3"/>
              <line x1="12" y1="17" x2="12" y2="21" strokeOpacity="0.3"/>
            </svg>
            <p>Game will appear here once generated</p>
          </div>
        )}

        {fullUrl && (
          <div className="preview-iframe-wrap" style={{ opacity: isThinking ? 0.4 : 1 }}>
            {loadError ? (
              <div className="preview-error">
                <p>Failed to load game preview</p>
                <button className="btn-ghost" onClick={handleReload}>Try again</button>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                key={`${iframeKey}-${attempt}`}
                src={fullUrl}
                className="preview-iframe"
                title={`Game build #${attempt}`}
                sandbox="allow-scripts allow-same-origin allow-modals"
                onError={() => setLoadError(true)}
                onLoad={handleFocusGame}
                tabIndex={0}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Virtual Gamepad Controller ── */}
      {fullUrl && !isThinking && (
        <VirtualController
          iframeRef={iframeRef}
          onScanlineToggle={() => setIsScanlinesActive(!isScanlinesActive)}
          isScanlinesActive={isScanlinesActive}
        />
      )}
    </div>
  );
}
