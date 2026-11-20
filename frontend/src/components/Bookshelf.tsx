import { memo, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import { BOOK_DRAG_TYPE, spineCloths, spineFor } from '../library'
import { burst, centerOf, flySprite, replayClass, type Point } from '../pixel/effects'
import { miniBook } from '../pixel/sprites'
import type { LiteratureDocument } from '../types'

/** One-shot events the shelf turns into animation. `key` grows with every event. */
export interface ShelfSignal {
  key: number
  at: number
  kind: 'incoming' | 'landed' | 'ready' | 'failed'
  documentId?: string
  /** Where an incoming book starts its flight, in viewport coordinates. */
  origin?: Point | null
}

interface BookshelfProps {
  documents: LiteratureDocument[]
  /** Documents matching the current search; null when not searching. */
  matches: ReadonlySet<string> | null
  selectedId: string | null
  /** Citation numbers of the current answer, by document. */
  flags: ReadonlyMap<string, number[]>
  /** True while evidence is being retrieved. */
  scanning: boolean
  /** Shows a placeholder for a book that is still uploading. */
  ghost: boolean
  signal: ShelfSignal | null
  canAdd: boolean
  addDisabled: boolean
  addHint: string
  onSelect(documentId: string | null): void
  onAdd(origin: Point): void
}

const statusLabel = { PENDING: '等待处理', PROCESSING: '正在索引', READY: '可检索', FAILED: '处理失败' } as const
const SIGNAL_TTL_MS = 6000
let handledSignal = 0

/** Flies an incoming book to `target`, once per signal. Shared by the shelf and the list view. */
export function receiveIncoming(signal: ShelfSignal | null, target: Element | null) {
  if (!signal || signal.kind !== 'incoming' || signal.key <= handledSignal) return
  handledSignal = signal.key
  if (!target || Date.now() - signal.at > SIGNAL_TTL_MS) return
  const to = centerOf(target)
  void flySprite({ sprite: miniBook, from: signal.origin ?? { x: to.x, y: to.y - 180 }, to, scale: 4, lift: 110, spin: 360, duration: 680 })
    .then(() => burst(to, { colors: ['#d9a441', '#fff6cf', '#f3e6c8'], count: 8, spread: 22 }))
}

export const Bookshelf = memo(function Bookshelf({ documents, matches, selectedId, flags, scanning, ghost, signal, canAdd, addDisabled, addHint, onSelect, onAdd }: BookshelfProps) {
  const shelfRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLSpanElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const lastSeen = useRef(new Map<string, Point>())

  // A book that left the shelf since the last render goes up in a puff of dust.
  useLayoutEffect(() => {
    const shelf = shelfRef.current
    if (!shelf) return
    const current = new Map<string, Point>()
    shelf.querySelectorAll<HTMLElement>('.book[data-id]').forEach((book) => current.set(book.dataset.id!, centerOf(book)))
    for (const [id, point] of lastSeen.current) {
      if (!current.has(id)) burst(point, { colors: ['#b9b6a3', '#dcd8c4', '#8f8d7c'], count: 12, spread: 30, gravity: -8 })
    }
    lastSeen.current = current
  }, [documents])

  useEffect(() => {
    if (!signal || signal.key <= handledSignal) return
    if (Date.now() - signal.at > SIGNAL_TTL_MS) { handledSignal = signal.key; return }
    const shelf = shelfRef.current
    if (!shelf) return
    if (signal.kind === 'incoming') { receiveIncoming(signal, ghostRef.current ?? addRef.current); return }
    const book = signal.documentId ? shelf.querySelector<HTMLElement>(`.book[data-id="${CSS.escape(signal.documentId)}"]`) : null
    if (!book) return // The document list has not caught up yet; retry on the next render.
    handledSignal = signal.key
    if (signal.kind === 'landed') {
      replayClass(book, 'book-landing', 600)
      const rect = book.getBoundingClientRect()
      window.setTimeout(() => burst({ x: rect.left + rect.width / 2, y: rect.bottom }, { colors: ['#cbb892', '#e6dcc0', '#a8936a'], count: 8, spread: 26, gravity: -6 }), 300)
    } else if (signal.kind === 'ready') {
      replayClass(book, 'book-cheer', 900)
      const rect = book.getBoundingClientRect()
      burst({ x: rect.left + rect.width / 2, y: rect.top }, { colors: ['#d9a441', '#fff6cf', '#ad513c', '#7a9a84'], count: 14, spread: 46 })
    } else {
      replayClass(book, 'book-shake', 600)
    }
  }, [signal, documents])

  return (
    <div className="shelf" ref={shelfRef} data-scanning={scanning ? '' : undefined} role="group" aria-label="书架">
      {ghost && <span className="book-slot"><span ref={ghostRef} className="book book-ghost" aria-hidden="true" /></span>}
      {documents.map((document, index) => {
        const spine = spineFor(document)
        const cloth = spineCloths[spine.cloth]
        const numbers = flags.get(document.id)
        const status = document.status === 'PENDING' ? 'processing' : document.status.toLowerCase()
        const style = {
          width: spine.width, height: spine.height,
          '--cover': cloth.cover, '--cover-light': cloth.light, '--cover-dark': cloth.dark, '--cover-ink': cloth.ink,
        } as CSSProperties
        return (
          <span className="book-slot" key={document.id} style={{ '--i': index } as CSSProperties}>
            <button
              type="button"
              className="book"
              data-id={document.id}
              data-status={status}
              data-pattern={spine.pattern}
              data-wide={spine.width >= 38 ? '' : undefined}
              data-dim={matches && !matches.has(document.id) ? '' : undefined}
              data-cited={numbers ? '' : undefined}
              aria-pressed={selectedId === document.id}
              aria-label={`《${document.title}》· ${statusLabel[document.status]}${numbers ? ` · 本次回答引用 ${numbers.map((number) => `[${number}]`).join('')}` : ''}`}
              title={document.title}
              style={style}
              draggable={document.status === 'READY'}
              onDragStart={(event) => {
                event.dataTransfer.setData(BOOK_DRAG_TYPE, document.id)
                event.dataTransfer.setData('text/plain', document.title)
                event.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => onSelect(selectedId === document.id ? null : document.id)}
            >
              {numbers && <span className="book-flag" aria-hidden="true">{numbers.join('·')}</span>}
              {document.status === 'FAILED' && <span className="book-flag book-flag-failed" aria-hidden="true">!</span>}
              <span className="book-title" aria-hidden="true">{document.title}</span>
            </button>
          </span>
        )
      })}
      {canAdd && (
        <span className="book-slot">
          <button ref={addRef} type="button" className="book book-add" disabled={addDisabled} aria-label="添加 PDF 文献" title={addHint} onClick={(event) => onAdd(centerOf(event.currentTarget))}>
            <Plus aria-hidden="true" />
          </button>
        </span>
      )}
    </div>
  )
})
