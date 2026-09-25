// client/src/components/UnifiedLabs.jsx
// Unified R&D Engineering Suite: Chaos & Self-Healing Sandbox + 8-Bit Retro SFX Audio Studio
// Combines runtime mutation fault injection, sensory recovery, and chiptune sound synthesis

import React, { useState } from 'react';
import SelfHealingLab from './SelfHealingLab';
import RetroSoundLab from './RetroSoundLab';

export default function UnifiedLabs({ onRemixPrompt, onNavigateToGenerator, initialTab = 'chaos', showTabs = true }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'chaos' | 'sfx'

  return (
    <div className="unified-labs-page max-w-6xl mx-auto w-full flex flex-col gap-6 pb-20 fade-in px-4">
      {/* ── Labs Suite Masthead ── */}
      <div className="labs-header-card bg-white border border-[#DCDDE4] rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#1C1E26]/5 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-[#1C1E26] text-white uppercase">
                Engineering Suite
              </span>
              <span className="text-xs font-mono text-[#8E92A2]">Sensory Watchdogs · Web Audio Synthesizer</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#1A1C23]">
              {activeTab === 'chaos' ? 'Self-Healing ' : 'Retro Sound '}<span className="text-[#D8125B]">Lab</span>
            </h1>
            <p className="text-xs md:text-sm text-[#505464] font-mono leading-relaxed">
              {activeTab === 'chaos'
                ? 'Stress-test the sensory self-healing loop with controlled runtime faults and verified repairs.'
                : 'Design custom 8-bit sound effects that can be injected into generated canvas games.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="btn btn-secondary btn-sm font-mono text-xs"
              onClick={onNavigateToGenerator}
            >
              ← Back to Studio
            </button>
          </div>
        </div>

        {/* ── Sub-Navigation Segmented Switcher ── */}
        {showTabs && <div className="mt-8 pt-6 border-t border-[#EAEBF0] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center bg-[#F1F2F6] p-1.5 rounded-xl border border-[#DCDDE4] shadow-inner">
            <button
              className={`px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2.5 ${
                activeTab === 'chaos'
                  ? 'bg-[#1C1E26] text-white shadow-md'
                  : 'text-[#62677A] hover:text-[#1A1C23]'
              }`}
              onClick={() => setActiveTab('chaos')}
            >
              <span className="text-base">🛠️</span>
              <div className="text-left">
                <div className="font-black leading-tight">Chaos & Self-Healing Sandbox</div>
                <div className="text-[10px] opacity-75 font-normal">Runtime Fault Injection & AST Patching</div>
              </div>
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                activeTab === 'chaos' ? 'bg-[#D8125B] text-white' : 'bg-[#DCDDE4] text-[#62677A]'
              }`}>
                WATCHDOG
              </span>
            </button>

            <button
              className={`px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2.5 ${
                activeTab === 'sfx'
                  ? 'bg-[#1C1E26] text-white shadow-md'
                  : 'text-[#62677A] hover:text-[#1A1C23]'
              }`}
              onClick={() => setActiveTab('sfx')}
            >
              <span className="text-base">🔊</span>
              <div className="text-left">
                <div className="font-black leading-tight">8-Bit Retro SFX Synthesizer</div>
                <div className="text-[10px] opacity-75 font-normal">Real-Time Web Audio Chiptune Studio</div>
              </div>
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                activeTab === 'sfx' ? 'bg-[#D8125B] text-white' : 'bg-[#DCDDE4] text-[#62677A]'
              }`}>
                CHIPTUNE
              </span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#8E92A2] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Sandboxes Online</span>
          </div>
        </div>}
      </div>

      {/* ── Active Lab Content ── */}
      <div className="active-lab-wrapper">
        {activeTab === 'chaos' && (
          <div className="fade-in">
            <SelfHealingLab
              onRemixPrompt={onRemixPrompt}
              onNavigateToGenerator={onNavigateToGenerator}
            />
          </div>
        )}

        {activeTab === 'sfx' && (
          <div className="fade-in">
            <RetroSoundLab
              onInjectPrompt={onRemixPrompt}
              onNavigateToGenerator={onNavigateToGenerator}
            />
          </div>
        )}
      </div>
    </div>
  );
}
