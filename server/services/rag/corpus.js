// server/services/rag/corpus.js
// 14 Curated Production-Grade Recipes for HTML5 Canvas Game Architecture

export const RAG_CORPUS = [
  {
    id: 'canvas_loop_60fps',
    title: 'Canvas Game Loop & Delta Time',
    tags: ['canvas', 'loop', 'requestanimationframe', 'fps', 'delta', 'render'],
    genre: 'all',
    content: `// CANONICAL 60FPS GAME LOOP WITH DELTA TIME
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1); // Clamp delta time to avoid spiral of death
  lastTime = now;

  if (window.__gameState && window.__gameState.status === 'playing') {
    update(dt);
  }
  render();

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);`
  },
  {
    id: 'keyboard_inputs',
    title: 'Global Keyboard Input Map & Focus Handling',
    tags: ['input', 'keyboard', 'controls', 'keys', 'arrow', 'wasd', 'focus'],
    genre: 'all',
    content: `// WINDOW-ATTACHED KEYBOARD CONTROLS (NEVER ATTACH TO CANVAS ONLY)
const keys = {};
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.key] = true;
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
  keys[e.key.toLowerCase()] = false;
});
canvas.addEventListener('click', () => window.focus());`
  },
  {
    id: 'boundary_clamping',
    title: 'Strict Boundary Clamping',
    tags: ['boundary', 'clamp', 'bounds', 'canvas', 'player', 'edges'],
    genre: 'all',
    content: `// STRICT PLAYER BOUNDARY CLAMPING
// Always clamp both axes so player never leaves visible canvas
player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));`
  },
  {
    id: 'aabb_collision',
    title: 'AABB Rectangle Collision Detection',
    tags: ['collision', 'aabb', 'box', 'intersect', 'hitbox', 'rectangle'],
    genre: 'all',
    content: `// AXIS-ALIGNED BOUNDING BOX (AABB) INTERSECTION
function checkAABB(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}`
  },
  {
    id: 'circle_collision',
    title: 'Radial Circle Collision Detection',
    tags: ['collision', 'circle', 'radius', 'distance', 'radial', 'projectile'],
    genre: 'all',
    content: `// CIRCLE-TO-CIRCLE COLLISION (USES SQUARED DISTANCE FOR PERFORMANCE)
function checkCircleCollision(c1, c2) {
  const dx = (c1.x + (c1.radius || c1.width/2)) - (c2.x + (c2.radius || c2.width/2));
  const dy = (c1.y + (c1.radius || c1.height/2)) - (c2.y + (c2.radius || c2.height/2));
  const distSq = dx * dx + dy * dy;
  const radSum = (c1.radius || c1.width/2) + (c2.radius || c2.width/2);
  return distSq <= radSum * radSum;
}`
  },
  {
    id: 'particle_system',
    title: 'Procedural Particle System & Auto-Pruning',
    tags: ['particles', 'spark', 'explosion', 'effects', 'burst', 'juice'],
    genre: 'all',
    content: `// PROCEDURAL BURST PARTICLES WITH MEMORY BOUNDS
const particles = [];
function spawnBurst(x, y, color = '#D8125B', count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}`
  },
  {
    id: 'screen_shake',
    title: 'Juice: Camera Screen Shake',
    tags: ['shake', 'camera', 'screen', 'juice', 'feedback', 'impact'],
    genre: 'all',
    content: `// CAMERA SCREEN SHAKE
let shakeTime = 0;
let shakeMagnitude = 0;
function triggerShake(magnitude = 8, duration = 0.25) {
  shakeMagnitude = magnitude;
  shakeTime = duration;
}

function applyScreenShake(ctx, dt) {
  if (shakeTime > 0) {
    shakeTime -= dt;
    const offsetX = (Math.random() - 0.5) * 2 * shakeMagnitude;
    const offsetY = (Math.random() - 0.5) * 2 * shakeMagnitude;
    ctx.translate(offsetX, offsetY);
  }
}`
  },
  {
    id: 'webaudio_synth',
    title: 'Zero-Asset Procedural WebAudio Sound Synthesizer',
    tags: ['audio', 'sound', 'webaudio', 'synth', 'sfx', 'pew', 'beep', 'boom'],
    genre: 'all',
    content: `// ZERO-ASSET WEBAUDIO PROCEDURAL SOUNDS
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'hit' || type === 'explosion') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'coin' || type === 'score') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {}
}`
  },
  {
    id: 'game_state_machine',
    title: 'Game State Machine & Live Telemetry Protocol',
    tags: ['state', 'gamestate', 'protocol', 'won', 'lost', 'playing', 'restart'],
    genre: 'all',
    content: `// STATE MACHINE & STRICT TELEMETRY SPECIFICATION
window.__gameState = {
  player: { x: 400, y: 300, width: 32, height: 32, health: 100, speed: 280 },
  score: 0,
  status: 'playing', // 'playing' | 'won' | 'lost'
  entities: []
};

// Keep window.__gameState continuously synchronized in update()
function syncGameState() {
  window.__gameState.player.x = player.x;
  window.__gameState.player.y = player.y;
  window.__gameState.player.health = player.health;
  window.__gameState.score = score;
  window.__gameState.status = status;
  window.__gameState.entities = entities;
}

// Draw game over / victory overlay with restart hint
function renderHUD(ctx) {
  ctx.fillStyle = '#2C2E39';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('SCORE: ' + score, 20, 35);
  ctx.fillText('HEALTH: ' + Math.max(0, Math.round(player.health)), 20, 65);

  if (status === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#D8125B';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Press SPACE or CLICK to Restart', canvas.width/2, canvas.height/2 + 25);
  }
}`
  },
  {
    id: 'genre_arcade_dodger',
    title: 'Arcade Dodger / Collector Mechanics',
    tags: ['arcade', 'dodge', 'collect', 'falling', 'hazards', 'spawn'],
    genre: 'arcade',
    content: `// ARCADE DODGER MECHANICS
let spawnTimer = 0;
const hazards = [];
const collectibles = [];

function updateArcade(dt) {
  spawnTimer += dt;
  if (spawnTimer > 0.8) {
    spawnTimer = 0;
    if (hazards.length < 30) {
      hazards.push({
        x: Math.random() * (canvas.width - 24),
        y: -30,
        width: 24, height: 24,
        vy: 120 + Math.random() * 100,
        color: '#D8125B'
      });
    }
    if (collectibles.length < 15 && Math.random() < 0.4) {
      collectibles.push({
        x: Math.random() * (canvas.width - 20),
        y: -20,
        width: 20, height: 20,
        vy: 80 + Math.random() * 60,
        color: '#F0C020'
      });
    }
  }

  // Update & cull hazards
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.y += h.vy * dt;
    if (checkAABB(player, h)) {
      player.health -= 25;
      hazards.splice(i, 1);
      if (player.health <= 0) status = 'lost';
    } else if (h.y > canvas.height + 50) {
      hazards.splice(i, 1);
    }
  }
}`
  },
  {
    id: 'genre_shooter',
    title: 'Top-Down Shooter Mechanics',
    tags: ['shooter', 'bullets', 'projectiles', 'enemies', 'fire', 'aim'],
    genre: 'shooter',
    content: `// TOP-DOWN SHOOTER MECHANICS
const bullets = [];
const enemies = [];
let fireCooldown = 0;

function fireBullet() {
  if (fireCooldown <= 0) {
    fireCooldown = 0.18;
    bullets.push({
      x: player.x + player.width/2 - 3,
      y: player.y - 6,
      width: 6, height: 12,
      vy: -400,
      color: '#D8125B'
    });
  }
}

function updateShooter(dt) {
  if (fireCooldown > 0) fireCooldown -= dt;
  if (keys[' '] || keys['Space']) fireBullet();

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy * dt;
    if (b.y < -20) { bullets.splice(i, 1); continue; }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (checkAABB(b, e)) {
        bullets.splice(i, 1);
        enemies.splice(j, 1);
        score += 100;
        break;
      }
    }
  }
}`
  },
  {
    id: 'genre_platformer',
    title: 'Platformer Gravity & Jump Mechanics',
    tags: ['platformer', 'gravity', 'jump', 'velocity', 'platforms', 'ground'],
    genre: 'platformer',
    content: `// 2D PLATFORMER GRAVITY & JUMP
const GRAVITY = 900;
const JUMP_FORCE = -480;
let onGround = false;

function updatePlatformer(dt) {
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;

  // Ground collision check (canvas floor or platforms)
  const floorY = canvas.height - player.height - 40;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    onGround = true;
  } else {
    onGround = false;
  }

  // Jump trigger
  if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && onGround) {
    player.vy = JUMP_FORCE;
    onGround = false;
  }
}`
  },
  {
    id: 'genre_puzzle_roguelike',
    title: 'Grid Tile & Turn-based / Dungeon Mechanics',
    tags: ['puzzle', 'roguelike', 'dungeon', 'grid', 'turn', 'tile'],
    genre: 'puzzle',
    content: `// GRID MOVEMENT & TILE INTERACTION
const TILE_SIZE = 40;
function alignToGrid(val) {
  return Math.floor(val / TILE_SIZE) * TILE_SIZE;
}

function moveGrid(dx, dy) {
  const nextX = player.x + dx * TILE_SIZE;
  const nextY = player.y + dy * TILE_SIZE;
  if (nextX >= 0 && nextX <= canvas.width - player.width &&
      nextY >= 0 && nextY <= canvas.height - player.height) {
    player.x = nextX;
    player.y = nextY;
  }
}`
  },
  {
    id: 'anti_bug_checklist',
    title: 'Sensory Anti-Bug Checklist & Quality Golden Rules',
    tags: ['rules', 'checklist', 'bugs', 'errors', 'stability', 'golden'],
    genre: 'all',
    content: `// GOLDEN RULES FOR ZERO PLAYTEST FAILURES:
// 1. NEVER drain health unconditionally each frame (e.g. player.health -= 0.1 every tick).
//    Only subtract health on verified collisions with active hazards!
// 2. NEVER terminate or abort requestAnimationFrame when health <= 0 or win.
//    Keep running rAF so screen updates with Game Over/Victory overlays and restart listeners work.
// 3. Keep entity array size strictly bounded (cap hazards.length < 100, bullets.length < 50).
// 4. Always initialize window.__gameState before the first render frame.
// 5. Always clamp player.x between 0 and (canvas.width - player.width).
// 6. Ensure inputs work when keys are held down (continuous movement).`
  }
];
