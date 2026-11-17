import { useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, Bookmark, Check, Command, FilePlus2, Folder, Maximize2, MessagesSquare, Search, Trash2 } from 'lucide-react'
import type { Citation, ConversationSummary, KnowledgeSpace } from '../types'
import { downloadMarkdown, excerptsMarkdown, pageLabel } from '../research'
import { Modal } from './Modal'

export function SaveEvidence({ citation, saved, onToggle }: { citation: Citation; saved: boolean; onToggle(citation: Citation): void }) {
  return <button type="button" className={`save-evidence ${saved ? 'saved' : ''}`} aria-pressed={saved} onClick={() => onToggle(citation)} title={saved ? '取消收藏这条证据' : '收藏到研究摘录'}>
    {saved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}<span>{saved ? '已收藏' : '收藏证据'}</span>
  </button>
}

export function ExcerptShelf({ citations, spaceName, onRemove }: { citations: Citation[]; spaceName: string; onRemove(citation: Citation): void }) {
  return <section className="excerpt-shelf" aria-label="研究摘录">
    <div className="shelf-intro"><p className="eyebrow">YOUR RESEARCH, COLLECTED</p><h2>把线索，留在这里。</h2><p>收藏值得反复阅读的原文，慢慢拼出你的研究思路。</p></div>
    {citations.length > 0 ? <>
      <button type="button" className="button button-secondary shelf-export" onClick={() => downloadMarkdown(`${spaceName}-研究摘录`, excerptsMarkdown(spaceName, citations))}><ArrowDownToLine aria-hidden="true" />导出全部摘录 <span>{citations.length}</span></button>
      <div className="shelf-list">{citations.map((citation, index) => <article className="shelf-card" key={citation.passageId}>
        <div className="shelf-card-top"><span>摘录 / {String(index + 1).padStart(2, '0')}</span><button type="button" className="icon-button" aria-label={`移除摘录：${citation.documentTitle}`} onClick={() => onRemove(citation)}><Trash2 aria-hidden="true" /></button></div>
        <blockquote>{citation.excerpt}</blockquote><strong>{citation.documentTitle}</strong><small>{pageLabel(citation)}</small>
      </article>)}</div>
    </> : <div className="shelf-empty"><Bookmark aria-hidden="true" /><strong>留住第一条好证据</strong><p>在回答的引用证据中点击“收藏证据”，就会出现在这里。</p></div>}
    <p className="local-note">摘录仅保存在当前浏览器，按账户与知识空间独立存放。清理浏览器数据前请先导出。</p>
  </section>
}

interface CommandPaletteProps {
  spaces: KnowledgeSpace[]
  conversations: ConversationSummary[]
  focused: boolean
  onClose(): void
  onSpace(id: string): void
  onConversation(id: string): void
  onNew(): void
  onFocus(): void
  onLibrary(): void
}

export function CommandPalette(props: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const actions = [
    { id: 'new', label: '开始新会话', detail: '研究行动', icon: <FilePlus2 />, run: props.onNew },
    { id: 'focus', label: props.focused ? '退出专注阅读' : '进入专注阅读', detail: '研究行动', icon: <Maximize2 />, run: props.onFocus },
    { id: 'library', label: '打开文献库', detail: '研究行动', icon: <Search />, run: props.onLibrary },
    ...props.spaces.map((space) => ({ id: `s-${space.id}`, label: space.name, detail: '知识空间', icon: <Folder />, run: () => props.onSpace(space.id) })),
    ...props.conversations.map((conversation) => ({ id: `c-${conversation.id}`, label: conversation.title, detail: '会话记录', icon: <MessagesSquare />, run: () => props.onConversation(conversation.id) })),
  ].filter((action) => `${action.label} ${action.detail}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const selected = Math.min(cursor, Math.max(0, actions.length - 1))
  function run(index: number) { const action = actions[index]; if (action) { action.run(); props.onClose() } }
  return <Modal open title="快速跳转" description="搜索知识空间、会话，或执行一个研究行动。" onClose={props.onClose}>
    <div className="command-search"><Search aria-hidden="true" /><input autoFocus placeholder="搜索空间、会话或行动…" value={query} aria-label="搜索空间、会话或行动" aria-controls="command-results" aria-activedescendant={actions[selected] ? `command-${actions[selected].id}` : undefined} role="combobox" aria-expanded="true" aria-autocomplete="list" onChange={(event) => { setQuery(event.target.value); setCursor(0) }} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const next = (selected + (event.key === 'ArrowDown' ? 1 : -1) + actions.length) % (actions.length || 1)
        setCursor(next)
        document.getElementById(`command-${actions[next]?.id}`)?.scrollIntoView({ block: 'nearest' })
      }
      if (event.key === 'Enter') { event.preventDefault(); run(selected) }
    }} /><kbd>esc</kbd></div>
    <div className="command-results" role="listbox" id="command-results" aria-label="跳转结果">
      {actions.map((action, index) => <div key={action.id} id={`command-${action.id}`} role="option" aria-selected={selected === index} className={selected === index ? 'selected' : ''} onMouseEnter={() => setCursor(index)}>
        <button type="button" onClick={() => run(index)}>{action.icon}<span><strong>{action.label}</strong><small>{action.detail}</small></span><ArrowUpRight aria-hidden="true" /></button>
      </div>)}
      {actions.length === 0 && <p className="command-empty">没有找到相关内容，换个关键词试试。</p>}
    </div><p className="command-hint"><Command aria-hidden="true" /> Ctrl / ⌘ K 打开 · ↑↓ 选择 · Enter 跳转</p>
  </Modal>
}
