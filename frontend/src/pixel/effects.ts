/**
 * Imperative, one-shot visual effects (flying sprites and pixel bursts).
 *
 * They run on a fixed overlay outside React because they are fire-and-forget and must
 * outlive the component that triggered them. Every effect is a no-op when motion is off.
 */
import { spriteRuns, spriteSize, type Sprite } from './sprites'

const MOTION_KEY = 'litevidence.motion.v1'
const SVG_NS = 'http://www.w3.org/2000/svg'

export type MotionPreference = 'on' | 'off'

export function readMotionPreference(): MotionPreference {
  try {
    const stored = localStorage.getItem(MOTION_KEY)
    if (stored === 'on' || stored === 'off') return stored
  } catch { /* Storage may be unavailable; fall back to the system setting. */ }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on'
}

export function applyMotionPreference(preference: MotionPreference, persist = false) {
  document.documentElement.dataset.motion = preference
  if (!persist) return
  try { localStorage.setItem(MOTION_KEY, preference) } catch { /* The choice still applies to this page. */ }
}

export function motionEnabled(): boolean {
  return document.documentElement.dataset.motion !== 'off'
}

export interface Point { x: number; y: number }

export function centerOf(target: Element | DOMRect): Point {
  const rect = target instanceof Element ? target.getBoundingClientRect() : target
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function layer(): HTMLElement {
  let element = document.getElementById('fx-layer')
  if (!element) {
    element = document.createElement('div')
    element.id = 'fx-layer'
    element.setAttribute('aria-hidden', 'true')
    document.body.appendChild(element)
  }
  return element
}

export function spriteElement(sprite: Sprite, scale: number): SVGSVGElement {
  const { width, height } = spriteSize(sprite)
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', String(width * scale))
  svg.setAttribute('height', String(height * scale))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('shape-rendering', 'crispEdges')
  for (const run of spriteRuns(sprite.rows)) {
    const rect = document.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('x', String(run.x))
    rect.setAttribute('y', String(run.y))
    rect.setAttribute('width', String(run.width))
    rect.setAttribute('height', '1')
    rect.setAttribute('fill', sprite.palette[run.key] ?? 'currentColor')
    svg.appendChild(rect)
  }
  return svg
}

interface FlyOptions {
  sprite: Sprite
  from: Point
  to: Point
  scale?: number
  /** Height of the arc in CSS pixels. */
  lift?: number
  duration?: number
  /** Degrees the sprite turns over the whole flight. */
  spin?: number
  /** CSS custom properties for palette entries that reference variables. */
  vars?: Record<string, string>
}

/**
 * Throws a sprite along an arc. Horizontal travel is linear and vertical travel eases
 * up and back down on a nested element, which yields a parabola without path maths.
 */
export function flySprite({ sprite, from, to, scale = 3, lift = 90, duration = 620, spin = 0, vars }: FlyOptions): Promise<void> {
  if (!motionEnabled()) return Promise.resolve()
  const size = spriteSize(sprite)
  const carrier = document.createElement('div')
  carrier.className = 'fx-flyer'
  for (const [name, value] of Object.entries(vars ?? {})) carrier.style.setProperty(name, value)
  const riser = document.createElement('div')
  const body = spriteElement(sprite, scale)
  riser.appendChild(body)
  carrier.appendChild(riser)
  layer().appendChild(carrier)

  const startX = from.x - (size.width * scale) / 2
  const startY = from.y - (size.height * scale) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const travel = carrier.animate(
    [{ transform: `translate(${startX}px, ${startY}px)` }, { transform: `translate(${startX + dx}px, ${startY + dy}px)` }],
    { duration, easing: 'cubic-bezier(.4,.1,.6,.9)', fill: 'forwards' },
  )
  riser.animate(
    [
      { transform: 'translateY(0)', easing: 'cubic-bezier(.2,.7,.4,1)' },
      { transform: `translateY(${-lift}px)`, easing: 'cubic-bezier(.6,0,.8,.3)', offset: 0.45 },
      { transform: 'translateY(0)' },
    ],
    { duration, fill: 'forwards' },
  )
  body.animate(
    [
      { transform: 'scale(.6) rotate(0deg)', opacity: 0.4 },
      { transform: `scale(1.15) rotate(${spin * 0.4}deg)`, opacity: 1, offset: 0.25 },
      { transform: `scale(1) rotate(${spin * 0.85}deg)`, opacity: 1, offset: 0.85 },
      { transform: `scale(.45) rotate(${spin}deg)`, opacity: 0.2 },
    ],
    { duration, easing: 'steps(14, end)', fill: 'forwards' },
  )
  return travel.finished.then(() => undefined, () => undefined).finally(() => carrier.remove())
}

interface BurstOptions {
  colors?: readonly string[]
  count?: number
  /** Furthest distance a particle travels, in CSS pixels. */
  spread?: number
  size?: number
  /** Positive values pull particles down as they fade; negative values let them float up. */
  gravity?: number
}

/** Scatters square particles from a point: dust, sparkles or confetti depending on colours. */
export function burst(at: Point, { colors = ['#d9a441', '#fff6cf', '#ad513c'], count = 10, spread = 34, size = 4, gravity = 14 }: BurstOptions = {}) {
  if (!motionEnabled()) return
  const host = layer()
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('i')
    particle.className = 'fx-particle'
    particle.style.width = particle.style.height = `${size}px`
    particle.style.background = colors[index % colors.length]
    host.appendChild(particle)
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.6
    const distance = spread * (0.45 + Math.random() * 0.55)
    const x = Math.round(Math.cos(angle) * distance)
    const y = Math.round(Math.sin(angle) * distance)
    particle.animate(
      [
        { transform: `translate(${at.x}px, ${at.y}px)`, opacity: 1 },
        { transform: `translate(${at.x + x}px, ${at.y + y}px)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${at.x + x}px, ${at.y + y + gravity}px)`, opacity: 0 },
      ],
      { duration: 420 + Math.random() * 260, easing: 'steps(7, end)', fill: 'forwards' },
    ).finished.then(() => particle.remove(), () => particle.remove())
  }
}

/** The first element that matches one of the selectors, in priority order, and is on screen. */
export function visibleTarget(...selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth) return element
    }
  }
  return null
}

/** Lifts a document's book off the shelf while the reader looks at one of its citations. */
export function spotlightBook(documentId: string | null) {
  document.querySelectorAll('.book[data-spotlight]').forEach((book) => book.removeAttribute('data-spotlight'))
  if (!documentId) return
  document.querySelectorAll(`.book[data-id="${CSS.escape(documentId)}"]`).forEach((book) => book.setAttribute('data-spotlight', ''))
}

/** Restarts a CSS animation that is driven by a class, e.g. a shake or a flash. */
export function replayClass(element: Element | null, className: string, duration = 700) {
  if (!element || !motionEnabled()) return
  element.classList.remove(className)
  void element.getBoundingClientRect()
  element.classList.add(className)
  window.setTimeout(() => element.classList.remove(className), duration)
}
