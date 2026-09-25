// client/src/components/RetroSoundLab.jsx
// Built-in Web Audio API 8-Bit Retro Chiptune Sound Synthesizer & Sound FX Generator
// Real-time audio waveform visualizer, preset sound effects, and game code export

import React, { useState, useRef, useEffect } from 'react';
import './RetroSoundLab.css';

const SOUND_PRESETS = [
  {
    id: 'laser',
    name: 'Laser Blaster',
    icon: '⚡',
    type: 'sawtooth',
    startFreq: 880,
    endFreq: 110,
    duration: 0.15,
    description: 'High-speed downward pitch sweep for player laser guns and sci-fi blasters'
  },
  {
    id: 'jump',
    name: 'Player Jump',
    icon: '🦘',
    type: 'square',
    startFreq: 150,
    endFreq: 600,
    duration: 0.18,
    description: 'Upward ramp for platformer jumps, bounce pads, and springboards'
  },
  {
    id: 'coin',
    name: 'Coin Pickup',
    icon: '🪙',
    type: 'sine',
    startFreq: 987,
    endFreq: 1318,
    duration: 0.22,
    description: 'Bright dual-harmonic chime for gold coins, stars, and scoring items'
  },
  {
    id: 'powerup',
    name: 'Power-Up Arp',
    icon: '🍄',
    type: 'triangle',
    startFreq: 260,
    endFreq: 1046,
    duration: 0.35,
    description: 'Energetic rising triad for shield upgrades, speed boosts, and extra lives'
  },
  {
    id: 'hit',
    name: 'Enemy Hit',
    icon: '💥',
    type: 'sawtooth',
    startFreq: 220,
    endFreq: 65,
    duration: 0.12,
    description: 'Punchy low-frequency snap for bullet impacts and damaged targets'
  },
  {
    id: 'explosion',
    name: 'Big Explosion',
    icon: '💣',
    type: 'noise',
    startFreq: 300,
    endFreq: 40,
    duration: 0.5,
    description: 'Synthesized noise blast with sub-bass rumble for boss kills and crashes'
  },
  {
    id: 'gameover',
    name: 'Game Over',
    icon: '💀',
    type: 'sawtooth',
    startFreq: 330,
    endFreq: 90,
    duration: 0.7,
    description: 'Dour descending minor cadence when lives drop to zero'
  },
  {
    id: 'victory',
    name: 'Level Cleared',
    icon: '🏆',
    type: 'square',
    startFreq: 440,
    endFreq: 880,
    duration: 0.55,
    description: 'Heroic chiptune fanfare when winning a stage or achieving high score'
  },
];

export default function RetroSoundLab({ onInjectPrompt, onNavigateToGenerator }) {
  const [selectedPreset, setSelectedPreset] = useState(SOUND_PRESETS[0]);
  const [waveType, setWaveType] = useState('sawtooth');
  const [startFreq, setStartFreq] = useState(880);
  const [endFreq, setEndFreq] = useState(110);
  const [duration, setDuration] = useState(0.15);
  const [volume, setVolume] = useState(0.4);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Initialize Web Audio Context
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Draw oscilloscope waveform
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#14151C';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#232530';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform line
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#D8125B';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#D8125B';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    render();
  };

  useEffect(() => {
    drawWaveform();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Play Sound with Web Audio API
  const playSound = (config = null) => {
    const ctx = getAudioContext();
    const type = config?.type || waveType;
    const sFreq = config?.startFreq || startFreq;
    const eFreq = config?.endFreq || endFreq;
    const dur = config?.duration || duration;
    const vol = volume;

    setIsPlaying(true);
    const now = ctx.currentTime;

    if (type === 'noise') {
      // Synthesize noise buffer
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Low-pass filter sweep
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(sFreq, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, eFreq), now + dur);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + dur);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(sFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, eFreq), now + dur);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur);
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, dur * 1000 + 50);
  };

  const handleSelectPreset = (p) => {
    setSelectedPreset(p);
    setWaveType(p.type);
    setStartFreq(p.startFreq);
    setEndFreq(p.endFreq);
    setDuration(p.duration);
    playSound(p);
  };

  const generatedCode = `// 8-Bit Web Audio Synthesizer: ${selectedPreset.name}
function playSfx_${selectedPreset.id}() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
${waveType === 'noise' ? `  const buffer = ctx.createBuffer(1, ctx.sampleRate * ${duration}, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.frequency.setValueAtTime(${startFreq}, now);
  filter.frequency.exponentialRampToValueAtTime(${endFreq}, now + ${duration});
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(${volume}, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + ${duration});
  noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  noise.start(now); noise.stop(now + ${duration});` : `  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = '${waveType}';
  osc.frequency.setValueAtTime(${startFreq}, now);
  osc.frequency.exponentialRampToValueAtTime(${endFreq}, now + ${duration});
  gain.gain.setValueAtTime(${volume}, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + ${duration});
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + ${duration});`}
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInject = () => {
    const sfxPrompt = `A 2D arcade game featuring real-time synthesized 8-bit sound effects (${selectedPreset.name} on action, hit, and score) with retro responsive visuals and tight collision detection`;
    onInjectPrompt?.(sfxPrompt);
    onNavigateToGenerator?.();
  };

  return (
    <div className="retro-sound-lab fade-in">
      {/* ── Header ── */}
      <div className="sfx-header-card">
        <div className="sfx-title-block">
          <div className="sfx-badge">
            <span>🔊 WEB AUDIO ENGINE</span>
          </div>
          <h2>8-Bit Retro Chiptune SFX Studio</h2>
          <p className="sfx-subtitle">
            Zero-asset synthesized sound effects for playable browser games. Tweak frequencies, test in real time, and export vanilla JS code directly.
          </p>
        </div>

        <div className="sfx-header-actions">
          <button className="btn btn-primary" onClick={handleInject}>
            <span>⚡ Generate Game with this SFX</span>
          </button>
        </div>
      </div>

      <div className="sfx-studio-grid">
        {/* ── Left Column: Presets List ── */}
        <div className="sfx-card sfx-presets-card">
          <h3 className="sfx-card-title">Sound Presets</h3>
          <div className="presets-list">
            {SOUND_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-btn ${selectedPreset.id === p.id ? 'active' : ''}`}
                onClick={() => handleSelectPreset(p)}
              >
                <span className="preset-icon">{p.icon}</span>
                <div className="preset-text">
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-meta font-mono">{p.type} · {p.startFreq}Hz → {p.endFreq}Hz</span>
                </div>
                <span className="preset-play-hint">▶</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Middle Column: Oscilloscope & Live Synth ── */}
        <div className="sfx-card sfx-synth-card">
          <div className="synth-visualizer-header">
            <span className="sfx-card-title">Oscilloscope Visualizer</span>
            <div className="visualizer-status font-mono">
              <span className={`status-dot ${isPlaying ? 'active' : ''}`}></span>
              {isPlaying ? 'ACTIVE AUDIO OUTPUT' : 'STANDBY (44.1kHz)'}
            </div>
          </div>

          <div className="oscilloscope-wrapper">
            <canvas
              ref={canvasRef}
              width={560}
              height={140}
              className="oscilloscope-canvas"
            />
            <div className="oscilloscope-hud font-mono">
              <span>WAVE: {waveType.toUpperCase()}</span>
              <span>SWEEP: {startFreq}Hz → {endFreq}Hz</span>
              <span>DUR: {duration}s</span>
            </div>
          </div>

          <div className="synth-playback-bar">
            <button
              className="btn btn-primary btn-lg synth-play-btn"
              onClick={() => playSound()}
            >
              <span>▶ Play Sound ({selectedPreset.name})</span>
            </button>
          </div>

          {/* Synth Sliders */}
          <div className="synth-controls-grid">
            <div className="ctrl-item">
              <label>Waveform</label>
              <div className="wave-selector">
                {['sawtooth', 'square', 'triangle', 'sine', 'noise'].map((w) => (
                  <button
                    key={w}
                    className={`wave-btn ${waveType === w ? 'active' : ''}`}
                    onClick={() => { setWaveType(w); playSound({ type: w }); }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="ctrl-item">
              <div className="ctrl-label-row">
                <label>Start Frequency</label>
                <span className="ctrl-val font-mono">{startFreq} Hz</span>
              </div>
              <input
                type="range"
                min="40"
                max="2000"
                step="10"
                value={startFreq}
                onChange={(e) => setStartFreq(Number(e.target.value))}
                onMouseUp={() => playSound()}
              />
            </div>

            <div className="ctrl-item">
              <div className="ctrl-label-row">
                <label>End Frequency</label>
                <span className="ctrl-val font-mono">{endFreq} Hz</span>
              </div>
              <input
                type="range"
                min="20"
                max="2000"
                step="10"
                value={endFreq}
                onChange={(e) => setEndFreq(Number(e.target.value))}
                onMouseUp={() => playSound()}
              />
            </div>

            <div className="ctrl-item">
              <div className="ctrl-label-row">
                <label>Duration</label>
                <span className="ctrl-val font-mono">{duration}s</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                onMouseUp={() => playSound()}
              />
            </div>

            <div className="ctrl-item">
              <div className="ctrl-label-row">
                <label>Volume</label>
                <span className="ctrl-val font-mono">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* ── Right Column: Code Export ── */}
        <div className="sfx-card sfx-code-card">
          <div className="code-card-header">
            <h3 className="sfx-card-title">Generated Audio Function</h3>
            <button
              className={`btn btn-secondary btn-sm copy-btn ${copiedCode ? 'copied' : ''}`}
              onClick={handleCopyCode}
            >
              {copiedCode ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </div>

          <pre className="code-snippet font-mono">
            <code>{generatedCode}</code>
          </pre>

          <div className="code-tips">
            <span className="tip-badge">TIP</span>
            <p>
              Drop this self-contained Web Audio function into any HTML5 Canvas game loop without loading external MP3/WAV files.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
