// client/src/components/ArtifactGallery.jsx
// Unified Art & Artifacts Atelier — Tiger Tear Reveal & Engraved Breathing Ticket
// High-fashion procedural art and physical-computing interactive showcase

import React, { useState } from 'react';
import TigerTearReveal from './ui/tiger-tear-reveal';
import EngravedTicket from './ui/engraved-ticket';

export default function ArtifactGallery({ onRemixPrompt, onNavigateToGenerator, initialTab = 'tiger', showTabs = true }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'both' | 'tiger' | 'ticket'
  const [ticketWord, setTicketWord] = useState('GENESIS');
  const [ticketVariant, setTicketVariant] = useState('paper');
  const [ticketBreathValue, setTicketBreathValue] = useState(0);

  const PRESET_WORDS = ['GENESIS', 'BREATHE', 'ARCHITECT', 'PLAYABLE', 'NVIDIA'];

  return (
    <div className="artifact-gallery-page max-w-6xl mx-auto w-full flex flex-col gap-8 pb-20 fade-in px-4">
      {/* ── Editorial Atelier Masthead ── */}
      <div className="atelier-header-card bg-white border border-[#DCDDE4] rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#D8125B]/10 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-[#D8125B]/10 text-[#D8125B] border border-[#D8125B]/25 uppercase">
                Interactive Exhibition
              </span>
              <span className="text-xs font-mono text-[#8E92A2]">Procedural Canvas · Motion Physics</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#1A1C23]">
              {activeTab === 'tiger' ? 'Tiger Tear ' : 'Engraved '}<span className="text-[#D8125B]">Exhibit</span>
            </h1>
            <p className="text-xs md:text-sm text-[#505464] font-mono leading-relaxed">
              {activeTab === 'tiger'
                ? 'Scroll through a motion-reactive poster with a responsive paper-tear reveal.'
                : 'Hold the engraved ticket to breathe, then shape its printed identity with a custom word and finish.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              className="btn btn-secondary btn-sm font-mono text-xs"
              onClick={onNavigateToGenerator}
            >
              ← Back to Studio
            </button>
            <button
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono text-xs shadow-md"
              onClick={() => onRemixPrompt?.(
                activeTab === 'tiger'
                  ? "A tiger jungle survival game where you scroll to dodge falling vines and collect sacred fire relics"
                  : "A rhythmic breathing pulse game where player clicks harmonize with an expanding and contracting engraved ticket, dodging ink spatters"
              )}
            >
              <span>⚡</span> Generate Game from Art
            </button>
          </div>
        </div>

        {/* ── Sub-Navigation Segmented Control ── */}
        {showTabs && <div className="mt-8 pt-6 border-t border-[#EAEBF0] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center bg-[#F1F2F6] p-1 rounded-xl border border-[#DCDDE4]">
            <button
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'both'
                  ? 'bg-[#1C1E26] text-white shadow-sm'
                  : 'text-[#62677A] hover:text-[#1A1C23]'
              }`}
              onClick={() => setActiveTab('both')}
            >
              <span>✨</span>
              <span>Complete Exhibition (Both)</span>
            </button>

            <button
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'tiger'
                  ? 'bg-[#D8125B] text-white shadow-sm'
                  : 'text-[#62677A] hover:text-[#1A1C23]'
              }`}
              onClick={() => setActiveTab('tiger')}
            >
              <span>🐅</span>
              <span>Tiger Tear Poster</span>
            </button>

            <button
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ticket'
                  ? 'bg-[#D8125B] text-white shadow-sm'
                  : 'text-[#62677A] hover:text-[#1A1C23]'
              }`}
              onClick={() => setActiveTab('ticket')}
            >
              <span>🎟️</span>
              <span>Engraved Breathing Ticket</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#8E92A2] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive 60FPS Physics Engine Ready</span>
          </div>
        </div>}
      </div>

      {/* ── EXHIBITION SECTION 1: TIGER TEAR REVEAL POSTER ── */}
      {(activeTab === 'both' || activeTab === 'tiger') && (
        <div className="tiger-exhibition-section flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐅</span>
              <h2 className="text-lg font-black uppercase text-[#1A1C23] tracking-wide">
                Artifact I: The Tiger Tear Reveal
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1C1E26] text-white">
                SCROLL-REACTIVE VEIL
              </span>
            </div>
            <button
              className="text-xs font-mono text-[#D8125B] hover:underline font-bold"
              onClick={() => onRemixPrompt?.("A stealth tiger jungle game where scrolling shifts between shadow disguise and attack prowl")}
            >
              ⚡ Remix into Tiger Game →
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border-2 border-[#2C2E39] shadow-xl bg-[#F7F7F9]">
            <div className="p-3 bg-[#1C1E26] text-xs font-mono text-[#A0A4B4] flex items-center justify-between border-b border-[#2C2E39]">
              <span>INTERACTIVE CANVAS: SCROLL ON POSTER TO RIP PAPER</span>
              <span className="text-[#D8125B] font-bold">EYES TRACK MOUSE CURSOR</span>
            </div>
            <TigerTearReveal
              word="GENESIS"
              tagline="HAVE NO FEAR · PROVE PLAYABILITY"
              ink="#D8125B"
              paper="#F7F7F9"
              taglineColor="#2C2E39"
              furColor="#d9832c"
              eyeColor="#f0a526"
              height="75svh"
              scrollDistance="110svh"
            />
          </div>
        </div>
      )}

      {/* ── EXHIBITION SECTION 2: ENGRAVED BREATHING TICKET ── */}
      {(activeTab === 'both' || activeTab === 'ticket') && (
        <div className="ticket-exhibition-section flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎟️</span>
              <h2 className="text-lg font-black uppercase text-[#1A1C23] tracking-wide">
                Artifact II: The Engraved Breathing Stub
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D8125B]/15 text-[#D8125B] border border-[#D8125B]/30">
                FLOW-FIELD INTAGLIO
              </span>
            </div>
            <button
              className="text-xs font-mono text-[#D8125B] hover:underline font-bold"
              onClick={() => onRemixPrompt?.("A ticket punching timing game where you stamp moving engraved passes to rhythm beat")}
            >
              ⚡ Remix into Ticket Game →
            </button>
          </div>

          {/* Ticket Customizer Bar */}
          <div className="ticket-controls-bar p-4 rounded-xl bg-[#1C1E26] text-white flex flex-wrap items-center justify-between gap-4 border border-[#2E3240] shadow-md">
            {/* Style Selector */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[#9EA3B0] mr-1">Print:</span>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  ticketVariant === 'paper'
                    ? 'bg-[#D8125B] text-white shadow-md'
                    : 'bg-[#282B36] text-[#C5C8D4] hover:bg-[#343744]'
                }`}
                onClick={() => setTicketVariant('paper')}
              >
                📄 Paper & Spatter
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  ticketVariant === 'crimson'
                    ? 'bg-[#D8125B] text-white shadow-md'
                    : 'bg-[#282B36] text-[#C5C8D4] hover:bg-[#343744]'
                }`}
                onClick={() => setTicketVariant('crimson')}
              >
                🔴 Crimson Ornament
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  ticketVariant === 'duo'
                    ? 'bg-[#D8125B] text-white shadow-md'
                    : 'bg-[#282B36] text-[#C5C8D4] hover:bg-[#343744]'
                }`}
                onClick={() => setTicketVariant('duo')}
              >
                ✨ Both Prints (Duo)
              </button>
            </div>

            {/* Preset Words */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-mono font-bold uppercase text-[#9EA3B0] mr-1">Word:</span>
              {PRESET_WORDS.map(w => (
                <button
                  key={w}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-bold transition-all ${
                    ticketWord === w
                      ? 'border border-[#D8125B] text-[#D8125B] bg-[#D8125B]/15'
                      : 'bg-[#282B36] text-[#8E92A2] hover:text-white'
                  }`}
                  onClick={() => setTicketWord(w)}
                >
                  {w}
                </button>
              ))}
              <input
                type="text"
                maxLength={12}
                value={ticketWord}
                onChange={(e) => setTicketWord(e.target.value.toUpperCase())}
                placeholder="CUSTOM..."
                className="px-2.5 py-1 rounded text-xs font-mono uppercase bg-[#282B36] text-white border border-[#3E4251] focus:border-[#D8125B] outline-none w-24"
              />
            </div>

            {/* Breath Gauge */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-mono text-[#9EA3B0] uppercase font-bold">Inhale:</span>
              <div className="w-24 h-2.5 bg-[#282B36] rounded-full overflow-hidden border border-[#3E4251]">
                <div
                  className="h-full bg-[#D8125B] transition-[width] duration-75"
                  style={{ width: `${Math.round(ticketBreathValue * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-white font-bold w-9 text-right">
                {Math.round(ticketBreathValue * 100)}%
              </span>
            </div>
          </div>

          {/* Ticket Canvas Render */}
          {ticketVariant === 'duo' ? (
            <div className="flex w-full flex-col items-center gap-10 bg-[#0b0a0a] px-4 py-16 sm:px-10 rounded-2xl border-2 border-[#2C2E39] shadow-2xl">
              <EngravedTicket
                word={ticketWord}
                variant="paper"
                onBreath={setTicketBreathValue}
                quote="AUTONOMOUS PROVE PLAYABILITY"
              />
              <EngravedTicket
                word={ticketWord}
                variant="crimson"
                quote="NVIDIA NIM · DEEPSEEK VS KIMI"
              />
              <p className="text-center text-xs uppercase tracking-[0.3em] text-neutral-400 font-mono">
                Hold a ticket to breathe in &middot; let go to breathe out &middot; tap to re-spray ink
              </p>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center justify-center p-8 sm:p-14 bg-[#0b0a0a] rounded-2xl border-2 border-[#2C2E39] shadow-2xl min-h-[460px]">
              <EngravedTicket
                word={ticketWord}
                variant={ticketVariant}
                onBreath={setTicketBreathValue}
                quote={ticketVariant === 'paper' ? 'HOLD TO INHALE · LET GO TO EXHALE' : 'MIRRORED ROSETTE & INTAGLIO ENGRAVED'}
              />
              <div className="mt-8 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 font-mono">
                  Hold pointer to inhale &middot; Release to exhale &middot; Tap to re-spatter ink
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
