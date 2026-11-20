import type { Citation, LiteratureDocument } from './types'

/** Cloth colours for book spines. Muted so the shelf sits inside the paper-and-ink palette. */
export const spineCloths = [
  { cover: '#4f7260', light: '#7a9a84', dark: '#35523f', ink: '#f6f2e0' },
  { cover: '#a8533f', light: '#cc7f66', dark: '#7c3a2b', ink: '#fbf1e2' },
  { cover: '#c79a3f', light: '#e2bd6c', dark: '#96702a', ink: '#33301c' },
  { cover: '#4c6a82', light: '#7692a8', dark: '#354c60', ink: '#f1f4ee' },
  { cover: '#7a5a78', light: '#a184a0', dark: '#573f56', ink: '#f8eff3' },
  { cover: '#8a9a5b', light: '#aebb84', dark: '#66743f', ink: '#262d18' },
  { cover: '#b9714a', light: '#d69a76', dark: '#8a5133', ink: '#fdf3e4' },
  { cover: '#5f8f8b', light: '#8cb3ae', dark: '#436a66', ink: '#f2f7f1' },
] as const

export const spinePatterns = ['bands', 'label', 'stripe', 'plain'] as const
export type SpinePattern = (typeof spinePatterns)[number]

export interface Spine {
  cloth: number
  pattern: SpinePattern
  /** Thickness in CSS pixels; follows the page count. */
  width: number
  /** Height in CSS pixels; varies per document so the shelf looks hand-filled. */
  height: number
}

/** FNV-1a. Stable across sessions so a document always gets the same book. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const heights = [104, 112, 120, 128, 136] as const

export function clothFor(documentId: string) {
  return spineCloths[hashString(documentId) % spineCloths.length]
}

export function spineFor(document: Pick<LiteratureDocument, 'id' | 'pageCount'>): Spine {
  const hash = hashString(document.id)
  const pages = Math.min(60, Math.max(4, document.pageCount ?? 14))
  return {
    cloth: hash % spineCloths.length,
    pattern: spinePatterns[(hash >>> 8) % spinePatterns.length],
    width: 24 + Math.round(((pages - 4) / 56) * 9) * 2,
    height: heights[(hash >>> 16) % heights.length],
  }
}

/** Dragging a book onto the composer carries its document id under this type. */
export const BOOK_DRAG_TYPE = 'application/x-litevidence-document'

/** The question a reader starts from when asking about one document. */
export function documentQuestion(title: string) {
  return `请概括《${title}》的研究问题、方法和主要结论，并给出原文依据。`
}

/** Citation numbers grouped by the document they point at, in ascending order. */
export function citationFlags(citations: readonly Citation[]): Map<string, number[]> {
  const flags = new Map<string, number[]>()
  for (const citation of citations) {
    const numbers = flags.get(citation.documentId) ?? []
    if (!numbers.includes(citation.citationNumber)) numbers.push(citation.citationNumber)
    flags.set(citation.documentId, numbers)
  }
  for (const numbers of flags.values()) numbers.sort((a, b) => a - b)
  return flags
}

/** The desk plant grows as the knowledge space collects conversations. */
export function plantStage(conversationCount: number): 0 | 1 | 2 | 3 {
  if (conversationCount >= 6) return 3
  if (conversationCount >= 3) return 2
  if (conversationCount >= 1) return 1
  return 0
}
