import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerMarkdown, excerptsMarkdown, readShelf, shelfKey } from './research'
import type { AnswerRun, Citation } from './types'

const citation: Citation = { citationNumber: 7, passageId: 'passage-7', documentId: 'document-1', documentTitle: 'Study of retrieval', pageStart: 3, pageEnd: 5, excerpt: 'First line.\nSecond line.', score: 0.81 }
afterEach(() => vi.unstubAllGlobals())

describe('research excerpts', () => {
  it('keeps separate shelves for different users and knowledge spaces', () => {
    const values = new Map([[shelfKey('alice', 'space-a'), JSON.stringify([citation])]])
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null })
    expect(readShelf(shelfKey('alice', 'space-a'))).toEqual([citation])
    expect(readShelf(shelfKey('bob', 'space-a'))).toEqual([])
    expect(readShelf(shelfKey('alice', 'space-b'))).toEqual([])
  })

  it('recovers from unavailable or corrupt browser storage', () => {
    const getItem = vi.fn().mockReturnValueOnce('{broken').mockReturnValueOnce('{}').mockReturnValueOnce(JSON.stringify([citation, null, { passageId: 'incomplete' }])).mockImplementationOnce(() => { throw new Error('storage blocked') })
    vi.stubGlobal('localStorage', { getItem })
    expect(readShelf('shelf')).toEqual([])
    expect(readShelf('shelf')).toEqual([])
    expect(readShelf('shelf')).toEqual([citation])
    expect(readShelf('shelf')).toEqual([])
  })

  it('preserves answer citation numbers and page ranges in an exported answer', () => {
    const answer: AnswerRun = { phase: 'complete', question: 'What is supported?', text: 'This claim is supported [7].', citations: [citation], metrics: null, refusal: null, error: null }
    const exported = answerMarkdown(answer)
    expect(exported).toContain('This claim is supported [7].')
    expect(exported).toContain('[7] Study of retrieval · p. 3–5')
    expect(exported).toContain('> First line.\n> Second line.')
  })

  it('exports collected excerpts with independent numbering and original provenance', () => {
    const exported = excerptsMarkdown('Research notes', [citation, { ...citation, passageId: 'passage-8', pageStart: 9, pageEnd: 9 }])
    expect(exported).toContain('## 1. Study of retrieval')
    expect(exported).toContain('## 2. Study of retrieval')
    expect(exported).toContain('p. 9\n')
    expect(exported).not.toContain('p. 9–9')
  })
})
