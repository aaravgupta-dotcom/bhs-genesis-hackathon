// client/src/components/EditorialSpread.jsx
// High-End Print Magazine Editorial Spread (Vogue, Cosmopolitan, GQ, Esquire & Harper's Bazaar Inspired)
// Contrasting typography, multilayer editorial composition, bold visual hierarchy, and fine decorative lines

import React, { useState } from 'react';
import EngravedTicket from '@/components/ui/engraved-ticket';
import TigerTearReveal from '@/components/ui/tiger-tear-reveal';
import './EditorialSpread.css';

const LOOKBOOK_PROMPTS = [
  {
    number: 'N° 01',
    title: 'Velvet Nebula 1984',
    genre: 'NOIR SPACE CHRONICLES',
    desc: 'A high-speed monochromatic space survival where neon fuchsia particles illuminate drifting asteroids.',
    prompt: 'A noir monochrome space survival game where neon fuchsia asteroids shatter into cosmic dust and player maneuvers an agile diamond interceptor'
  },
  {
    number: 'N° 02',
    title: 'The Baroque Labyrinth',
    genre: 'ISOMETRIC DUNGEON HAUTE',
    desc: 'Intricate golden corridors with shifting traps, mechanical guardians, and collectible celestial orbs.',
    prompt: 'A baroque labyrinth puzzle game with ornate architectural traps, moving marble obstacles, and golden key collection'
  },
  {
    number: 'N° 03',
    title: 'Silk & Cyber Katana',
    genre: 'AVANT-GARDE ARCADE',
    desc: 'A hyper-responsive reflex slasher slicing through waves of digital silk ribbons and projectile shurikens.',
    prompt: 'An avant-garde arcade slasher where a cyber blade slices incoming projectiles with combo multipliers and particle blooms'
  },
];

export default function EditorialSpread({ onNavigate, onRemixPrompt }) {
  const [stockTheme, setStockTheme] = useState('ivory'); // 'ivory' | 'carbon'
  const [ticketWord, setTicketWord] = useState('VOGUE');

  const handleLaunchPrompt = (promptText) => {
    onRemixPrompt?.(promptText);
    onNavigate?.('generator');
  };

  return (
    <div className={`editorial-magazine-container ${stockTheme === 'carbon' ? 'theme-carbon' : 'theme-ivory'} fade-in`}>
      {/* ── Top Running Folio / Dateline ── */}
      <div className="editorial-running-folio font-mono">
        <div className="folio-left">
          <span>GAME ARCHITECT EDITION</span>
          <span className="divider">·</span>
          <span>ISSUE N° 07</span>
          <span className="divider">·</span>
          <span>AUTUMN / WINTER 2026</span>
        </div>
        <div className="folio-center">
          <span>PARIS · MILAN · NEW YORK · TOKYO · LONDON</span>
        </div>
        <div className="folio-right">
          <div className="theme-toggle-group">
            <span className="toggle-label">PAPER STOCK:</span>
            <button
              className={`stock-btn ${stockTheme === 'ivory' ? 'active' : ''}`}
              onClick={() => setStockTheme('ivory')}
            >
              COTTON IVORY
            </button>
            <button
              className={`stock-btn ${stockTheme === 'carbon' ? 'active' : ''}`}
              onClick={() => setStockTheme('carbon')}
            >
              OBSIDIAN MATTE
            </button>
          </div>
        </div>
      </div>

      {/* ── Masthead Section ── */}
      <header className="editorial-masthead">
        <div className="masthead-eyebrow">
          <span className="eyebrow-rule"></span>
          <span className="eyebrow-text">INTERNATIONAL JOURNAL OF AUTONOMOUS COMPUTATIONAL BEAUTY</span>
          <span className="eyebrow-rule"></span>
        </div>

        <h1 className="masthead-title">GENESIS</h1>

        <div className="masthead-tagline-bar">
          <span className="tagline-edition">VOL. XXIV · SPECIAL EDITION</span>
          <span className="tagline-headline">WHERE ARTIFICIAL MINDS ARCHITECT PLAYABLE REALITIES</span>
          <span className="tagline-price">USD $18.00 / GBP £14.50</span>
        </div>
      </header>

      {/* ── Double-Rule Accent ── */}
      <div className="double-rule"></div>

      {/* ── Magazine Cover Story & Lead Spread ── */}
      <section className="editorial-cover-story">
        <div className="cover-grid">
          {/* Main Visual Column */}
          <div className="cover-hero-visual">
            <div className="visual-frame">
              <div className="visual-overlay-content">
                <span className="cover-kicker">COVER EXCLUSIVE · FEATURE INVESTIGATION</span>
                <h2 className="cover-display-headline">
                  THE GHOST IN<br />
                  <em>The Canvas</em>
                </h2>
                <p className="cover-display-sub">
                  How a dual-model sensory watchdog created the first autonomous closed-loop game engine that writes, stress-tests, and heals its own code at sixty frames per second.
                </p>
                <div className="cover-cta-row">
                  <button
                    className="editorial-cta-primary"
                    onClick={() => onNavigate?.('generator')}
                  >
                    <span>⚡ ENTER THE GENERATOR</span>
                  </button>
                  <button
                    className="editorial-cta-outline"
                    onClick={() => onNavigate?.('arena')}
                  >
                    <span>⚔️ WITNESS THE ARENA DUEL</span>
                  </button>
                </div>
              </div>

              {/* Decorative Frame Elements */}
              <div className="frame-corner top-left"></div>
              <div className="frame-corner top-right"></div>
              <div className="frame-corner bottom-left"></div>
              <div className="frame-corner bottom-right"></div>
            </div>

            <div className="photo-credit font-mono">
              <span>PLATE 01 · CHROMIUM HEADLESS 1080P · SENSORY RADAR ACTIVE · NVIDIA TENSORRT-LLM</span>
            </div>
          </div>

          {/* Editorial Column / Article Lead */}
          <div className="cover-article-column">
            <div className="column-header">
              <span className="kicker-tag font-mono">ESSAY · BY THE CURATOR</span>
              <h3 className="column-title">The Death of the Static Generator</h3>
            </div>

            <div className="editorial-text-body">
              <p className="lead-paragraph">
                <span className="drop-cap">I</span>n the golden age of classical software development, human hands measured every coordinate, tuned every collision box, and nursed every physics loop through hundreds of manual rebuilds. Today, we stand before something radically different: an autonomous architect that refuses to release code until it has proved its own playability.
              </p>
              <p>
                The philosophy of <em>Game Architect</em> is not one of polite completion. It is one of rigorous sensory verification. Every candidate build is forced into an automated gauntlet: 120 frames of headless evaluation, mathematical checks for NaN propagation in player coordinates, and real-time canvas pixel delta sweeps.
              </p>

              {/* Pull Quote Box */}
              <blockquote className="editorial-pull-quote">
                <span className="quote-mark">“</span>
                <p>
                  We do not ask the machine to hope its code works. We demand mathematical proof of play before the canvas ever touches human eyes.
                </p>
                <cite className="quote-cite font-mono">— AUTONOMOUS SENSORY PROTOCOL § 4.1</cite>
              </blockquote>

              <p>
                When a bug breaks the universe—an undefined coordinate, a stalled render loop, an inverted win condition—the self-healing loop intervenes. It does not re-roll the dice. It parses the AST, calculates the unified diff, and surgically hot-patches the flaw.
              </p>
            </div>

            <div className="article-signature font-mono">
              <span>PROOF OF PLAYABILITY · VERIFIED BUILD #1</span>
              <span className="seal-glyph">✦ ✦ ✦</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Double-Rule Separator ── */}
      <div className="double-rule"></div>

      {/* ── Section: The Duel of Titans (Esquire / GQ Style Profile) ── */}
      <section className="editorial-section arena-profile-section">
        <div className="section-header-editorial">
          <span className="section-number font-mono">FEATURE 02 · HIGH-STAKES BENCHMARK</span>
          <h2 className="section-heading-serif">The Machine Versus The Machine</h2>
          <p className="section-sub-editorial">
            DeepSeek-V3 and Kimi-K2 battle in parallel across NVIDIA NIM. Two minds. One prompt. Independent self-healing pipelines.
          </p>
        </div>

        <div className="duel-profile-spread">
          {/* Challenger 1: DeepSeek */}
          <div className="challenger-profile-card">
            <div className="profile-badge-bar">
              <span className="model-chip font-mono">DEEPSEEK-V3.1</span>
              <span className="badge-haute">HOPPER H100</span>
            </div>
            <h3 className="challenger-name">The Analytical Maestro</h3>
            <p className="challenger-bio">
              Engineered with specialized mixture-of-experts logic, DeepSeek deconstructs prompts into mathematical vector arrays, favoring particle fidelity, tight state machines, and micro-second collision precision.
            </p>
            <div className="stat-editorial-row font-mono">
              <div className="stat-block">
                <span className="stat-k">INFERENCE</span>
                <span className="stat-v">48.2 tok/s</span>
              </div>
              <div className="stat-block">
                <span className="stat-k">ACCURACY</span>
                <span className="stat-v">99.1%</span>
              </div>
              <div className="stat-block">
                <span className="stat-k">MEDIAN HEAL</span>
                <span className="stat-v highlight-fuchsia">1.1 CYCLES</span>
              </div>
            </div>
          </div>

          {/* Center VS Monogram */}
          <div className="duel-monogram-column">
            <span className="vs-monogram">VS</span>
            <span className="duel-rule-vertical"></span>
            <button
              className="btn-editorial-duel"
              onClick={() => onNavigate?.('arena')}
            >
              LAUNCH BATTLE
            </button>
          </div>

          {/* Challenger 2: Kimi */}
          <div className="challenger-profile-card">
            <div className="profile-badge-bar">
              <span className="model-chip font-mono">KIMI-K2-INSTRUCT</span>
              <span className="badge-haute">TENSORRT-LLM</span>
            </div>
            <h3 className="challenger-name">The Kinetic Virtuoso</h3>
            <p className="challenger-bio">
              Renowned for expansive contextual comprehension, Kimi constructs lavish visual aesthetics, smooth momentum physics, and nuanced audio-visual feedback loops that mimic traditional hand-crafted arcade cabinets.
            </p>
            <div className="stat-editorial-row font-mono">
              <div className="stat-block">
                <span className="stat-k">INFERENCE</span>
                <span className="stat-v">52.6 tok/s</span>
              </div>
              <div className="stat-block">
                <span className="stat-k">ACCURACY</span>
                <span className="stat-v">98.8%</span>
              </div>
              <div className="stat-block">
                <span className="stat-k">MEDIAN HEAL</span>
                <span className="stat-v highlight-fuchsia">1.3 CYCLES</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Double-Rule Separator ── */}
      <div className="double-rule"></div>

      {/* ── Section: The Physical Exhibition (Vogue / Gallery Spread) ── */}
      <section className="editorial-section gallery-spread-section">
        <div className="section-header-editorial">
          <span className="section-number font-mono">EXHIBITION · THE INTERACTIVE ARTEFACTS</span>
          <h2 className="section-heading-serif">Intaglio, Ink & Ripped Canvas</h2>
          <p className="section-sub-editorial">
            Two bespoke tactile controls crafted exclusively for this edition. Hold to inhale; rip to reveal.
          </p>
        </div>

        <div className="gallery-dual-grid">
          {/* Artefact 1: Engraved Ticket */}
          <div className="editorial-artefact-card">
            <div className="artefact-header">
              <div className="artefact-meta font-mono">
                <span>ARTEFACT NO. 01</span>
                <span>FLOW-FIELD PROCEDURAL PRINT</span>
              </div>
              <h3 className="artefact-title">The Breathing Ticket</h3>
              <p className="artefact-desc">
                An intaglio engraving traced from vector flow fields with mirrored rosette ornament plates and randomized spatter ink.
              </p>
            </div>

            {/* Interactive Ticket Widget */}
            <div className="artefact-stage bg-[#0b0a0a] rounded-xl p-6 flex flex-col items-center">
              <EngravedTicket
                word={ticketWord}
                variant={stockTheme === 'carbon' ? 'crimson' : 'paper'}
                quote="HAUTE COUTURE · AUTONOMOUS ISSUE"
              />
              <div className="ticket-word-selector mt-4 flex items-center gap-2">
                <span className="font-mono text-xs text-neutral-400">WORDPLATE:</span>
                {['VOGUE', 'COSMO', 'GENESIS', 'PARIS'].map(w => (
                  <button
                    key={w}
                    className={`editorial-mini-chip ${ticketWord === w ? 'active' : ''}`}
                    onClick={() => setTicketWord(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="artefact-caption font-mono">
              <span>HOLD POINTER TO INHALE · RELEASE TO EXHALE · TAP TO RE-SPRAY INK</span>
              <button
                className="artefact-link-btn"
                onClick={() => onNavigate?.('ticket')}
              >
                OPEN FULL CONTROLS ↗
              </button>
            </div>
          </div>

          {/* Artefact 2: Tiger Tear Reveal */}
          <div className="editorial-artefact-card">
            <div className="artefact-header">
              <div className="artefact-meta font-mono">
                <span>ARTEFACT NO. 02</span>
                <span>INTERACTIVE POSTER TEAR</span>
              </div>
              <h3 className="artefact-title">The Tiger Tear Reveal</h3>
              <p className="artefact-desc">
                A high-contrast slogan poster that splits along a dynamic fracture line as you scroll, revealing the watchful eyes of a jungle beast.
              </p>
            </div>

            <div className="artefact-stage bg-[#F7F7F9] rounded-xl overflow-hidden border border-[#DCDDE4]">
              <TigerTearReveal
                word="COSMO"
                tagline="FEARLESS · PROVE PLAYABILITY"
                ink="#D8125B"
                paper="#F7F7F9"
                taglineColor="#2C2E39"
                height="340px"
                scrollDistance="600px"
              />
            </div>

            <div className="artefact-caption font-mono">
              <span>SCROLL INSIDE POSTER TO TEAR SHEET · POINTER TRACKING REYES</span>
              <button
                className="artefact-link-btn"
                onClick={() => onNavigate?.('reveal')}
              >
                EXPAND POSTER VIEW ↗
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Double-Rule Separator ── */}
      <div className="double-rule"></div>

      {/* ── Section: The Curated Autumn Lookbook (Cosmopolitan Style) ── */}
      <section className="editorial-section lookbook-section">
        <div className="section-header-editorial">
          <span className="section-number font-mono">COLLECTION · PROMPT LOOKBOOK</span>
          <h2 className="section-heading-serif">The Autumn Curated Arcade</h2>
          <p className="section-sub-editorial">
            Three haute couture gaming concepts ready for immediate autonomous synthesis. Click to load and generate.
          </p>
        </div>

        <div className="lookbook-grid">
          {LOOKBOOK_PROMPTS.map((item, idx) => (
            <div key={idx} className="lookbook-card">
              <div className="lookbook-card-top font-mono">
                <span className="lookbook-num">{item.number}</span>
                <span className="lookbook-genre">{item.genre}</span>
              </div>
              <h3 className="lookbook-title">{item.title}</h3>
              <p className="lookbook-desc">{item.desc}</p>
              <div className="lookbook-action">
                <button
                  className="editorial-btn-launch"
                  onClick={() => handleLaunchPrompt(item.prompt)}
                >
                  ⚡ SYNTHESIZE THIS GAME
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Editorial Footer & Colophon ── */}
      <footer className="editorial-footer">
        <div className="footer-top-rule"></div>
        <div className="colophon-grid font-mono">
          <div className="colophon-col">
            <span className="colophon-head">THE EDITORIAL BOARD</span>
            <p>Game Architect Quarterly is published synchronously by DeepSeek-V3 and Kimi-K2 via NVIDIA NIM.</p>
          </div>
          <div className="colophon-col">
            <span className="colophon-head">TYPOGRAPHY</span>
            <p>Set in Bodoni Moda, Playfair Display, Cormorant Garamond, and JetBrains Mono. Printed on digital rag paper.</p>
          </div>
          <div className="colophon-col">
            <span className="colophon-head">VERIFICATION SEAL</span>
            <p>100% Playable Guarantee. Verified through Playwright headless browser sensory traps before release.</p>
          </div>
          <div className="colophon-col barcode-col">
            <div className="editorial-barcode">
              ||||| | |||| ||| |||||| | ||||| |||||
            </div>
            <span className="barcode-number">ISBN 978-0-262-13472-8</span>
          </div>
        </div>
        <div className="footer-copyright">
          <span>© 2026 GAME ARCHITECT · ALL WORLDS AUTONOMOUSLY CREATED · ISSUE N° 07</span>
        </div>
      </footer>
    </div>
  );
}
