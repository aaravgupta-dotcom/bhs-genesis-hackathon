"use client"

import * as React from "react"

/**
 * Engraved Ticket — a die-cut poster ticket with a heavy condensed headline
 * that breathes.
 *
 * Two prints of the same stub: `paper` is an engraving on white stock with red
 * ink spattered across it, `crimson` is a mirrored red ornament plate on black
 * with the word knocked out in white.
 *
 * Nothing is loaded. The engraving is traced from a flow field, the ornament is
 * built from spirals, leaves and rosettes and mirrored like a real plate, the
 * spatter is generated, and the headline is drawn from its own glyph outlines —
 * so it looks the same on every machine and needs no font, image or network.
 *
 * It is a control, not a picture: hold it (or hold Space) to inhale, let go to
 * exhale, tap to re-spray the ink. Left alone it breathes on a slow rhythm.
 */

export type TicketVariant = "paper" | "crimson"

/** Seconds of inhale, hold, exhale, rest. */
export type Rhythm = [number, number, number, number]

export type EngravedTicketProps = {
  /** The headline. A–Z, 0–9 and . , - ! ? ' are drawn; anything else is a gap. */
  word?: string
  variant?: TicketVariant
  /** Small two-line mark at the top left of the type block. */
  tagline?: string
  /** The quoted line at the top right. */
  quote?: string
  /** The fine print under the headline. */
  body?: string
  /** The tiny column in the corner. */
  notes?: string
  /** What the barcode encodes. Same text, same bars. */
  code?: string
  /** Letter that carries the square dot, as in the print. -1 for none. */
  dot?: number
  /** Breathing rhythm in seconds: inhale, hold, exhale, rest. */
  rhythm?: Rhythm
  /** Words for the four phases. */
  phases?: [string, string, string, string]
  /** Breathe on its own when nobody is holding it. */
  breathe?: boolean
  /** Number of ink spatters. Defaults to 5 on paper, 0 on crimson. */
  splats?: number
  /** Seeds the engraving, the ornament and the first spray. */
  seed?: number
  /** The red. */
  accent?: string
  /** Line colour of the engraving; the headline on paper. */
  ink?: string
  /** The stock. */
  ground?: string
  /** Headline colour on crimson. */
  type?: string
  /** Largest tilt in degrees. 0 holds it flat. */
  tilt?: number
  /** Ticket width. Height follows the 1200 : 460 stub. */
  width?: string
  /** Called with the running count each time a breath completes. */
  onBreath?: (count: number) => void
  className?: string
}

// #region ticket
export const VIEW_W = 1200
export const VIEW_H = 460

export const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0)

export const easeSine = (v: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(v))

/** Small, fast, seedable. The same seed always prints the same ticket. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const hashString = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Where a breath is at `t` seconds into the loop.
 *
 * `index` counts whole cycles so the caller can tell when one completed;
 * `left` is the seconds remaining in the current phase, for the countdown.
 */
export const breathAt = (
  t: number,
  rhythm: number[],
): { value: number; phase: number; left: number; index: number } => {
  const r = [0, 1, 2, 3].map((i) => (rhythm[i] > 0 ? rhythm[i] : 0))
  const total = r[0] + r[1] + r[2] + r[3]
  if (!(total > 0) || !Number.isFinite(t)) return { value: 0, phase: 3, left: 0, index: 0 }
  const index = Math.floor(t / total)
  let u = t - index * total
  for (let p = 0; p < 4; p++) {
    if (u < r[p] || p === 3) {
      const k = r[p] > 0 ? clamp01(u / r[p]) : 1
      const value = p === 0 ? easeSine(k) : p === 1 ? 1 : p === 2 ? 1 - easeSine(k) : 0
      return { value, phase: p, left: Math.max(0, r[p] - u), index }
    }
    u -= r[p]
  }
  return { value: 0, phase: 3, left: 0, index }
}

/**
 * How far letter `i` of `n` has inhaled when the whole word is at `v`.
 * The letters fill left to right, and every one of them reaches 1 at v = 1.
 */
export const letterBreath = (v: number, i: number, n: number, stagger: number): number => {
  // Exactly 1 at the top, not 0.9999…: the last letter must land level.
  if (n <= 1 || v >= 1 || !(v > 0)) return clamp01(v)
  return clamp01(v * (1 + stagger * (n - 1)) - stagger * i)
}

/**
 * The stub outline: a rectangle with concave quarter-round corners, as if a
 * coin had been punched out of each. With `inset` it is the true parallel
 * offset — the arcs keep their centres on the outer corners and grow by the
 * inset — so a frame drawn with it runs at an even distance from the edge.
 */
export const ticketPath = (w: number, h: number, r: number, inset: number): string => {
  const d = inset
  const R = r + d
  const f = (n: number) => String(Math.round(n * 100) / 100)
  return (
    "M" + f(R) + " " + f(d) +
    "H" + f(w - R) +
    "A" + f(R) + " " + f(R) + " 0 0 0 " + f(w - d) + " " + f(R) +
    "V" + f(h - R) +
    "A" + f(R) + " " + f(R) + " 0 0 0 " + f(w - R) + " " + f(h - d) +
    "H" + f(R) +
    "A" + f(R) + " " + f(R) + " 0 0 0 " + f(d) + " " + f(h - R) +
    "V" + f(R) +
    "A" + f(R) + " " + f(R) + " 0 0 0 " + f(R) + " " + f(d) +
    "Z"
  )
}

/** Bars for the barcode, packed into `width`. Same text, same bars. */
export const barcode = (code: string, width: number): { x: number; w: number }[] => {
  const rnd = mulberry32(hashString(code || "0"))
  const bars: { x: number; w: number }[] = []
  let x = 0
  while (x < width) {
    const w = 0.8 + Math.floor(rnd() * 4) * 0.9
    if (x + w > width) break
    bars.push({ x, w })
    x += w + 0.9 + Math.floor(rnd() * 3) * 0.9
  }
  return bars
}

/*
 * The headline face. Every glyph is 100 units tall and a handful wide, drawn
 * as polygons: "x y r|x y r|…", where r rounds that corner. A heavy condensed
 * grotesque is mostly slabs and stadiums, so polygons with a few rounded
 * corners are all it takes — and it means the word never depends on what
 * fonts the installer happens to have.
 */
export const GLYPHS: Record<string, { w: number; c: string[]; h?: string[] }> = {
  A: { w: 48, c: ["13 0 2|35 0 2|48 100|32 100|30 76|18 76|16 100|0 100"], h: ["21 24|27 24|29 60|19 60"] },
  B: { w: 46, c: ["0 0|46 0 12|46 44 4|41 50|46 56 4|46 100 12|0 100"], h: ["16 14|30 14 3|30 43 3|16 43", "16 57|30 57 3|30 86 3|16 86"] },
  C: { w: 46, c: ["0 0 12|46 0 12|46 36|30 36|30 14 3|16 14 3|16 86 3|30 86 3|30 64|46 64|46 100 12|0 100 12"] },
  D: { w: 46, c: ["0 0|46 0 12|46 100 12|0 100"], h: ["16 14|30 14 3|30 86 3|16 86"] },
  E: { w: 38, c: ["0 0|38 0|38 14|16 14|16 43|34 43|34 57|16 57|16 86|38 86|38 100|0 100"] },
  F: { w: 38, c: ["0 0|38 0|38 14|16 14|16 43|34 43|34 57|16 57|16 100|0 100"] },
  G: { w: 46, c: ["0 0 12|46 0 12|46 34|30 34|30 14 3|16 14 3|16 86 3|30 86 3|30 60|24 60|24 46|46 46|46 100|0 100 12"] },
  H: { w: 46, c: ["0 0|16 0|16 43|30 43|30 0|46 0|46 100|30 100|30 57|16 57|16 100|0 100"] },
  I: { w: 16, c: ["0 0|16 0|16 100|0 100"] },
  J: { w: 44, c: ["28 0|44 0|44 100 12|0 100 12|0 66|16 66|16 86 3|28 86 3"] },
  K: { w: 48, c: ["0 0|16 0|16 38|31 0|48 0|30 48|48 100|31 100|16 62|16 100|0 100"] },
  L: { w: 38, c: ["0 0|16 0|16 86|38 86|38 100|0 100"] },
  M: { w: 62, c: ["0 0|19 0|31 50|43 0|62 0|62 100|47 100|47 40|37 88|25 88|15 40|15 100|0 100"] },
  N: { w: 48, c: ["0 0|17 0|33 58|33 0|48 0|48 100|31 100|15 42|15 100|0 100"] },
  O: { w: 46, c: ["0 0 12|46 0 12|46 100 12|0 100 12"], h: ["16 14 3|30 14 3|30 86 3|16 86 3"] },
  P: { w: 46, c: ["0 0|46 0 12|46 62 12|16 62|16 100|0 100"], h: ["16 14|30 14 3|30 48 3|16 48"] },
  Q: { w: 46, c: ["0 0 12|46 0 12|46 100 12|0 100 12", "24 80|36 80|46 108|34 108"], h: ["16 14 3|30 14 3|30 86 3|16 86 3"] },
  R: { w: 46, c: ["0 0|46 0 12|46 44 4|40 51|46 58|46 100|30 100|30 64 3|16 64|16 100|0 100"], h: ["16 14|30 14 3|30 50 3|16 50"] },
  S: { w: 46, c: ["0 0 12|46 0 12|46 32|30 32|30 14 3|16 14 3|16 43|40 43 6|46 49 6|46 100 12|0 100 12|0 68|16 68|16 86 3|30 86 3|30 57|6 57 6|0 51 6"] },
  T: { w: 46, c: ["0 0|46 0|46 14|31 14|31 100|15 100|15 14|0 14"] },
  U: { w: 46, c: ["0 0|16 0|16 86 3|30 86 3|30 0|46 0|46 100 12|0 100 12"] },
  V: { w: 48, c: ["0 0|16 0|24 72|32 0|48 0|35 100|13 100"] },
  W: { w: 66, c: ["0 0|15 0|20 64|26 0|40 0|46 64|51 0|66 0|57 100|40 100|33 44|26 100|9 100"] },
  X: { w: 48, c: ["0 0|16 0|24 32|32 0|48 0|33 50|48 100|32 100|24 68|16 100|0 100|15 50"] },
  Y: { w: 48, c: ["0 0|16 0|24 36|32 0|48 0|32 60|32 100|16 100|16 60"] },
  Z: { w: 42, c: ["0 0|42 0|42 14|18 86|42 86|42 100|0 100|0 86|24 14|0 14"] },
  "0": { w: 44, c: ["0 0 12|44 0 12|44 100 12|0 100 12"], h: ["16 14 3|28 14 3|28 86 3|16 86 3"] },
  "1": { w: 30, c: ["6 0|30 0|30 100|14 100|14 18|6 22"] },
  "2": { w: 44, c: ["0 0 12|44 0 12|44 50 4|18 86|44 86|44 100|0 100|0 84|28 46|28 14 3|16 14 3|16 30|0 30"] },
  "3": { w: 44, c: ["0 0 12|44 0 12|44 44 4|39 50|44 56 4|44 100 12|0 100 12|0 70|16 70|16 86 3|28 86 3|28 57|12 57|12 43|28 43|28 14 3|16 14 3|16 30|0 30"] },
  "4": { w: 44, c: ["0 0|16 0|16 56|28 56|28 0|44 0|44 100|28 100|28 70|0 70"] },
  "5": { w: 44, c: ["0 0|44 0|44 14|16 14|16 40|44 40 12|44 100 12|0 100 12|0 70|16 70|16 86 3|28 86 3|28 54 3|0 54"] },
  "6": { w: 44, c: ["0 0 12|44 0 12|44 30|28 30|28 14 3|16 14 3|16 40|44 40 12|44 100 12|0 100 12"], h: ["16 54 3|28 54 3|28 86 3|16 86 3"] },
  "7": { w: 42, c: ["0 0|42 0|42 16|26 100|10 100|26 14|0 14"] },
  "8": { w: 44, c: ["0 0 12|44 0 12|44 44 4|39 50|44 56 4|44 100 12|0 100 12|0 56 4|5 50|0 44 4"], h: ["16 14 3|28 14 3|28 43 3|16 43 3", "16 57 3|28 57 3|28 86 3|16 86 3"] },
  "9": { w: 44, c: ["0 0 12|44 0 12|44 100 12|0 100 12|0 70|16 70|16 86 3|28 86 3|28 60|0 60 12"], h: ["16 14 3|28 14 3|28 46 3|16 46 3"] },
  ".": { w: 16, c: ["0 84|16 84|16 100|0 100"] },
  ",": { w: 16, c: ["0 84|16 84|16 102|8 114|2 114|6 100|0 100"] },
  "-": { w: 28, c: ["0 43|28 43|28 57|0 57"] },
  "!": { w: 16, c: ["0 0|16 0|16 70|0 70", "0 84|16 84|16 100|0 100"] },
  "?": { w: 42, c: ["0 0 12|42 0 12|42 46 4|30 58|30 70|14 70|14 52|26 42|26 14 3|16 14 3|16 30|0 30", "14 84|30 84|30 100|14 100"] },
  "'": { w: 14, c: ["0 0|14 0|12 30|2 30"] },
}

export const SPACE_W = 22
export const TRACKING = 5

export const parseContour = (s: string): number[][] =>
  s.split("|").map((p) => p.trim().split(/\s+/).map(Number))

/** One contour as path data, corners rounded where asked. Holes wind backwards. */
export const contourPath = (s: string, hole: boolean): string => {
  const pts = parseContour(s)
  if (hole) pts.reverse()
  const n = pts.length
  const f = (v: number) => String(Math.round(v * 100) / 100)
  let d = ""
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const a = pts[(i + n - 1) % n]
    const b = pts[(i + 1) % n]
    const r = p[2] || 0
    if (r > 0) {
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1
      const lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1
      const ka = Math.min(r, la / 2) / la
      const kb = Math.min(r, lb / 2) / lb
      const ix = p[0] + (a[0] - p[0]) * ka
      const iy = p[1] + (a[1] - p[1]) * ka
      const ox = p[0] + (b[0] - p[0]) * kb
      const oy = p[1] + (b[1] - p[1]) * kb
      d += (i ? "L" : "M") + f(ix) + " " + f(iy) + "Q" + f(p[0]) + " " + f(p[1]) + " " + f(ox) + " " + f(oy)
    } else {
      d += (i ? "L" : "M") + f(p[0]) + " " + f(p[1])
    }
  }
  return d + "Z"
}

export const glyphPath = (ch: string): string => {
  const g = GLYPHS[ch]
  if (!g) return ""
  return g.c.map((c) => contourPath(c, false)).join("") + (g.h || []).map((c) => contourPath(c, true)).join("")
}

/** Lay the word out on the baseline. Unknown characters become a gap. */
export const layoutWord = (word: string): { glyphs: { ch: string; x: number; w: number }[]; width: number } => {
  const chars = Array.from(String(word || "").toUpperCase())
  const glyphs: { ch: string; x: number; w: number }[] = []
  let x = 0
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const w = GLYPHS[ch] ? GLYPHS[ch].w : SPACE_W
    glyphs.push({ ch, x, w })
    x += w + (i < chars.length - 1 ? TRACKING : 0)
  }
  return { glyphs, width: x }
}
// #endregion

const PAPER = { accent: "#e2261b", ink: "#161412", ground: "#ece9e3", type: "#161412" }
const CRIMSON = { accent: "#d9241c", ink: "#d9241c", ground: "#0e0b0b", type: "#f1eee8" }

const DEFAULT_BODY =
  "To breathe is the first thing a body learns and the last thing it forgets. Air in, air out: " +
  "a rhythm older than language, kept without instruction, carried through every hour whether or not " +
  "anyone is paying attention. Slow it down and it slows everything with it. Hold this ticket and breathe in."
const DEFAULT_NOTES = "Admit one\nValid for a single breath\nRepeat as often\nas required\nNon-transferable"
const FONT = '"Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif'
const STAGGER = 0.07
const AMP = 0.14
/**
 * The square dot over one letter, and its gap above the cap height. It rides
 * its letter as it inhales; the layouts leave exactly that much air above the
 * word, so the dot never climbs into the barcode whichever letter carries it.
 */
const DOT = 12
const DOT_GAP = 6

const TICKET_R = 34
const OUTLINE = ticketPath(VIEW_W, VIEW_H, TICKET_R, 0)
const MASK =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + VIEW_W + " " + VIEW_H +
      "' preserveAspectRatio='none'><path d='" + OUTLINE + "'/></svg>",
  ) +
  '")'

/** Viewbox units to a percentage of the ticket, and to container-width type. */
const px = (x: number) => (x / VIEW_W) * 100 + "%"
const py = (y: number) => (y / VIEW_H) * 100 + "%"
const cq = (u: number) => (u / VIEW_W) * 100 + "cqw"

type Layout = {
  tag: [number, number]
  bar: [number, number, number, number]
  quote: [number, number]
  notes: [number, number]
  word: [number, number, number, number]
  align: "right" | "center"
  body: [number, number, number]
}

const LAYOUT: Record<TicketVariant, Layout> = {
  paper: {
    tag: [586, 46],
    bar: [800, 46, 140, 14],
    quote: [950, 46],
    notes: [1062, 46],
    word: [586, 128, 556, 176],
    align: "right",
    body: [470, 316, 672],
  },
  crimson: {
    tag: [300, 50],
    bar: [548, 50, 150, 14],
    quote: [884, 50],
    notes: [884, 68],
    word: [230, 132, 740, 186],
    align: "center",
    body: [290, 332, 620],
  },
}

// ---------------------------------------------------------------------------
// Spatter
// ---------------------------------------------------------------------------

type Splat = { cx: number; cy: number; body: string; drips: string; r: number }

const f1 = (v: number) => String(Math.round(v * 10) / 10)

/** One mark: two crossed strokes with split, clawed ends, drips and spray. */
const makeSplat = (rnd: () => number, cx: number, cy: number, size: number): Splat => {
  let body = ""
  let drips = ""
  const strokes = 1 + Math.round(rnd() * 1.2)
  const base = rnd() * Math.PI
  for (let s = 0; s < strokes; s++) {
    const a = base + s * (Math.PI / 2 + (rnd() - 0.5) * 0.9)
    const len = size * (0.8 + rnd() * 0.7)
    const w = size * (0.05 + rnd() * 0.035)
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const nx = -sa
    const ny = ca
    const steps = 14
    const top: string[] = []
    const bot: string[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps - 0.5
      const hw = w * (1 - Math.pow(Math.abs(t) * 2, 2.2) * 0.75) * (0.8 + rnd() * 0.4)
      const bx = cx + ca * t * len
      const by = cy + sa * t * len
      top.push(f1(bx + nx * hw) + " " + f1(by + ny * hw))
      bot.push(f1(bx - nx * hw) + " " + f1(by - ny * hw))
    }
    body += "M" + top.join("L") + "L" + bot.reverse().join("L") + "Z"
    // Claws: the brush splits as it lifts, into two or three fine spikes.
    for (const end of [-1, 1]) {
      const ex = cx + ca * end * len * 0.5
      const ey = cy + sa * end * len * 0.5
      const claws = 2 + Math.floor(rnd() * 2)
      for (let k = 0; k < claws; k++) {
        const spread = (k - (claws - 1) / 2) * (0.45 + rnd() * 0.3)
        const ang = a + (end < 0 ? Math.PI : 0) + spread
        const cl = size * (0.12 + rnd() * 0.16)
        const cw = w * 0.45
        const tx = ex + Math.cos(ang) * cl
        const ty = ey + Math.sin(ang) * cl
        const px2 = -Math.sin(ang) * cw
        const py2 = Math.cos(ang) * cw
        body +=
          "M" + f1(ex + px2) + " " + f1(ey + py2) +
          "L" + f1(tx) + " " + f1(ty) +
          "L" + f1(ex - px2) + " " + f1(ey - py2) + "Z"
      }
    }
    // Drips run down from the underside of the stroke.
    const dn = 1 + Math.floor(rnd() * 3)
    for (let k = 0; k < dn; k++) {
      const t = (rnd() - 0.5) * 0.8
      const dx = cx + ca * t * len
      const dy = cy + sa * t * len + w * 0.4
      const dw = w * (0.22 + rnd() * 0.25)
      const dl = size * (0.12 + rnd() * 0.45)
      drips +=
        "M" + f1(dx - dw) + " " + f1(dy) +
        "L" + f1(dx + dw) + " " + f1(dy) +
        "L" + f1(dx + dw * 0.7) + " " + f1(dy + dl) +
        "A" + f1(dw * 1.2) + " " + f1(dw * 1.2) + " 0 1 1 " + f1(dx - dw * 0.7) + " " + f1(dy + dl) + "Z"
    }
  }
  // Spray: loose droplets thrown off around the mark.
  const drops = 5 + Math.floor(rnd() * 8)
  for (let k = 0; k < drops; k++) {
    const ang = rnd() * Math.PI * 2
    const dist = size * (0.35 + rnd() * 0.5)
    const r = 0.8 + rnd() * rnd() * size * 0.03
    const x = cx + Math.cos(ang) * dist
    const y = cy + Math.sin(ang) * dist
    body += "M" + f1(x - r) + " " + f1(y) + "a" + f1(r) + " " + f1(r) + " 0 1 0 " + f1(r * 2) + " 0a" + f1(r) + " " + f1(r) + " 0 1 0 " + f1(-r * 2) + " 0Z"
  }
  return { cx, cy, body, drips, r: size }
}

const makeSplats = (seed: number, count: number, variant: TicketVariant): Splat[] => {
  const rnd = mulberry32(seed * 7919 + 17)
  const out: Splat[] = []
  for (let i = 0; i < count; i++) {
    // Most land on the art; every third crosses into the type, as in a print
    // that was spattered after the headline went down.
    const onType = variant === "paper" ? i % 3 === 2 : false
    const cx = onType ? 640 + rnd() * 460 : variant === "paper" ? 90 + rnd() * 520 : 80 + rnd() * 1040
    const cy = onType ? 110 + rnd() * 160 : 60 + rnd() * 340
    out.push(makeSplat(rnd, cx, cy, 110 + rnd() * 120))
  }
  return out
}

// ---------------------------------------------------------------------------
// The plates
// ---------------------------------------------------------------------------

type Ctx = CanvasRenderingContext2D

const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

let grainTile: HTMLCanvasElement | null = null
const grain = (): HTMLCanvasElement => {
  if (grainTile) return grainTile
  const c = document.createElement("canvas")
  c.width = 180
  c.height = 180
  const g = c.getContext("2d")
  if (g) {
    const img = g.createImageData(180, 180)
    const rnd = mulberry32(99)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255)
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
  }
  grainTile = c
  return c
}

/** A blob with a ragged, brushy edge — the red figures under the engraving. */
const blob = (ctx: Ctx, rnd: () => number, cx: number, cy: number, rx: number, ry: number, rot: number): Path2D => {
  const n = 64
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]
  const path = new Path2D()
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const k =
      1 + 0.22 * Math.sin(a * 2 + ph[0]) + 0.12 * Math.sin(a * 5 + ph[1]) + 0.06 * Math.sin(a * 11 + ph[2]) +
      (rnd() - 0.5) * 0.06
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * ry * k
    const X = cx + x * Math.cos(rot) - y * Math.sin(rot)
    const Y = cy + x * Math.sin(rot) + y * Math.cos(rot)
    if (i) path.lineTo(X, Y)
    else path.moveTo(X, Y)
  }
  path.closePath()
  ctx.fill(path)
  return path
}

/**
 * The engraving: streamlines through a flow field, their weight set by a tone
 * map, crossed with a second pass in the darkest passages. That swelling,
 * directional line is what a burin leaves and what a filter never fakes.
 */
const drawPaper = (ctx: Ctx, seed: number, pal: typeof PAPER) => {
  const rnd = mulberry32(seed)
  const ph = Array.from({ length: 9 }, () => rnd() * Math.PI * 2)
  const fade = (x: number, y: number) => smooth(860, 470, x) * (0.35 + 0.65 * smooth(470, 300, y + 0.55 * (x - 420)))

  ctx.fillStyle = pal.ground
  ctx.fillRect(-60, -60, VIEW_W + 120, VIEW_H + 120)

  // Red figures, printed first so the line work runs over them.
  ctx.fillStyle = pal.accent
  const figs: { path: Path2D; cx: number; cy: number; r: number }[] = []
  const nf = 3 + Math.floor(rnd() * 2)
  for (let i = 0; i < nf; i++) {
    const cx = 120 + (i / nf) * 420 + rnd() * 60
    const cy = 190 + rnd() * 200
    const rx = 22 + rnd() * 34
    const ry = 60 + rnd() * 70
    ctx.globalAlpha = 0.92
    figs.push({ path: blob(ctx, rnd, cx, cy, rx, ry, (rnd() - 0.5) * 1.4), cx, cy, r: ry })
  }
  ctx.globalAlpha = 1

  const tone = (x: number, y: number) => {
    const n =
      0.5 +
      0.28 * Math.sin(x * 0.0085 + ph[0]) * Math.cos(y * 0.012 + ph[1]) +
      0.2 * Math.sin((x + y * 1.7) * 0.0052 + ph[2]) +
      0.14 * Math.sin(x * 0.027 - y * 0.019 + ph[3])
    return clamp01((n - 0.1) * 1.25)
  }
  const angle = (x: number, y: number) =>
    1.25 * Math.sin(x * 0.0046 + ph[4]) + 1.0 * Math.cos(y * 0.0105 + ph[5]) + 0.7 * Math.sin((x - y) * 0.0062 + ph[6])

  // Segments are binned by weight and stroked once per bin: tens of thousands
  // of individual strokes would stall the first paint.
  const bins: Path2D[] = []
  const trace = (sx: number, sy: number, turn: number, gate: number, gain: number) => {
    const pts: number[] = [sx, sy]
    for (const dir of [1, -1]) {
      let x = sx
      let y = sy
      for (let k = 0; k < 14; k++) {
        const a = angle(x, y) + turn
        x += Math.cos(a) * 5 * dir
        y += Math.sin(a) * 5 * dir
        if (x < -40 || x > 900 || y < -40 || y > VIEW_H + 40) break
        if (dir > 0) pts.push(x, y)
        else pts.unshift(x, y)
      }
    }
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const mx = (pts[i] + pts[i + 2]) / 2
      const my = (pts[i + 1] + pts[i + 3]) / 2
      // The fade dithers the plate out into bare stock rather than cutting it
      // off: segments drop out at random as it weakens, like a wiped plate.
      const fd = fade(mx, my)
      if (rnd() > fd) continue
      const t = tone(mx, my)
      if (t < gate) continue
      const b = Math.min(12, Math.round((0.2 + gain * Math.pow(t - gate, 1.5) * (0.4 + 0.6 * fd)) * 6))
      const path = bins[b] || (bins[b] = new Path2D())
      path.moveTo(pts[i], pts[i + 1])
      path.lineTo(pts[i + 2], pts[i + 3])
    }
  }
  for (let y = -30; y < VIEW_H + 30; y += 8) {
    for (let x = -30; x < 880; x += 40) {
      const sx = x + rnd() * 30
      const sy = y + rnd() * 5
      if (rnd() > fade(sx, sy) + 0.1) continue
      trace(sx, sy, 0, 0.12, 1.9)
    }
  }
  // Cross-hatch the shadows.
  for (let y = -30; y < VIEW_H + 30; y += 9) {
    for (let x = -30; x < 880; x += 44) {
      const sx = x + rnd() * 30
      const sy = y + rnd() * 6
      if (tone(sx, sy) < 0.62) continue
      trace(sx, sy, 1.2, 0.62, 1.6)
    }
  }
  ctx.strokeStyle = pal.ink
  ctx.lineCap = "round"
  for (let b = 0; b < bins.length; b++) {
    if (!bins[b]) continue
    ctx.lineWidth = Math.max(0.25, b / 6)
    ctx.stroke(bins[b])
  }
  // Model the figures: dense line work on their shadow side only, so the red
  // turns into form instead of a flat cut-out.
  for (const fig of figs) {
    ctx.save()
    ctx.clip(fig.path)
    const shade = new Path2D()
    for (let y = fig.cy - fig.r * 1.3; y < fig.cy + fig.r * 1.3; y += 3.2) {
      let x = fig.cx - fig.r * 0.1 + Math.sin(y * 0.05) * 6
      let yy = y
      shade.moveTo(x, yy)
      for (let k = 0; k < 18; k++) {
        const a = angle(x, yy) * 0.35 + 0.15
        x += Math.cos(a) * 5
        yy += Math.sin(a) * 5
        shade.lineTo(x, yy)
      }
    }
    ctx.lineWidth = 0.9
    ctx.globalAlpha = 0.75
    ctx.stroke(shade)
    ctx.restore()
  }
  ctx.globalAlpha = 1
  // A few long contour strokes give the plate its bones.
  ctx.lineWidth = 1.6
  for (let i = 0; i < 12; i++) {
    let x = rnd() * 600
    let y = rnd() * VIEW_H
    ctx.globalAlpha = 0.55 + rnd() * 0.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 40; k++) {
      const a = angle(x, y) + 0.2
      x += Math.cos(a) * 7
      y += Math.sin(a) * 7
      if (fade(x, y) < 0.2) break
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // Ink specks, and a few flecks of the red where it bled off the figures.
  for (let i = 0; i < 220; i++) {
    const x = rnd() * 900
    const y = rnd() * VIEW_H
    if (rnd() > fade(x, y) + 0.08) continue
    ctx.fillStyle = rnd() < 0.2 ? pal.accent : pal.ink
    ctx.globalAlpha = 0.4 + rnd() * 0.5
    ctx.fillRect(x, y, 0.8 + rnd() * 1.8, 0.8 + rnd() * 1.8)
  }
  ctx.globalAlpha = 1
}

type Orn = (ctx: Ctx) => void

/**
 * The ornament plate: acanthus scrolls, rosettes, a candelabrum and vines,
 * composed on the left half and printed again mirrored — which is how a
 * grotesque panel is actually cut, and why it reads as one at a glance.
 */
const drawCrimson = (ctx: Ctx, seed: number, pal: typeof CRIMSON) => {
  const rnd = mulberry32(seed)
  const red = pal.accent
  const dark = pal.ground

  ctx.fillStyle = dark
  ctx.fillRect(-60, -60, VIEW_W + 120, VIEW_H + 120)

  // Engraved ground: a fine diagonal rule under everything.
  ctx.strokeStyle = red
  ctx.globalAlpha = 0.16
  ctx.lineWidth = 0.7
  ctx.beginPath()
  for (let x = -VIEW_H - 60; x < VIEW_W + 60; x += 4.2) {
    ctx.moveTo(x, -40)
    ctx.lineTo(x + VIEW_H + 80, VIEW_H + 40)
  }
  ctx.stroke()
  ctx.globalAlpha = 1

  const hatch = (path: Path2D, ang: number, gap: number, from: number, cx = 0, cy = 0) => {
    ctx.save()
    ctx.clip(path)
    ctx.translate(cx, cy)
    ctx.strokeStyle = dark
    ctx.lineWidth = 0.9
    ctx.beginPath()
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    for (let o = -140 + from; o < 140; o += gap) {
      ctx.moveTo(-c * 200 - s * o, -s * 200 + c * o)
      ctx.lineTo(c * 200 - s * o, s * 200 + c * o)
    }
    ctx.stroke()
    ctx.restore()
  }

  const leaf = (x: number, y: number, ang: number, len: number, wid: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    const p = new Path2D()
    p.moveTo(0, 0)
    p.bezierCurveTo(len * 0.25, -wid, len * 0.75, -wid * 0.9, len, 0)
    p.bezierCurveTo(len * 0.7, wid * 0.55, len * 0.3, wid * 0.8, 0, 0)
    ctx.fillStyle = red
    ctx.fill(p)
    hatch(p, 0.9, 2.6, wid * 0.2)
    // The midrib, cut back out of the red.
    ctx.strokeStyle = dark
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.moveTo(len * 0.08, 0)
    ctx.quadraticCurveTo(len * 0.5, -wid * 0.3, len * 0.92, 0)
    ctx.stroke()
    ctx.restore()
  }

  const scroll = (cx: number, cy: number, R: number, dir: number, start: number): Orn => (c) => {
    const turns = 1.6
    const n = 90
    const pts: number[][] = []
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const th = start + dir * t * turns * Math.PI * 2
      const r = R * Math.exp(-2.1 * t)
      pts.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r, th, r])
    }
    c.strokeStyle = red
    c.lineCap = "round"
    for (let i = 0; i < n; i++) {
      c.lineWidth = 1.2 + 8 * Math.pow(1 - i / n, 1.4)
      c.beginPath()
      c.moveTo(pts[i][0], pts[i][1])
      c.lineTo(pts[i + 1][0], pts[i + 1][1])
      c.stroke()
    }
    // Acanthus leaves unrolling off the outer turn.
    for (let i = 4; i < n * 0.62; i += 7) {
      const p = pts[i]
      const out = p[2] + (dir > 0 ? -0.35 : 0.35)
      leaf(p[0], p[1], out, p[3] * 0.62 + 10, p[3] * 0.16 + 4)
    }
    // The eye of the volute.
    const e = pts[n]
    c.fillStyle = red
    c.beginPath()
    c.arc(e[0], e[1], 4, 0, Math.PI * 2)
    c.fill()
  }

  const rosette = (cx: number, cy: number, r: number, petals: number): Orn => (c) => {
    for (let i = 0; i < petals; i++) {
      leaf(cx, cy, (i / petals) * Math.PI * 2, r, r * 0.34)
    }
    c.fillStyle = dark
    c.beginPath()
    c.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = red
    c.lineWidth = 2
    c.stroke()
    c.fillStyle = red
    c.beginPath()
    c.arc(cx, cy, r * 0.13, 0, Math.PI * 2)
    c.fill()
  }

  const candelabrum = (x: number): Orn => (c) => {
    c.strokeStyle = red
    c.fillStyle = red
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(x, 18)
    c.lineTo(x, VIEW_H - 18)
    c.stroke()
    const beads = [60, 150, 250, 350, 420]
    for (const y of beads) {
      const p = new Path2D()
      const w = 12 + (y % 3) * 3
      p.moveTo(x, y - 26)
      p.bezierCurveTo(x + w * 1.6, y - 16, x + w, y + 10, x, y + 22)
      p.bezierCurveTo(x - w, y + 10, x - w * 1.6, y - 16, x, y - 26)
      c.fill(p)
      hatch(p, -0.5, 2.4, 0, x, y)
      leaf(x, y + 16, 0.5, 26, 7)
      leaf(x, y + 16, Math.PI - 0.5, 26, 7)
    }
  }

  const vine = (x0: number, y0: number, x1: number, y1: number, bend: number): Orn => (c) => {
    const mx = (x0 + x1) / 2 + bend
    const my = (y0 + y1) / 2 - bend * 0.6
    c.strokeStyle = red
    c.lineWidth = 2.4
    c.beginPath()
    c.moveTo(x0, y0)
    c.quadraticCurveTo(mx, my, x1, y1)
    c.stroke()
    for (let t = 0.2; t < 0.9; t += 0.22) {
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1
      leaf(x, y, -Math.PI / 2 + (t - 0.5) * 2.4, 22, 6)
    }
  }

  const j = () => (rnd() - 0.5) * 24
  const items: Orn[] = [
    candelabrum(40 + j() * 0.3),
    scroll(165 + j(), 330 + j(), 108, 1, -0.4),
    scroll(175 + j(), 118 + j(), 86, -1, 0.6),
    scroll(372 + j(), 392 + j(), 46, -1, 2.4),
    scroll(360 + j(), 70 + j(), 40, 1, 3.4),
    vine(80, 220, 270, 230, 30 + j()),
    vine(260, 250, 440, 440, -40 + j()),
    vine(250, 30, 460, 150, 30 + j()),
    rosette(96 + j() * 0.5, 225, 30, 8),
    rosette(290 + j(), 418, 30, 10),
    rosette(282 + j(), 40, 24, 8),
    rosette(470 + j(), 430, 20, 7),
    rosette(510 + j(), 32, 18, 7),
    rosette(262 + j(), 232, 36, 12),
  ]

  const drawHalf = () => {
    for (const it of items) {
      ctx.save()
      it(ctx)
      ctx.restore()
    }
  }
  drawHalf()
  ctx.save()
  ctx.translate(VIEW_W, 0)
  ctx.scale(-1, 1)
  drawHalf()
  ctx.restore()

  // Knock back the centre so the type sits on shadow, not on pattern.
  ctx.save()
  ctx.translate(VIEW_W / 2, 230)
  ctx.scale(1, 0.46)
  const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 420)
  g.addColorStop(0, "rgba(0,0,0,0.82)")
  g.addColorStop(0.55, "rgba(0,0,0,0.55)")
  g.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = g
  ctx.fillRect(-460, -460, 920, 920)
  ctx.restore()
}

const drawPlate = (canvas: HTMLCanvasElement, variant: TicketVariant, seed: number, pal: typeof PAPER) => {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform((w * dpr) / VIEW_W, 0, 0, (h * dpr) / VIEW_H, 0, 0)
  if (variant === "crimson") drawCrimson(ctx, seed, pal)
  else drawPaper(ctx, seed, pal)
  // Grain over everything: the print is on stock, not on a screen.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const pat = ctx.createPattern(grain(), "repeat")
  if (pat) {
    ctx.globalCompositeOperation = variant === "crimson" ? "screen" : "multiply"
    ctx.globalAlpha = variant === "crimson" ? 0.07 : 0.12
    ctx.fillStyle = pat
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = 1
  }
}

// ---------------------------------------------------------------------------

const CSS =
  ".et-splat{transform-box:fill-box;transform-origin:center;animation:et-splat 560ms cubic-bezier(.2,1.5,.35,1) both}" +
  ".et-drip{transform-box:fill-box;transform-origin:top;animation:et-drip 1100ms cubic-bezier(.3,.7,.2,1) both}" +
  "@keyframes et-splat{0%{transform:scale(.15);opacity:0}40%{opacity:1}100%{transform:scale(1);opacity:1}}" +
  "@keyframes et-drip{0%{transform:scaleY(0)}100%{transform:scaleY(1)}}" +
  "@media (prefers-reduced-motion: reduce){.et-splat,.et-drip{animation:none}}"

export default function EngravedTicket({
  word = "Breathe",
  variant = "paper",
  tagline = "No rights\nreserved",
  quote = "“Just stay calm”",
  body = DEFAULT_BODY,
  notes = DEFAULT_NOTES,
  code,
  dot = 1,
  rhythm = [4, 2, 6, 1],
  phases = ["Inhale", "Hold", "Exhale", "Rest"],
  breathe = true,
  splats,
  seed = 7,
  accent,
  ink,
  ground,
  type,
  tilt = 7,
  width = "min(100%, 1080px)",
  onBreath,
  className = "",
}: EngravedTicketProps) {
  const base = variant === "crimson" ? CRIMSON : PAPER
  const pal = {
    accent: accent || base.accent,
    ink: ink || (variant === "crimson" ? accent || base.ink : base.ink),
    ground: ground || base.ground,
    type: type || (variant === "paper" ? ink || base.type : base.type),
  }
  const L = LAYOUT[variant]
  const uid = React.useId().replace(/:/g, "")
  const rough = "et-rough-" + uid

  const cardRef = React.useRef<HTMLDivElement>(null)
  const artRef = React.useRef<HTMLCanvasElement>(null)
  const inkRef = React.useRef<SVGSVGElement>(null)
  const typeRef = React.useRef<HTMLDivElement>(null)
  const glareRef = React.useRef<HTMLDivElement>(null)
  const letterRefs = React.useRef<(SVGGElement | null)[]>([])
  const shadowRefs = React.useRef<(SVGGElement | null)[]>([])
  const dotRef = React.useRef<SVGRectElement>(null)
  const dotShadowRef = React.useRef<SVGRectElement>(null)
  const barRefs = React.useRef<(SVGRectElement | null)[]>([])
  const phaseRef = React.useRef<HTMLSpanElement>(null)
  const countRef = React.useRef<HTMLSpanElement>(null)

  const [spray, setSpray] = React.useState(0)
  const [holding, setHolding] = React.useState(false)

  const layout = React.useMemo(() => layoutWord(word), [word])
  const paths = React.useMemo(() => layout.glyphs.map((g) => glyphPath(g.ch)), [layout])
  const bars = React.useMemo(() => barcode(code || word + "-" + seed, L.bar[2]), [code, word, seed, L.bar])
  const splatCount = splats ?? (variant === "paper" ? 5 : 0)
  const marks = React.useMemo(() => makeSplats(seed + spray, splatCount, variant), [seed, spray, splatCount, variant])

  // Everything the frame loop reads, kept current without restarting it.
  const live = React.useRef({ rhythm, phases, breathe, tilt, onBreath, n: layout.glyphs.length, dot, bars: bars.length, pal })
  live.current = { rhythm, phases, breathe, tilt, onBreath, n: layout.glyphs.length, dot, bars: bars.length, pal }

  const input = React.useRef({
    holding: false,
    downAt: 0,
    downX: 0,
    downY: 0,
    tx: 0,
    ty: 0,
    hover: false,
  })

  // --- the plate ------------------------------------------------------------
  React.useEffect(() => {
    const canvas = artRef.current
    if (!canvas) return
    let raf = 0
    let lastW = 0
    const paint = () => {
      raf = 0
      const w = canvas.clientWidth
      if (!w || Math.abs(w - lastW) < 1) return
      lastW = w
      drawPlate(canvas, variant, seed, pal)
    }
    const observer = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(paint)
    })
    observer.observe(canvas)
    paint()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
    // pal is rebuilt every render; its colours are what the plate depends on.
  }, [variant, seed, pal.accent, pal.ink, pal.ground])

  // --- breath and tilt ------------------------------------------------------
  React.useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    let reduced = mq.matches
    const onMq = () => {
      reduced = mq.matches
    }
    mq.addEventListener("change", onMq)

    let raf = 0
    let last = performance.now()
    let t0 = last
    let manual = false
    let value = 0
    let cycle = 0
    let count = 0
    let lit = -1
    let label = ""
    let vx = 0
    let vy = 0
    let written = -1
    let unit = card.clientWidth / VIEW_W
    let visible = true

    const observer = new ResizeObserver(() => {
      unit = card.clientWidth / VIEW_W
    })
    observer.observe(card)

    const io = new IntersectionObserver((entries) => {
      visible = entries[0] ? entries[0].isIntersecting : true
      if (visible && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    })
    io.observe(card)

    const completed = () => {
      count++
      if (countRef.current) countRef.current.textContent = "Nº " + String(count).padStart(3, "0")
      const cb = live.current.onBreath
      if (cb) cb(count)
    }

    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const cfg = live.current
      const inp = input.current
      let phase = 3
      let left = 0

      if (inp.holding && !manual) manual = true
      if (manual) {
        if (inp.holding) {
          value = Math.min(1, value + dt / Math.max(0.5, cfg.rhythm[0]))
          phase = value >= 1 ? 1 : 0
          left = (1 - value) * cfg.rhythm[0]
        } else {
          value = Math.max(0, value - dt / Math.max(0.5, cfg.rhythm[2]))
          phase = 2
          left = value * cfg.rhythm[2]
          if (value <= 0) {
            manual = false
            t0 = now
            cycle = 0
            completed()
          }
        }
      } else if (cfg.breathe && !reduced) {
        const b = breathAt((now - t0) / 1000, cfg.rhythm)
        if (b.index > cycle) {
          cycle = b.index
          completed()
        }
        value = b.value
        phase = b.phase
        left = b.left
      } else {
        value = 0
        t0 = now
      }
      const shown = manual ? easeSine(value) : value

      // Letters inhale left to right from the baseline.
      if (Math.abs(shown - written) > 1e-4) {
        written = shown
        const n = cfg.n
        let dotScale = 1
        for (let i = 0; i < n; i++) {
          const s = 1 + AMP * easeSine(letterBreath(shown, i, n, STAGGER))
          const tr = "translate(0 100) scale(1 " + s.toFixed(4) + ") translate(0 -100)"
          const el = letterRefs.current[i]
          if (el) el.setAttribute("transform", tr)
          const sh = shadowRefs.current[i]
          if (sh) sh.setAttribute("transform", tr)
          if (i === cfg.dot) dotScale = s
        }
        const dy = String(100 - 100 * dotScale - DOT_GAP - DOT)
        if (dotRef.current) dotRef.current.setAttribute("y", dy)
        if (dotShadowRef.current) dotShadowRef.current.setAttribute("y", dy)
        // The barcode doubles as the breath meter.
        const on = Math.round(shown * cfg.bars)
        if (on !== lit) {
          lit = on
          for (let i = 0; i < barRefs.current.length; i++) {
            const bar = barRefs.current[i]
            if (bar) bar.setAttribute("fill", i < on ? cfg.pal.accent : "currentColor")
          }
        }
      }
      const text =
        !manual && (!cfg.breathe || reduced)
          ? "Hold to breathe"
          : cfg.phases[phase] + " · " + Math.max(1, Math.ceil(left - 1e-3))
      if (text !== label && phaseRef.current) {
        label = text
        phaseRef.current.textContent = text
      }

      // Tilt, parallax and glare ease toward the pointer.
      const k = Math.min(1, dt * 7)
      vx += ((inp.hover ? inp.tx : 0) - vx) * k
      vy += ((inp.hover ? inp.ty : 0) - vy) * k
      const press = inp.holding ? 0.985 : 1
      card.style.transform =
        "rotateX(" + (-vy * cfg.tilt).toFixed(3) + "deg) rotateY(" + (vx * cfg.tilt).toFixed(3) + "deg) scale(" + press + ")"
      const art = artRef.current
      if (art) {
        art.style.transform =
          "translate3d(" + (-vx * 12 * unit).toFixed(2) + "px," + (-vy * 8 * unit).toFixed(2) + "px,0) scale(" +
          (1.05 + 0.012 * shown).toFixed(4) + ")"
      }
      const inkEl = inkRef.current
      if (inkEl) inkEl.style.transform = "translate3d(" + (vx * 10 * unit).toFixed(2) + "px," + (vy * 7 * unit).toFixed(2) + "px,0)"
      const typeEl = typeRef.current
      if (typeEl) {
        typeEl.style.setProperty("--et-mx", (vx * 4).toFixed(3))
        typeEl.style.setProperty("--et-my", (vy * 3).toFixed(3))
        typeEl.style.transform = "translate3d(" + (vx * 3 * unit).toFixed(2) + "px," + (vy * 2 * unit).toFixed(2) + "px,0)"
      }
      const glare = glareRef.current
      if (glare) {
        glare.style.opacity = inp.hover ? "1" : "0"
        glare.style.background =
          "radial-gradient(circle at " + (50 + vx * 50).toFixed(1) + "% " + (50 + vy * 50).toFixed(1) +
          "%, rgba(255,255,255,0.32), rgba(255,255,255,0) 46%)"
      }

      const settling = Math.abs(vx) > 1e-3 || Math.abs(vy) > 1e-3 || inp.hover
      const animating = manual || (cfg.breathe && !reduced) || settling
      if (visible && animating) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // Anything that can wake a stopped loop.
    const wake = () => {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    card.addEventListener("pointerenter", wake)
    card.addEventListener("pointerdown", wake)
    card.addEventListener("keydown", wake)
    mq.addEventListener("change", wake)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      io.disconnect()
      mq.removeEventListener("change", onMq)
      mq.removeEventListener("change", wake)
      card.removeEventListener("pointerenter", wake)
      card.removeEventListener("pointerdown", wake)
      card.removeEventListener("keydown", wake)
    }
  }, [])

  // --- input ----------------------------------------------------------------
  const aim = (e: React.PointerEvent) => {
    const card = cardRef.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
    const y = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1
    input.current.tx = Math.max(-1, Math.min(1, x))
    input.current.ty = Math.max(-1, Math.min(1, y))
  }
  const begin = (x: number, y: number) => {
    const inp = input.current
    inp.holding = true
    inp.downAt = performance.now()
    inp.downX = x
    inp.downY = y
    setHolding(true)
  }
  const end = (x: number, y: number) => {
    const inp = input.current
    if (!inp.holding) return
    inp.holding = false
    setHolding(false)
    // A tap, not a breath: throw the ink again.
    const quick = performance.now() - inp.downAt < 240
    const still = Math.hypot(x - inp.downX, y - inp.downY) < 8
    if (quick && still) setSpray((s) => s + 1)
  }

  const W = layout.width || 1
  const [wx, wy, ww, wh] = L.word
  // The natural width at the box height, capped by the box: short words stay
  // condensed rather than being stretched into slabs.
  const natural = (wh * (W / 100)) / 1.28
  const boxW = Math.min(ww, natural)
  const boxX = L.align === "right" ? wx + ww - boxW : wx + (ww - boxW) / 2
  const dotGlyph = dot >= 0 && dot < layout.glyphs.length ? layout.glyphs[dot] : null
  // The word's box is stretched, so the dot is drawn pre-squeezed to land square.
  const dotW = (DOT * (wh / 100)) / (boxW / W)

  const small: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    lineHeight: 1.08,
    whiteSpace: "pre-line",
  }
  const textColor = variant === "crimson" ? pal.type : pal.ink

  const wordSvg = (fill: string, shadow: boolean) => (
    <svg
      aria-hidden="true"
      viewBox={"0 0 " + W + " 100"}
      preserveAspectRatio="none"
      className="absolute inset-0"
      style={{
        width: "100%",
        height: "100%",
        overflow: "visible",
        maxWidth: "none",
        // The red plate sits a hair off the white, and slips further as the
        // ticket tilts — misregistration, which is what makes it read as print.
        transform: shadow
          ? "translate(calc(0.3cqw - var(--et-mx, 0) * 0.25cqw), calc(0.22cqw - var(--et-my, 0) * 0.25cqw))"
          : undefined,
        mixBlendMode: shadow ? (variant === "crimson" ? "screen" : "multiply") : undefined,
        opacity: shadow ? 0.9 : 1,
      }}
    >
      {layout.glyphs.map((g, i) => (
        <g key={i} transform={"translate(" + g.x + " 0)"}>
          <g ref={(el) => ((shadow ? shadowRefs : letterRefs).current[i] = el)}>
            <path d={paths[i]} fill={fill} fillRule="nonzero" />
          </g>
        </g>
      ))}
      {dotGlyph ? (
        <rect
          ref={shadow ? dotShadowRef : dotRef}
          x={dotGlyph.x + dotGlyph.w / 2 - dotW / 2}
          y={-DOT_GAP - DOT}
          width={dotW}
          height={DOT}
          fill={fill}
        />
      ) : null}
    </svg>
  )

  return (
    <div className={"relative select-none " + className} style={{ width, perspective: "1600px" }}>
      <style>{CSS}</style>
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-pressed={holding}
        aria-label={word + ". Hold to breathe in, release to breathe out, tap to re-spray the ink."}
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
        style={{
          // pan-y keeps the page scrollable over the ticket on touch; a
          // long press still holds, and a scroll cancels it cleanly.
          touchAction: "pan-y",
          WebkitTouchCallout: "none",
          width: "100%",
          aspectRatio: VIEW_W + " / " + VIEW_H,
          containerType: "inline-size",
          cursor: holding ? "grabbing" : "pointer",
          filter: "drop-shadow(0 22px 28px rgba(0,0,0,0.45)) drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
          willChange: "transform",
          transition: "box-shadow 200ms",
          ["--tw-ring-color" as string]: pal.accent,
          ["--tw-ring-offset-color" as string]: "transparent",
        } as React.CSSProperties}
        onPointerEnter={(e) => {
          input.current.hover = true
          aim(e)
        }}
        onPointerMove={aim}
        onPointerLeave={(e) => {
          input.current.hover = false
          end(e.clientX, e.clientY)
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          input.current.hover = true
          aim(e)
          begin(e.clientX, e.clientY)
        }}
        onPointerUp={(e) => {
          end(e.clientX, e.clientY)
          if (e.pointerType !== "mouse") input.current.hover = false
        }}
        onPointerCancel={(e) => end(e.clientX, e.clientY)}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault()
            begin(0, 0)
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            end(0, 0)
          }
        }}
        onBlur={() => end(0, 0)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            WebkitMaskImage: MASK,
            maskImage: MASK,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            background: pal.ground,
          }}
        >
          {/* The plate */}
          <canvas
            ref={artRef}
            aria-hidden="true"
            className="absolute inset-0 block"
            style={{ width: "100%", height: "100%", maxWidth: "none", transform: "scale(1.05)", willChange: "transform" }}
          />

          {/* The spatter */}
          <svg
            ref={inkRef}
            aria-hidden="true"
            viewBox={"0 0 " + VIEW_W + " " + VIEW_H}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0"
            style={{ width: "100%", height: "100%", maxWidth: "none", overflow: "visible", mixBlendMode: variant === "paper" ? "multiply" : "normal" }}
          >
            <defs>
              <filter id={rough} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed={seed % 97} />
                <feDisplacementMap in="SourceGraphic" scale="5" />
              </filter>
            </defs>
            <g filter={"url(#" + rough + ")"} fill={pal.accent}>
              {marks.map((m, i) => (
                <g key={seed + "-" + spray + "-" + i}>
                  <path className="et-splat" d={m.body} style={{ animationDelay: i * 70 + "ms" }} />
                  <path className="et-drip" d={m.drips} style={{ animationDelay: 260 + i * 70 + "ms" }} />
                </g>
              ))}
            </g>
          </svg>

          {/* The type */}
          <div ref={typeRef} className="absolute inset-0" style={{ color: textColor }}>
            <div
              className="absolute"
              style={{ ...small, left: px(L.tag[0]), top: py(L.tag[1]), fontSize: cq(8.5) }}
            >
              {tagline}
            </div>

            <div
              className="absolute"
              style={{ left: px(L.bar[0]), top: py(L.bar[1]), width: px(L.bar[2]) }}
            >
              <svg
                aria-hidden="true"
                viewBox={"0 0 " + L.bar[2] + " " + L.bar[3]}
                preserveAspectRatio="none"
                className="block"
                style={{ width: "100%", height: "auto", aspectRatio: L.bar[2] + " / " + L.bar[3], maxWidth: "none" }}
              >
                {bars.map((b, i) => (
                  <rect
                    key={i}
                    ref={(el) => (barRefs.current[i] = el)}
                    x={b.x}
                    y={0}
                    width={b.w}
                    height={L.bar[3]}
                    fill="currentColor"
                  />
                ))}
              </svg>
              <div
                className="flex justify-between"
                style={{ ...small, fontSize: cq(5.6), marginTop: cq(3), letterSpacing: "0.12em" }}
              >
                <span ref={phaseRef} aria-live="off">
                  {phases[0]}
                </span>
                <span ref={countRef}>{"Nº 000"}</span>
              </div>
            </div>

            <div
              className="absolute"
              style={{ ...small, left: px(L.quote[0]), top: py(L.quote[1]), fontSize: cq(7.5) }}
            >
              {quote}
            </div>

            {notes ? (
              <div
                className="absolute"
                style={{
                  ...small,
                  left: px(L.notes[0]),
                  top: py(L.notes[1]),
                  fontSize: cq(5.2),
                  fontWeight: 600,
                  opacity: 0.85,
                  maxWidth: px(variant === "crimson" ? 150 : 108),
                }}
              >
                {notes}
              </div>
            ) : null}

            <div
              className="absolute"
              style={{ left: px(boxX), top: py(wy), width: px(boxW), height: py(wh) }}
            >
              {variant === "crimson" ? wordSvg(pal.accent, true) : null}
              {wordSvg(variant === "crimson" ? pal.type : pal.ink, false)}
              <span className="sr-only">{word}</span>
            </div>

            <p
              className="absolute m-0"
              style={{
                ...small,
                whiteSpace: "normal",
                left: px(L.body[0]),
                top: py(L.body[1]),
                width: px(L.body[2]),
                fontSize: cq(7),
                fontWeight: 600,
                lineHeight: 1.22,
                textAlign: "justify",
                textAlignLast: "center",
              }}
            >
              {body}
            </p>
          </div>

          {/* Glare */}
          <div
            ref={glareRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0,
              transition: "opacity 300ms",
              mixBlendMode: variant === "crimson" ? "soft-light" : "overlay",
            }}
          />
        </div>

        {/* The die-cut edge and its printed frame */}
        <svg
          aria-hidden="true"
          viewBox={"0 0 " + VIEW_W + " " + VIEW_H}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0"
          style={{ width: "100%", height: "100%", maxWidth: "none", overflow: "visible" }}
        >
          {variant === "crimson" ? (
            <>
              <path d={ticketPath(VIEW_W, VIEW_H, TICKET_R, 9)} fill="none" stroke={pal.accent} strokeWidth={3.2} />
              <path d={ticketPath(VIEW_W, VIEW_H, TICKET_R, 17)} fill="none" stroke={pal.accent} strokeWidth={0.9} />
            </>
          ) : (
            <>
              <path d={ticketPath(VIEW_W, VIEW_H, TICKET_R, 7)} fill="none" stroke={pal.ink} strokeWidth={1.4} />
              <path d={ticketPath(VIEW_W, VIEW_H, TICKET_R, 12)} fill="none" stroke={pal.ink} strokeWidth={0.5} />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
