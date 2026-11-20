import { useEffect, useMemo, useRef, useState } from 'react'
import { PixelSprite } from './PixelSprite'
import { owl, owlEyes, type OwlEyes, type Sprite } from './sprites'
import { motionEnabled } from './effects'

export type OwlMood = 'idle' | 'searching' | 'writing' | 'happy' | 'sad' | 'excited' | 'shy' | 'sleepy'

interface OwlProps {
  mood?: OwlMood
  scale?: number
  /** Short lines the owl says when clicked; it cycles through them. */
  tips?: readonly string[]
  /** A line to say right away, e.g. after an event. Changing `sayKey` repeats it. */
  say?: string | null
  sayKey?: number
  label?: string
  className?: string
  bubbleSide?: 'left' | 'right'
}

const moodEyes: Record<Exclude<OwlMood, 'idle' | 'searching'>, OwlEyes> = {
  writing: 'down', happy: 'happy', sad: 'dizzy', excited: 'happy', shy: 'covered', sleepy: 'closed',
}

export function owlSprite(eyes: OwlEyes): Sprite {
  return { palette: owl.palette, rows: [...owl.rows.slice(0, 4), ...owlEyes[eyes].rows, ...owl.rows.slice(9)] }
}

/** 咕咕, the librarian. It watches the pointer, blinks, and mirrors what the app is doing. */
export function Owl({ mood = 'idle', scale = 3, tips = [], say = null, sayKey = 0, label = '咕咕', className, bubbleSide = 'left' }: OwlProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [gaze, setGaze] = useState<OwlEyes>('open')
  const [blinking, setBlinking] = useState(false)
  const [reading, setReading] = useState<OwlEyes>('left')
  const [bubble, setBubble] = useState<string | null>(null)
  const [hop, setHop] = useState(0)
  const tipIndex = useRef(0)

  useEffect(() => {
    if (mood !== 'idle') return
    let frame = 0
    const follow = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = ref.current?.getBoundingClientRect()
        if (!rect) return
        const dx = event.clientX - (rect.left + rect.width / 2)
        const dy = event.clientY - (rect.top + rect.height / 2)
        setGaze(Math.abs(dx) < 70 ? (dy > 50 ? 'down' : 'open') : dx < 0 ? 'left' : 'right')
      })
    }
    window.addEventListener('pointermove', follow, { passive: true })
    return () => { window.removeEventListener('pointermove', follow); cancelAnimationFrame(frame) }
  }, [mood])

  useEffect(() => {
    if (mood !== 'idle') return
    let open = 0
    let close = 0
    const schedule = () => {
      open = window.setTimeout(() => {
        if (motionEnabled()) setBlinking(true)
        close = window.setTimeout(() => { setBlinking(false); schedule() }, 150)
      }, 2600 + Math.random() * 3600)
    }
    schedule()
    return () => { window.clearTimeout(open); window.clearTimeout(close); setBlinking(false) }
  }, [mood])

  useEffect(() => {
    if (mood !== 'searching') return
    const timer = window.setInterval(() => { if (motionEnabled()) setReading((eyes) => (eyes === 'left' ? 'right' : 'left')) }, 380)
    return () => window.clearInterval(timer)
  }, [mood])

  useEffect(() => {
    if (!say) return
    setBubble(say)
    const timer = window.setTimeout(() => setBubble(null), 4200)
    return () => window.clearTimeout(timer)
  }, [say, sayKey])

  useEffect(() => {
    if (!bubble) return
    const timer = window.setTimeout(() => setBubble(null), 5200)
    return () => window.clearTimeout(timer)
  }, [bubble])

  const eyes: OwlEyes = mood === 'idle' ? (blinking ? 'closed' : gaze) : mood === 'searching' ? reading : moodEyes[mood]
  const sprite = useMemo(() => owlSprite(eyes), [eyes])

  function poke() {
    setHop((value) => value + 1)
    if (tips.length === 0) return
    setBubble(tips[tipIndex.current % tips.length])
    tipIndex.current += 1
  }

  return (
    <span className={`owl ${className ?? ''}`} data-mood={mood} data-bubble-side={bubbleSide}>
      {bubble && <span className="owl-bubble" role="status">{bubble}</span>}
      <button ref={ref} type="button" className="owl-button" onClick={poke} aria-label={tips.length ? `${label}：点一下听个小提示` : label} title={label}>
        <span className="owl-body" key={hop} data-hop={hop > 0 ? '' : undefined}>
          <PixelSprite sprite={sprite} scale={scale} />
        </span>
        {mood === 'sleepy' && <span className="owl-zzz" aria-hidden="true">z</span>}
      </button>
    </span>
  )
}
