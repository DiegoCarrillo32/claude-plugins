// The pixel crabs: Claude Code's crab (Clawd) on a 32x20 art grid, one banner pixel drawn
// 1 art pixel wide x 2 tall, so it keeps the proportions the welcome banner gives it.
// Desktop draws them as SVG that animates itself (SMIL); the terminal as quadrant glyphs,
// the same glyphs the banner uses, repainted on a timer.

import type { CrewLook, Tier } from '../types'

export type Motion = 'walk' | 'run' | 'float' | 'still'

export type Sheet = {
  motion: Motion
  frameMs: number
  palette: Record<string, string>
  body: { x: number; y: number }[]
  frames: string[][]
}

/** An eye style; `terminal: false` marks one the terminal's 2x4 cells cannot show, drawn classic there. */
export type KitEye = { name: string; pixels: string[]; dx: number; dy: number; mirror: boolean; terminal?: boolean }

export type SpriteData = {
  tiers: Record<Tier, Sheet>
  poses: { walk: Sheet; done: Sheet; failed: Sheet; sleep: Sheet }
  kit: {
    eye: string
    glint: string
    palettes: { name: string; body: string; shade: string }[]
    eyes: KitEye[]
    textures: { name: string; pixels: number[][] }[]
    names: string[]
  }
}

export const ART_W = 32
export const ART_H = 20
const EYES: readonly [number, number][] = [
  [5, 2],
  [12, 2],
]
const BODY_W = 18

/**
 * Should an SVG ever be drawn in a sandboxed frame, a page that names no color
 * scheme gets an opaque white canvas inside a dark app. This rule makes the frame take the
 * app's scheme, so it stays transparent; as a plain image it changes nothing.
 */
export const TRANSPARENT = '<style>:root{color-scheme:light dark}html,body{margin:0;padding:0;background:transparent}</style>'

/** A composed frame: one hex color per art pixel, null where transparent. */
export type Grid = (string | null)[][]

// ------------------------------------------------------------------ identity

export const TIERS: readonly Tier[] = ['astronaut', 'detective', 'engineer', 'chef', 'racer']

export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * A new crab's look: its own color, eyes, markings, name and costume, picked from the id's hash
 * and steered away from what the crabs already on screen wear, so no two look alike.
 */
export function pickLook(data: SpriteData, id: string, taken: readonly CrewLook[]): CrewLook {
  const { palettes, eyes, textures, names } = data.kit
  const h = hash(id)
  const least = (count: number, used: (i: number) => number, seed: number) => {
    let best = seed % count
    let bestUse = Infinity
    for (let k = 0; k < count; k++) {
      const i = (seed + k) % count
      const use = used(i)
      if (use < bestUse) {
        best = i
        bestUse = use
      }
    }
    return best
  }
  const palette = least(palettes.length, i => taken.filter(t => t.palette === i).length, h)
  const eye = least(eyes.length, i => taken.filter(t => t.eye === i).length, h >>> 7)
  const texture = least(textures.length, i => taken.filter(t => t.texture === i).length, h >>> 13)
  const tier = TIERS[least(TIERS.length, i => taken.filter(t => t.tier === TIERS[i]).length, h >>> 19)]!
  const n = least(names.length, i => taken.filter(t => t.name === names[i]).length, h >>> 3)
  const base = names[n] ?? 'Clawd'
  const twins = taken.filter(t => t.name === base || t.name.startsWith(base + ' ')).length
  return { palette, eye, texture, tier, name: twins === 0 ? base : `${base} ${twins + 1}` }
}

export const lookColor = (data: SpriteData, look: CrewLook) =>
  data.kit.palettes[look.palette % data.kit.palettes.length]!

// ----------------------------------------------------------------- compose

/** One frame with the crab's own look applied: markings, eyes, then colors. */
export function compose(data: SpriteData, sheet: Sheet, index: number, look: CrewLook, restyleEyes: boolean, forTerminal = false): Grid {
  const frame = sheet.frames[index % sheet.frames.length]!
  const body = sheet.body[index % sheet.body.length] ?? { x: 7, y: 8 }
  const chars = frame.map(row => row.split(''))
  const at = (x: number, y: number) => chars[y]?.[x]
  const put = (x: number, y: number, c: string) => {
    const row = chars[y]
    if (row && x >= 0 && x < row.length) row[x] = c
  }

  const texture = data.kit.textures[look.texture % data.kit.textures.length]
  for (const [tx, ty] of texture?.pixels ?? []) {
    const x = body.x + tx!
    const y = body.y + ty!
    if (at(x, y) === 'B') put(x, y, 'S')
  }

  if (restyleEyes) {
    const picked = data.kit.eyes[look.eye % data.kit.eyes.length]
    const eye = forTerminal && picked?.terminal === false ? data.kit.eyes[0] : picked
    if (eye) {
      for (const [ex, ey] of EYES) {
        const ox = body.x + ex
        const oy = body.y + ey
        if (at(ox, oy) !== 'K') continue // a pose that hides or redraws its eyes
        put(ox, oy, 'B')
        put(ox, oy + 1, 'B')
        const mirror = eye.mirror && ex > BODY_W / 2
        // An eye style paints on the crab's own face only, never over a costume (a headband,
        // a helmet rim, a hat brim that comes down to the brow).
        const onFace = (x: number, y: number) => {
          const c = at(x, y)
          return c === 'B' || c === 'S' || c === 'K'
        }
        eye.pixels.forEach((line, j) => {
          ;[...line].forEach((c, k) => {
            if (c === '.') return
            const dx = mirror ? -(eye.dx + k) : eye.dx + k
            const x = ox + dx
            const y = oy + eye.dy + j
            if (onFace(x, y)) put(x, y, c)
          })
        })
      }
    }
  }

  const colors = lookColor(data, look)
  const map: Record<string, string> = {
    ...sheet.palette,
    B: colors.body,
    S: colors.shade,
    K: data.kit.eye,
    W: sheet.palette.W ?? data.kit.glint,
  }
  return chars.map(row => row.map(c => (c === '.' ? null : (map[c] ?? null))))
}

/** Mixes a color toward white by f (0..1). */
export function tint(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * f)
  return `#${((1 << 24) | (mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)).toString(16).slice(1)}`
}

/** Desaturated, lighter: a crab that has not started yet. */
function ghost(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const grey = Math.round(0.3 * r + 0.59 * g + 0.11 * b)
  const mix = (c: number) => Math.round(c * 0.35 + grey * 0.4 + 160 * 0.25)
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`
}

// --------------------------------------------------------------------- SVG

function runs(grid: Grid, keep: (x: number, y: number) => boolean): Map<string, string> {
  const paths = new Map<string, string>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      if (c === null || c === undefined || !keep(x, y)) {
        x++
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === c && keep(x + w, y)) w++
      paths.set(c, (paths.get(c) ?? '') + `M${x} ${y}h${w}v1h-${w}z`)
      x += w
    }
  })
  return paths
}

const pathTags = (paths: Map<string, string>) =>
  [...paths].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')

export type SvgOptions = {
  /** Width of the crab's lane in art pixels; the crab walks across it when it moves. */
  lane: number
  /** CSS pixels per art pixel. */
  scale: number
  restyleEyes: boolean
  /** Walk/run/float across the lane, turning at the ends; false keeps it in place. */
  moving: boolean
  /** Seconds into the loop to start at, so crabs side by side are not in lockstep. */
  offset: number
  /**
   * The wall clock (ms) at drawing time. The animation starts where it stands at that moment,
   * so an image the surface recreates (a redraw, a scroll) carries on instead of starting over.
   */
  clock?: number
  ghost?: boolean
  /** Crop to rows [top, top + rows) of the art grid. */
  top?: number
  rows?: number
  /** Crop to columns [left, left + cols) of the lane. */
  left?: number
  cols?: number
  /** Draw the dashed ground line under the lane. */
  ground?: boolean
  /** Hold the first frame: no animation at all. */
  still?: boolean
}

const SPEED: Record<Motion, number> = { walk: 9, run: 24, float: 3, still: 0 }

export function svgSprite(data: SpriteData, sheet: Sheet, look: CrewLook, o: SvgOptions): string {
  const n = o.still ? 1 : sheet.frames.length
  const grids = Array.from({ length: n }, (_, i) => {
    const g = compose(data, sheet, i, look, o.restyleEyes)
    return o.ghost ? g.map(row => row.map(c => (c ? ghost(c) : c))) : g
  })
  // Pixels that never change go in one layer; each frame carries only what differs.
  const same = (x: number, y: number) => grids.every(g => g[y]?.[x] === grids[0]![y]?.[x])
  const cycle = n * sheet.frameMs
  const at = (o.clock ?? 0) / 1000 + o.offset
  const phase = (seconds: number) => `${(-(at % seconds)).toFixed(3)}s`
  const begin = phase(cycle / 1000)
  const frames =
    n === 1
      ? ''
      : grids
          .map((g, i) => {
            const values = Array.from({ length: n }, (_, k) => (k === i ? 'inline' : 'none')).join(';')
            return `<g display="${i === 0 ? 'inline' : 'none'}"><animate attributeName="display" values="${values}" dur="${cycle}ms" begin="${begin}" calcMode="discrete" repeatCount="indefinite"/>${pathTags(runs(g, (x, y) => !same(x, y)))}</g>`
          })
          .join('')
  let crab = pathTags(runs(grids[0]!, (x, y) => n === 1 || same(x, y))) + frames

  const top = o.top ?? 0
  const rows = o.rows ?? ART_H
  const travel = Math.max(0, o.lane - ART_W)
  const speed = SPEED[sheet.motion]
  if (o.moving && !o.still && travel > 0 && speed > 0) {
    // Out to the far end one art pixel at a time, turn, and back: pixel-snapped, never blurred.
    const steps = [...Array.from({ length: travel + 1 }, (_, i) => i), ...Array.from({ length: travel - 1 }, (_, i) => travel - 1 - i)]
    const seconds = Math.round((steps.length / speed) * 1000) / 1000
    const dur = seconds.toFixed(3)
    const moveBegin = phase(seconds)
    crab =
      `<g><animateTransform attributeName="transform" type="translate" values="${steps.map(x => `${x} 0`).join(';')}" dur="${dur}s" begin="${moveBegin}" calcMode="discrete" repeatCount="indefinite"/>` +
      `<g transform="translate(${ART_W / 2} 0)"><g><animateTransform attributeName="transform" type="scale" values="1 1;-1 1" keyTimes="0;${((travel + 1) / steps.length).toFixed(4)}" dur="${dur}s" begin="${moveBegin}" calcMode="discrete" repeatCount="indefinite"/>` +
      `<g transform="translate(${-ART_W / 2} 0)">${crab}</g></g></g></g>`
  }

  const ground = o.ground
    ? `<path fill="#8a8a8a" fill-opacity="0.35" d="${Array.from({ length: Math.ceil(o.lane / 3) }, (_, i) => `M${i * 3} ${ART_H - 1}h2v1h-2z`).join('')}"/>`
    : ''
  const left = o.left ?? 0
  const cols = o.cols ?? o.lane
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * o.scale}" height="${rows * o.scale}" viewBox="${left} ${top} ${cols} ${rows}" shape-rendering="crispEdges">${TRANSPARENT}${ground}${crab}</svg>`
}

// ---------------------------------------------------------------- terminal

// Quadrant glyphs by mask: top-left 1, top-right 2, bottom-left 4, bottom-right 8.
const QUADS = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'
const DEFAULT = 0x01000000

const rgb = (hex: string) => parseInt(hex.slice(1), 16)
function near(a: string, b: string, c: string): string {
  const d = (x: string, y: string) => {
    const p = rgb(x)
    const q = rgb(y)
    return Math.abs((p >> 16) - (q >> 16)) + Math.abs(((p >> 8) & 255) - ((q >> 8) & 255)) + Math.abs((p & 255) - (q & 255))
  }
  return d(c, a) <= d(c, b) ? a : b
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += B64[a >> 2]! + B64[((a & 3) << 4) | ((b ?? 0) >> 4)]!
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!
    out += c === undefined ? '=' : B64[c & 63]!
  }
  return out
}

/** A grid as Raster cells: each cell 2 art px wide x 4 tall, as the banner draws Clawd. */
export function rasterCells(grid: Grid): { cells: string; columns: number; rows: number } {
  const width = grid[0]?.length ?? 0
  const columns = Math.ceil(width / 2)
  const rows = Math.ceil(grid.length / 4)
  const words = new Uint32Array(columns * rows * 3)
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < columns; cx++) {
      const quads: (string | null)[] = []
      for (let qy = 0; qy < 2; qy++) {
        for (let qx = 0; qx < 2; qx++) {
          const x = cx * 2 + qx
          const y = cy * 4 + qy * 2
          quads.push(grid[y]?.[x] ?? grid[y + 1]?.[x] ?? null)
        }
      }
      const counts = new Map<string | null, number>()
      for (const q of quads) counts.set(q, (counts.get(q) ?? 0) + 1)
      const ranked = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!)
      const colored = ranked.filter((c): c is string => c !== null)
      let fg = colored[0] ?? null
      let bg = ranked.find(c => c !== fg) ?? null
      if (fg === null) {
        fg = null
        bg = null
      }
      const pick = (q: string | null) => {
        if (q === fg || q === bg) return q
        if (q === null) return bg === null ? null : fg
        return bg === null ? fg : near(fg!, bg, q)
      }
      let mask = 0
      quads.forEach((q, i) => {
        if (fg !== null && pick(q) === fg) mask |= 1 << i
      })
      const at = (cy * columns + cx) * 3
      words[at] = QUADS.codePointAt(mask)!
      words[at + 1] = fg === null ? DEFAULT : rgb(fg)
      words[at + 2] = bg === null ? DEFAULT : rgb(bg)
    }
  }
  return { cells: base64(new Uint8Array(words.buffer)), columns, rows }
}

/** Where a moving crab stands at time t (ms): art-pixel x, and whether it faces back. */
export function lanePosition(motion: Motion, lane: number, t: number, offset: number): { x: number; flipped: boolean } {
  const travel = Math.max(0, lane - ART_W)
  const speed = SPEED[motion]
  if (travel === 0 || speed === 0) return { x: 0, flipped: false }
  const span = 2 * travel
  const step = Math.floor(((t / 1000 + offset) * speed) % span)
  return step <= travel ? { x: step, flipped: false } : { x: span - step, flipped: true }
}

/** One terminal frame of a crab in its lane. */
export function laneGrid(data: SpriteData, sheet: Sheet, look: CrewLook, o: { lane: number; t: number; offset: number; moving: boolean; restyleEyes: boolean; ghost?: boolean }): Grid {
  const index = Math.floor((o.t + o.offset * 1000) / sheet.frameMs) % sheet.frames.length
  let crab = compose(data, sheet, index, look, o.restyleEyes, true)
  if (o.ghost) crab = crab.map(row => row.map(c => (c ? ghost(c) : c)))
  const { x, flipped } = o.moving ? lanePosition(sheet.motion, o.lane, o.t, o.offset) : { x: 0, flipped: false }
  if (flipped) crab = crab.map(row => [...row].reverse())
  const snapped = x - (x % 2) // whole cells, so the glyphs never tear
  return Array.from({ length: ART_H }, (_, y) =>
    Array.from({ length: o.lane }, (_, lx) => crab[y]?.[lx - snapped] ?? null),
  )
}

// ------------------------------------------------------------- bar and pile

const CLAWD = { body: '#D77757', light: '#EB9C80', shade: '#B4583C' }

/**
 * The flow's progress as a slim pixel bar: done in the crab's color with a highlight row,
 * work under way as a softer pulsing stretch after it, faint notches between tasks when they
 * fit. Without a width it stretches to whatever room it is drawn in.
 */
export function progressSvg(o: {
  done: number
  total: number
  /** Started but not done yet: drawn lighter, after the done part. */
  active?: number
  working: boolean
  /** CSS px; absent, the bar takes the full width of its slot. */
  width?: number
  /** CSS px tall. */
  height?: number
  color?: { body: string; light: string; shade: string }
  /** The wall clock (ms) at drawing time, so a recreated bar keeps its glint's place. */
  clock?: number
}): string {
  const c = o.color ?? CLAWD
  const now = (o.clock ?? 0) / 1000
  const phase = (seconds: number) => `${(-(now % seconds)).toFixed(3)}s`
  const height = o.height ?? 8
  const units = o.width ? Math.max(8, Math.round(o.width / 2)) : 240
  const h = 4
  const total = Math.max(0, o.total)
  const at = (n: number) => (total > 0 ? Math.round((Math.min(n, total) / total) * units) : 0)
  const done = at(o.done)
  const upTo = at(o.done + (o.active ?? 0))
  // The track and the bars have their outer corners cut, so the ends read rounded.
  const shape = (x0: number, x1: number) => {
    if (x1 - x0 < 1) return ''
    const l = x0 === 0 ? 1 : 0
    const r = x1 === units ? 1 : 0
    return `M${x0 + l} 0H${x1 - r}V1H${x1}V${h - 1}H${x1 - r}V${h}H${x0 + l}V${h - 1}H${x0}V1H${x0 + l}z`
  }
  let d = `<path fill="#8a8a8a" fill-opacity="0.22" d="${shape(0, units)}"/>`
  if (upTo > done) {
    d += `<path fill="${c.light}" fill-opacity="0.55" d="${shape(done, upTo)}">${o.working ? `<animate attributeName="fill-opacity" values="0.35;0.7;0.35" dur="1.6s" begin="${phase(1.6)}" repeatCount="indefinite"/>` : ''}</path>`
  }
  if (done > 0) {
    d += `<path fill="${c.body}" d="${shape(0, done)}"/><path fill="${c.light}" d="M1 0H${Math.max(1, done - (done === units ? 1 : 0))}V1H1z"/>`
  }
  if (total > 1 && units / total >= 6) {
    let notches = ''
    for (let i = 1; i < total; i++) notches += `M${at(i)} 0h0.6v${h}h-0.6z`
    d += `<path fill="#000000" fill-opacity="0.18" d="${notches}"/>`
  }
  if (o.working && done >= 6) {
    // A glint runs along the done part only; the id is stable, so redraws match.
    const id = `g${c.body.slice(1)}${done}x${units}`
    const span = done + 8
    const seconds = Math.round((span / 60) * 1000) / 1000
    d += `<clipPath id="${id}"><rect width="${done}" height="${h}"/></clipPath><rect clip-path="url(#${id})" y="0" width="3" height="1" fill="#ffffff" fill-opacity="0.5" x="-4"><animate attributeName="x" values="-4;${span}" dur="${seconds.toFixed(3)}s" begin="${phase(seconds)}" repeatCount="indefinite"/></rect>`
  }
  const width = o.width ?? 4000
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${units} ${h}" preserveAspectRatio="none" shape-rendering="crispEdges">${TRANSPARENT}${d}</svg>`
}

/** The crew as overlapping crab faces, first on top, each in its own look. */
export function pileSvg(data: SpriteData, looks: readonly CrewLook[], scale: number): string {
  const sheet = data.poses.walk
  const body = sheet.body[0] ?? { x: 7, y: 8 }
  const step = BODY_W + 2
  const width = looks.length === 0 ? 1 : step * (looks.length - 1) + BODY_W
  let out = ''
  for (let i = looks.length - 1; i >= 0; i--) {
    const grid = compose(data, sheet, 0, looks[i]!, true)
    const crop = grid.slice(body.y, body.y + 10).map(row => row.slice(body.x, body.x + BODY_W))
    out += `<g transform="translate(${i * step} 0)">${pathTags(runs(crop, () => true))}</g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${10 * scale}" viewBox="0 0 ${width} 10" shape-rendering="crispEdges">${out}</svg>`
}

/** Crop rows of a grid (the terminal band shows only the body). */
export const cropRows = (grid: Grid, top: number, rows: number): Grid => grid.slice(top, top + rows)
export const cropCols = (grid: Grid, left: number, cols: number): Grid => grid.map(row => row.slice(left, left + cols))
