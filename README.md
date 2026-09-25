# BHS Genesis Hackathon — Autonomous AI Game Architect
> **Autonomous Closed-Loop Game Engineering & Self-Healing Engine**  
> *Describe any game in natural language. Watch a multi-model AI pipeline specify, generate, playtest in a headless browser, self-heal runtime bugs, and deliver a verified playable HTML5 canvas game in seconds.*

---

## 🌟 Overview

**Autonomous AI Game Architect** is a full-stack platform built for the **BHS Genesis Hackathon**. It shifts game creation from manual coding to natural language direction. By orchestrating top-tier open models on Groq with Playwright browser telemetry, the system writes game code, mounts it into a headless browser, autonomously stress-tests mechanics, detects errors, and self-heals failing assertions before presenting the final game.

---

## ⚡ Key Highlights & Features

### 1. Natural Language Prompt-to-Game Engine
- Describe any 2D arcade, physics, or action game in plain English.
- The pipeline synthesizes complete, self-contained HTML5 Canvas games with custom collision physics, sprite animations, scoreboards, and audio synthesis.

### 2. Groq High-Speed Dual-Model Core
- **`openai/gpt-oss-120b` (Primary / Heavy Reasoning)**: 120B parameter model orchestrating structured game specifications, intricate collision algorithms, and particle dynamics.
- **`openai/gpt-oss-20b` (High-Speed / Surgical Patching)**: Sub-second inference engine generating rapid code iterations and self-healing error repairs.
- **Enterprise Multi-Cloud Failover**: Automatic fallback routing to **Google Gemini** (`gemini-3.8-flash`) and **NVIDIA NIM** ensuring 100% uptime without rate-limit stalls.

### 3. AI vs AI Arena (Live Head-to-Head Race)
- Pit two state-of-the-art models against each other in real time with the same prompt.
- Dual-pane live compilation shows code generation speeds, token metrics, and side-by-side playable previews.

### 4. 6-Stage Autonomous Self-Healing Pipeline
```
[User Prompt]
      │
      ▼
┌──────────────┐      ┌─────────────────┐      ┌──────────────────┐
│ 1. Spec Gen  │ ───► │ 2. Code Synthes │ ───► │ 3. Sensory Loop  │
└──────────────┘      └─────────────────┘      └──────────────────┘
                                                        │
┌──────────────┐      ┌─────────────────┐               ▼
│ 6. Verified  │ ◄─── │ 5. Self-Healing │ ◄─── ┌──────────────────┐
│  Playable    │      │  (Auto Patch)   │      │ 4. Playtest Bot  │
└──────────────┘      └─────────────────┘      └──────────────────┘
```
1. **Spec Generation**: Extracts mechanics, entity definitions, win/loss rules, physics constants, and input mappings into a strict schema.
2. **Code Synthesis**: Generates clean, zero-dependency HTML5 Canvas code exposing the standardized `window.__gameState` telemetry bridge.
3. **Sensory Loop**: Playwright mounts the game in headless Chromium, intercepts runtime JS errors, monitors frame-rates, and inspects canvas pixel renders.
4. **Playtest Bot**: Simulates programmatic user controls (arrow keys, WASD, spacebar), verifies boundary constraints, and asserts that scores increment properly.
5. **Self-Healing Loop**: If assertions fail or errors are caught, the diagnostic package is sent to the LLM to generate targeted surgical patches and re-test.
6. **Verified Playable Delivery**: Emits an interactive playable iframe, downloadable zip/HTML, and mobile virtual controller.

### 5. High-End Editorial Interface & Unified Labs
- **Editorial Aesthetic**: Typography pairing featuring Bodoni Moda, Cinzel, and Barlow Condensed.
- **Unified Labs**: Streamlined navigation uniting the Autonomous Studio, AI Arena, Diagnostics Lab, and Game Showcase into a cohesive experience.
- **Interactive UI Assets**: Engraved tickets, tear-reveal effects, and retro tactile controls.

---

## 📁 Repository Structure

```
├── client/                     # Frontend Application (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/         # Studio, AI Arena, UnifiedLabs, VirtualController
│   │   ├── components/ui/      # Engraved tickets, tear reveals, glass cards
│   │   ├── styles/             # Editorial design tokens & animations
│   │   └── App.jsx             # Main interactive application root
│   ├── package.json
│   └── vite.config.js          # Port 5188 with backend API proxy
│
├── server/                     # Backend Pipeline & AI Engine (Node.js + Express)
│   ├── routes/                 # Pipeline, Battle Arena, Games, and Auth endpoints
│   ├── services/
│   │   ├── groq.js             # High-speed Groq LLM integration
│   │   ├── gemini.js           # Google Gemini API integration & failover
│   │   ├── pipeline.js         # 6-Stage Autonomous Game Generator
│   │   ├── arena.js            # Dual-model competitive battle engine
│   │   └── playwright-runner.js# Headless browser playtesting & sensory loop
│   ├── utils/                  # Watchdog timeouts, SSE loggers, AST patcher
│   └── index.js                # Express server entry point (Port 3001)
│
├── hackathon-portal/           # Static Genesis Hackathon event portal & directives
├── package.json                # Root orchestration scripts
└── README.md                   # Project documentation
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- A **Groq API Key** (Free tier available at [groq.com](https://groq.com)) or **Gemini API Key**

### 1. Clone the Repository
```bash
git clone https://github.com/aaravgupta-dotcom/bhs-genesis-hackathon.git
cd bhs-genesis-hackathon
```

### 2. Configure Environment Variables
Copy the example environment configuration into `server/.env`:
```bash
cp server/.env.example server/.env
```
Edit `server/.env` with your API credentials:
```env
PORT=3001
GROQ_API_KEY=your_groq_api_key_here
PRIMARY_MODEL=openai/gpt-oss-120b
ARENA_MODEL_A=openai/gpt-oss-120b
ARENA_MODEL_B=openai/gpt-oss-20b

# Optional fallbacks:
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies
```bash
# Install backend dependencies & Playwright browsers
cd server
npm install
npx playwright install chromium

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### 4. Launch Development Servers
Run the full application using root scripts:
```bash
# In Terminal 1 — Start the Backend Server (Port 3001)
npm run server

# In Terminal 2 — Start the Frontend UI (Port 5188)
npm run client
```

Navigate to **`http://localhost:5188`** in your browser to experience the Game Architect Studio.

---

## 🧪 Verification & Automated Testing

You can run automated test suites to verify synthetic error healing and Playwright sensory diagnostics:
```bash
cd server
npm run test:synthetic
```

---

## 🛠️ Tech Stack

- **AI & Reasoning**: Groq LPU Cloud (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`), Google Gemini API (`gemini-3.8-flash`), NVIDIA NIM
- **Playtesting & Diagnostics**: Microsoft Playwright (Headless Chromium), Canvas Pixel Sampling, Telemetry Bridge
- **Backend**: Node.js, Express, Server-Sent Events (SSE), SQLite (sql.js)
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, GSAP
- **Typography & Styling**: Bodoni Moda, Barlow Condensed, JetBrains Mono, Inter

---

## 🏆 Genesis Hackathon Submission
Built with pride for the **BHS Genesis Hackathon**.
