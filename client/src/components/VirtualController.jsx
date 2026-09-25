// client/src/components/VirtualController.jsx
// On-Screen Virtual Arcade Gamepad & Keybinding Visualizer
// Forwards virtual clicks & touch events as real KeyboardEvents into the game iframe

import React, { useState, useEffect } from 'react';
import './VirtualController.css';

export default function VirtualController({ iframeRef, onScanlineToggle, isScanlinesActive }) {
  const [activeKeys, setActiveKeys] = useState({});
  const [isOpen, setIsOpen] = useState(true);

  // Monitor real keyboard events to light up keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      setActiveKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true, [e.code.toLowerCase()]: true }));
    };
    const handleKeyUp = (e) => {
      setActiveKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false, [e.code.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Dispatch key event into iframe
  const dispatchKey = (key, code, keyCode, type) => {
    try {
      const doc = iframeRef?.current?.contentDocument || iframeRef?.current?.contentWindow?.document;
      const win = iframeRef?.current?.contentWindow;
      if (!win) return;

      const event = new KeyboardEvent(type, {
        key,
        code,
        keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
      });

      win.dispatchEvent(event);
      if (doc) doc.dispatchEvent(event);

      // Track active keys visually
      setActiveKeys(prev => ({ ...prev, [key.toLowerCase()]: type === 'keydown' }));
    } catch (err) {
      // Cross-origin fallback via postMessage
      iframeRef?.current?.contentWindow?.postMessage({
        type: 'KEY_EVENT',
        eventType: type,
        key,
        code,
        keyCode,
      }, '*');
    }
  };

  const handlePressStart = (key, code, keyCode) => {
    dispatchKey(key, code, keyCode, 'keydown');
  };

  const handlePressEnd = (key, code, keyCode) => {
    dispatchKey(key, code, keyCode, 'keyup');
  };

  return (
    <div className={`virtual-controller-wrap ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="controller-toggle-bar">
        <button
          className="btn-controller-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title="Toggle On-Screen Gamepad & Controls HUD"
        >
          <span>🕹️ {isOpen ? 'Hide Controls' : 'Show Virtual Gamepad'}</span>
        </button>

        {onScanlineToggle && (
          <button
            className={`btn-scanline-toggle ${isScanlinesActive ? 'active' : ''}`}
            onClick={onScanlineToggle}
            title="Toggle CRT Retro Scanline Filter"
          >
            <span>📺 CRT FX: {isScanlinesActive ? 'ON' : 'OFF'}</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="controller-body fade-in">
          {/* ── Left Side: D-Pad ── */}
          <div className="dpad-cluster">
            <button
              className={`dpad-btn dpad-up ${activeKeys['arrowup'] || activeKeys['w'] ? 'pressed' : ''}`}
              onMouseDown={() => handlePressStart('ArrowUp', 'ArrowUp', 38)}
              onMouseUp={() => handlePressEnd('ArrowUp', 'ArrowUp', 38)}
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('ArrowUp', 'ArrowUp', 38); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('ArrowUp', 'ArrowUp', 38); }}
              title="Move Up (ArrowUp / W)"
            >
              ▲
            </button>
            <div className="dpad-middle-row">
              <button
                className={`dpad-btn dpad-left ${activeKeys['arrowleft'] || activeKeys['a'] ? 'pressed' : ''}`}
                onMouseDown={() => handlePressStart('ArrowLeft', 'ArrowLeft', 37)}
                onMouseUp={() => handlePressEnd('ArrowLeft', 'ArrowLeft', 37)}
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('ArrowLeft', 'ArrowLeft', 37); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('ArrowLeft', 'ArrowLeft', 37); }}
                title="Move Left (ArrowLeft / A)"
              >
                ◀
              </button>
              <div className="dpad-center"></div>
              <button
                className={`dpad-btn dpad-right ${activeKeys['arrowright'] || activeKeys['d'] ? 'pressed' : ''}`}
                onMouseDown={() => handlePressStart('ArrowRight', 'ArrowRight', 39)}
                onMouseUp={() => handlePressEnd('ArrowRight', 'ArrowRight', 39)}
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('ArrowRight', 'ArrowRight', 39); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('ArrowRight', 'ArrowRight', 39); }}
                title="Move Right (ArrowRight / D)"
              >
                ▶
              </button>
            </div>
            <button
              className={`dpad-btn dpad-down ${activeKeys['arrowdown'] || activeKeys['s'] ? 'pressed' : ''}`}
              onMouseDown={() => handlePressStart('ArrowDown', 'ArrowDown', 40)}
              onMouseUp={() => handlePressEnd('ArrowDown', 'ArrowDown', 40)}
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('ArrowDown', 'ArrowDown', 40); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('ArrowDown', 'ArrowDown', 40); }}
              title="Move Down (ArrowDown / S)"
            >
              ▼
            </button>
          </div>

          {/* ── Center: Key Binding Visualizer ── */}
          <div className="key-binding-hud">
            <span className="hud-title font-mono">LIVE INPUT MONITOR</span>
            <div className="hud-keys-row">
              <span className={`hud-key ${activeKeys['w'] ? 'lit' : ''}`}>W</span>
              <span className={`hud-key ${activeKeys['a'] ? 'lit' : ''}`}>A</span>
              <span className={`hud-key ${activeKeys['s'] ? 'lit' : ''}`}>S</span>
              <span className={`hud-key ${activeKeys['d'] ? 'lit' : ''}`}>D</span>
              <span className={`hud-key space-key ${activeKeys[' '] || activeKeys['space'] ? 'lit' : ''}`}>
                SPACE
              </span>
            </div>
            <span className="hud-hint">Touch, click, or use physical keyboard</span>
          </div>

          {/* ── Right Side: Action Buttons ── */}
          <div className="action-buttons-cluster">
            <button
              className={`action-btn btn-action-b ${activeKeys['shift'] ? 'pressed' : ''}`}
              onMouseDown={() => handlePressStart('Shift', 'ShiftLeft', 16)}
              onMouseUp={() => handlePressEnd('Shift', 'ShiftLeft', 16)}
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('Shift', 'ShiftLeft', 16); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('Shift', 'ShiftLeft', 16); }}
              title="Action B / Shift"
            >
              B
              <span className="sub-key">SHIFT</span>
            </button>

            <button
              className={`action-btn btn-action-a ${activeKeys[' '] || activeKeys['space'] ? 'pressed' : ''}`}
              onMouseDown={() => handlePressStart(' ', 'Space', 32)}
              onMouseUp={() => handlePressEnd(' ', 'Space', 32)}
              onTouchStart={(e) => { e.preventDefault(); handlePressStart(' ', 'Space', 32); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(' ', 'Space', 32); }}
              title="Action A / Jump / Shoot (Space)"
            >
              A
              <span className="sub-key">SPACE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
