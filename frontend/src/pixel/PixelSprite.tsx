import { useMemo, type CSSProperties } from 'react'
import { spriteRuns, spriteSize, type Sprite } from './sprites'

interface PixelSpriteProps {
  sprite: Sprite
  /** Size of one sprite pixel in CSS pixels. */
  scale?: number
  className?: string
  style?: CSSProperties
  title?: string
}

/** Renders a text-grid sprite as crisp SVG rects. Decorative unless a title is given. */
export function PixelSprite({ sprite, scale = 3, className, style, title }: PixelSpriteProps) {
  const { width, height } = spriteSize(sprite)
  return (
    <svg
      className={className ? `px-sprite ${className}` : 'px-sprite'}
      style={style}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <SpriteLayer sprite={sprite} />
    </svg>
  )
}

/** A sprite as an SVG group, for composing several layers inside one SVG. */
export function SpriteLayer({ sprite, x = 0, y = 0, className }: { sprite: Sprite; x?: number; y?: number; className?: string }) {
  const runs = useMemo(() => spriteRuns(sprite.rows), [sprite])
  return (
    <g className={className} transform={x || y ? `translate(${x} ${y})` : undefined}>
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} fill={sprite.palette[run.key] ?? 'currentColor'} />
      ))}
    </g>
  )
}
