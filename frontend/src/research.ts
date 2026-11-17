import type { AnswerRun, Citation } from './types'

export function shelfKey(userId: string, spaceId: string) {
  return `litevidence.excerpts.v1:${userId}:${spaceId}`
}

export function readShelf(key: string): Citation[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is Citation => Boolean(item &&
      typeof item.passageId === 'string' && typeof item.documentId === 'string' &&
      typeof item.documentTitle === 'string' && typeof item.excerpt === 'string' &&
      Number.isFinite(item.citationNumber) && Number.isFinite(item.pageStart) &&
      Number.isFinite(item.pageEnd) && Number.isFinite(item.score)))
  } catch { return [] }
}

export function pageLabel(citation: Citation) {
  return `p. ${citation.pageStart}${citation.pageEnd !== citation.pageStart ? `–${citation.pageEnd}` : ''}`
}

export function excerptsMarkdown(title: string, citations: Citation[]) {
  return `# ${title}\n\n${citations.map((citation, index) =>
    `## ${index + 1}. ${citation.documentTitle}\n\n${pageLabel(citation)}\n\n> ${citation.excerpt.replace(/\n/g, '\n> ')}\n`
  ).join('\n')}\n---\n导出自 LitEvidence · 请核对原文后引用。\n`
}

export function answerMarkdown(answer: AnswerRun) {
  return `# ${answer.question}\n\n${answer.text}\n\n## 引用证据\n\n${answer.citations.map((citation) =>
    `[${citation.citationNumber}] ${citation.documentTitle} · ${pageLabel(citation)}\n\n> ${citation.excerpt.replace(/\n/g, '\n> ')}\n`
  ).join('\n')}`
}

export function downloadMarkdown(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 80) || '研究摘录'}.md`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
