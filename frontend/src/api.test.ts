import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseSseText, streamAnswer } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('parseSseText', () => {
  it('parses citations, token, metrics and done events', () => {
    const events = parseSseText([
      'event:citations\r\ndata:[{"citationNumber":1}]',
      'event:token\r\ndata:{"text":" Evidence-based answer [1]."}',
      'event:metrics\r\ndata:{"retrievalDurationMs":42,"totalTokens":128}',
      'event:done\r\ndata:complete',
      '',
    ].join('\r\n\r\n'))

    expect(events).toEqual([
      { event: 'citations', data: '[{"citationNumber":1}]' },
      { event: 'token', data: '{"text":" Evidence-based answer [1]."}' },
      { event: 'metrics', data: '{"retrievalDurationMs":42,"totalTokens":128}' },
      { event: 'done', data: 'complete' },
    ])
  })

  it('joins multi-line SSE data fields', () => {
    expect(parseSseText('event:token\ndata:first line\ndata:second line\n\n')).toEqual([
      { event: 'token', data: 'first line\nsecond line' },
    ])
  })

  it('preserves whitespace from JSON token chunks while streaming', async () => {
    const body = [
      'event:citations\ndata:[]',
      'event:token\ndata:{"text":"Evidence"}',
      'event:token\ndata:{"text":" based"}',
      'event:done\ndata:complete',
      '',
    ].join('\n\n')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })))
    const chunks: string[] = []

    await streamAnswer('test-token', 'space-id', 'question', 'HYBRID_RRF', {
      onCitations: () => undefined,
      onToken: (token) => chunks.push(token),
      onMetrics: () => undefined,
      onRefusal: () => undefined,
      onDone: () => undefined,
    })

    expect(chunks.join('')).toBe('Evidence based')
  })
})
