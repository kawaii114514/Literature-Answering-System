import { PixelSprite } from '../pixel/PixelSprite'
import { owlSprite } from '../pixel/Owl'
import { useDemoPolicy } from './DemoPolicy'

/** Covers the window while a file is dragged over it. Purely visual: the window handles the drop. */
export function DropOverlay({ verdict }: { verdict: string | null }) {
  const demo = useDemoPolicy()
  return (
    <div className="drop-overlay" data-blocked={verdict ? '' : undefined} aria-hidden="true">
      <div className="drop-card px-box">
        <PixelSprite sprite={owlSprite(verdict ? 'dizzy' : 'happy')} scale={6} className="drop-owl" />
        <strong>{verdict ?? '松手，上架'}</strong>
        {!verdict && <small>PDF · ≤ {Math.floor(demo.maxFileSizeBytes / (1024 * 1024))} MiB · ≤ {demo.maxPages} 页</small>}
      </div>
    </div>
  )
}
