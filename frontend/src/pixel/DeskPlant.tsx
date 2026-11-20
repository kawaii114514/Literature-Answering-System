import { useState } from 'react'
import { burst, replayClass } from './effects'
import { PixelSprite } from './PixelSprite'
import { plantStages } from './sprites'
import { plantStage } from '../library'

/** A desk plant that grows with the conversations in the space. Click to water it. */
export function DeskPlant({ conversations }: { conversations: number }) {
  const [watered, setWatered] = useState(0)
  const stage = plantStage(conversations)
  const next = [1, 3, 6][stage] as number | undefined

  function water(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    burst({ x: rect.left + rect.width / 2, y: rect.top + 6 }, { colors: ['#6fa6b3', '#d6ecef', '#9cc5cf'], count: 7, spread: 18, size: 3, gravity: 26 })
    replayClass(element, 'plant-wiggle', 600)
    setWatered((value) => value + 1)
  }

  return (
    <div className="desk-plant">
      <button
        type="button"
        className="plant-button"
        onClick={(event) => water(event.currentTarget)}
        aria-label={`案头绿植：这个空间已有 ${conversations} 个会话。点一下浇水`}
        title={next ? `${conversations} 个会话 · 满 ${next} 个再长大一点` : `${conversations} 个会话 · 开花了`}
      >
        <PixelSprite sprite={plantStages[stage]} scale={4} />
      </button>
      <span className="plant-pips px-text" aria-hidden="true">
        {[0, 1, 2, 3].map((pip) => <i key={pip} data-on={pip <= stage ? '' : undefined} />)}
        {watered > 0 && <b>+{watered}</b>}
      </span>
    </div>
  )
}
