import { describe, expect, it } from 'vitest'
import { citationFlags, clothFor, hashString, plantStage, spineCloths, spineFor, spinePatterns } from './library'
import { bookmark, glyphs, magnifier, miniBook, note, owl, owlEyes, plantStages, sparkle, spriteRuns, spriteSize, waterDrop } from './pixel/sprites'
import type { Citation } from './types'

const citation = (citationNumber: number, documentId: string): Citation => ({
  citationNumber, documentId, passageId: `p-${citationNumber}`, documentTitle: documentId, pageStart: 1, pageEnd: 1, excerpt: '', score: 1,
})

describe('book spines', () => {
  it('gives a document the same book every time', () => {
    expect(spineFor({ id: 'doc-1', pageCount: 19 })).toEqual(spineFor({ id: 'doc-1', pageCount: 19 }))
    expect(hashString('doc-1')).not.toBe(hashString('doc-2'))
  })

  it('keeps every spine inside the shelf geometry', () => {
    for (const pageCount of [null, 0, 1, 4, 19, 60, 500, 100000]) {
      for (const id of ['a', 'doc-0', '7f1c0f5e-88f1-4d3a-b7a2-0d6f3c2a9e11']) {
        const spine = spineFor({ id, pageCount })
        expect(spine.width).toBeGreaterThanOrEqual(24)
        expect(spine.width).toBeLessThanOrEqual(42)
        expect(spine.width % 2).toBe(0)
        expect(spine.height).toBeGreaterThanOrEqual(104)
        expect(spine.height).toBeLessThanOrEqual(136)
        expect(spine.cloth).toBeLessThan(spineCloths.length)
        expect(spinePatterns).toContain(spine.pattern)
      }
    }
  })

  it('uses the same cloth for a citation as for its book', () => {
    expect(clothFor('doc-3')).toBe(spineCloths[spineFor({ id: 'doc-3', pageCount: 30 }).cloth])
  })

  it('makes longer papers thicker', () => {
    expect(spineFor({ id: 'x', pageCount: 40 }).width).toBeGreaterThan(spineFor({ id: 'x', pageCount: 8 }).width)
  })
})

describe('citation flags', () => {
  it('groups citation numbers by document, sorted and without duplicates', () => {
    const flags = citationFlags([citation(3, 'b'), citation(1, 'a'), citation(2, 'b'), citation(3, 'b')])
    expect(flags.get('a')).toEqual([1])
    expect(flags.get('b')).toEqual([2, 3])
    expect(flags.has('c')).toBe(false)
  })
})

describe('desk plant', () => {
  it('grows in four stages', () => {
    expect([0, 1, 2, 3, 5, 6, 40].map(plantStage)).toEqual([0, 1, 1, 2, 2, 3, 3])
  })
})

describe('pixel sprites', () => {
  it('merges horizontal runs and skips transparent pixels', () => {
    expect(spriteRuns(['.aa.b', 'ccccc'])).toEqual([
      { x: 1, y: 0, width: 2, key: 'a' }, { x: 4, y: 0, width: 1, key: 'b' }, { x: 0, y: 1, width: 5, key: 'c' },
    ])
  })

  it('keeps every sprite rectangular and fully coloured', () => {
    for (const sprite of [owl, ...Object.values(owlEyes), ...plantStages, ...Object.values(glyphs), magnifier, sparkle, bookmark, miniBook, note, waterDrop]) {
      const { width } = spriteSize(sprite)
      for (const row of sprite.rows) expect(row).toHaveLength(width)
      for (const run of spriteRuns(sprite.rows)) expect(sprite.palette[run.key]).toBeTruthy()
    }
  })

  it('swaps eyes without changing the owl outline', () => {
    for (const eyes of Object.values(owlEyes)) {
      expect(eyes.rows).toHaveLength(5)
      for (const row of eyes.rows) { expect(row).toHaveLength(16); expect(row[0]).toBe('o'); expect(row[15]).toBe('o') }
    }
  })
})
