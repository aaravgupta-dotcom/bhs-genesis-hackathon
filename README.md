# Game Architect — Autonomous AI Game Generation Engine

> Describe a game in plain English. Watch an AI write, test, break, and fix it — in real time.

A full-stack web application that autonomously writes, tests, and self-heals playable 2D browser games from a single natural-language prompt, proving playability through automated Playwright testing before showing a success state.

## Architecture

```
client/           React + Vite frontend (port 5173)
server/           Node.js + Express backend (port 3001)
  services/
    llm.js           NVIDIA NIM (OpenAI-compatible) LLM client
    pipeline.js      6-stage orchestrator
    playwright-runner.js  Headless browser test harness
  utils/
    logger.js        SSE event broadcaster
    patch.js         Code patch applicator
  routes/
    pipeline.js      REST + SSE endpoints
  games/           Generated game HTML files (gitignored)
  screenshots/     Test screenshot evidence (gitignored)
```

## The 6-Stage Pipeline

| Stage | Name | Description |
|-------|------|-------------|
| 1 | **Spec Parse** | Parse prompt → structured JSON spec (mechanics, entities, win/loss, controls) |
| 2 | **Code Generation** | Generate self-contained HTML5 Canvas + vanilla JS game |
| 3 | **Sensory Loop** | Headless Playwright: console capture, canvas pixel sampling, frame timing |
| 4 | **Playtest Bot** | Simulate keyboard input, test boundary clamping, score tracking |
| 5 | **Self-Healing** | Package failure → targeted patch → re-verify (max 5 cycles) |
| 6 | **Verified Playable** | All assertions pass → deliver embedded + downloadable game |

## Setup

### Prerequisites
- Node.js 18+
- An NVIDIA NIM API key (for LLM access)

### 1. Clone & configure
```bash
git clone <repo>
cd <repo>
cp .env.example .env
# Edit .env and add your NVIDIA_API_KEY
```

### 2. Install server dependencies
```bash
cd server
npm install
npx playwright install chromium
cd ..
```

### 3. Install client dependencies
```bash
cd client
npm install
cd ..
```

### 4. Start both servers
```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
NVIDIA_API_KEY=   # Your NVIDIA NIM API key — NEVER commit this
PORT=3001          # Optional: change server port
```

> **Security**: The API key is read server-side only via `process.env`. It is never sent to or exposed in the browser. The `.env` file is gitignored.

## Demo Scenario

The first build intentionally contains a seeded boundary-clamping bug (player can escape canvas left edge). The system will:
1. Generate the buggy build
2. Have the playtest bot fail the `player_cannot_leave_bounds` assertion  
3. Show diagnosis + patch in the Agent Console
4. Re-test → all assertions pass
5. Reach the **Verified Playable** state

## Design System

- Background: `#2C2E39` (dark grey canvas)
- Accent: `#D8125B` (fuchsia — CTAs, active states, glows)
- Display font: **Barlow Condensed** (bold, energetic headings)
- Code font: **JetBrains Mono** (terminal/agent console)

## Tech Stack

- **Frontend**: React 18, Vite, vanilla CSS (no UI framework)
- **Backend**: Node.js, Express, Server-Sent Events
- **LLM**: NVIDIA NIM API (OpenAI-compatible), `meta/llama-3.1-70b-instruct`
- **Testing**: Playwright (headless Chromium)
- **Games**: 100% vanilla HTML5 Canvas + JavaScript (no dependencies)
