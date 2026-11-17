import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowUp,
  BrainCircuit,
  Clock3,
  Database,
  FileSearch,
  LoaderCircle,
  Search,
  ShieldCheck,
  Square,
  ArrowUpRight,
  ArrowDownToLine,
  Maximize2,
  Minimize2,
  PanelRight,
  Command,
  Quote,
} from 'lucide-react'
import type { AnswerRun, Citation, ConversationDetail, KnowledgeSpace, RetrievalStrategy } from '../types'
import { answerMarkdown, downloadMarkdown, pageLabel } from '../research'
import { SaveEvidence } from './ResearchTools'
import { Modal } from './Modal'

interface WorkspaceProps {
  space: KnowledgeSpace | null
  readyDocuments: number
  answer: AnswerRun
  conversation: ConversationDetail | null
  savedCitations: Citation[]
  focused: boolean
  onToggleFocus(): void
  onCommand(): void
  onLibrary(): void
  onSaveCitation(citation: Citation): void
  onAsk(question: string, strategy: RetrievalStrategy): void
  onStop(): void
  onCreateSpace(): void
}

const strategies: Array<{
  id: RetrievalStrategy
  label: string
  short: string
  description: string
}> = [
  { id: 'VECTOR', label: '语义检索', short: '语义', description: '寻找意思相近的原文' },
  { id: 'HYBRID_RRF', label: '混合检索', short: '混合', description: '同时匹配关键词与语义' },
  { id: 'HYBRID_RERANK', label: '深度检索', short: '深度', description: '混合检索后重新排序，需要重排服务' },
]

const suggestions = [
  { label: '寻找共识', hint: '从多篇论文中梳理共同结论', question: '这些论文的主要研究结论有哪些共识？请结合原文证据总结。' },
  { label: '对比方法', hint: '看清方法、实验与适用边界', question: '比较这些论文采用的研究方法、实验设计与局限，并给出原文依据。' },
  { label: '发现空白', hint: '沿着局限找到下一个问题', question: '这些文献明确提到了哪些研究局限与未来方向？请区分原文结论和推断。' },
]

export function Workspace({ space, readyDocuments, answer, conversation, savedCitations, focused, onToggleFocus, onCommand, onLibrary, onSaveCitation, onAsk, onStop, onCreateSpace }: WorkspaceProps) {
  const [question, setQuestion] = useState('')
  const [strategy, setStrategy] = useState<RetrievalStrategy>('HYBRID_RRF')
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const running = answer.phase === 'retrieving' || answer.phase === 'streaming'
  const canAsk = Boolean(space && readyDocuments > 0 && question.trim() && !running)
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [answer.question, conversation?.id])

  function suggest(value: string) {
    setQuestion(value)
    questionRef.current?.focus()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canAsk) return
    onAsk(question.trim(), strategy)
  }

  const selectedStrategy = strategies.find((item) => item.id === strategy)!

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">THE RESEARCH DESK / 研究台</p>
          <h1>{space?.name || '我的研究空间'}</h1>
        </div>
        <div className="workspace-tools">
        {space && <div className="space-health">
            <span className={readyDocuments > 0 ? 'online' : ''} />
            {readyDocuments > 0 ? `${readyDocuments} 篇就绪` : '等待文献'}
          </div>}
          <button className="icon-button" type="button" onClick={onCommand} aria-label="快速跳转" title="快速跳转 · Ctrl / ⌘ K"><Command aria-hidden="true" /></button>
          <button className="icon-button" type="button" onClick={onToggleFocus} aria-label={focused ? '退出专注阅读' : '专注阅读'} aria-pressed={focused} title={focused ? '退出专注阅读' : '专注阅读'}>{focused ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button>
          <button className="icon-button library-toggle" type="button" onClick={onLibrary} aria-label="打开文献与摘录" title="文献与摘录"><PanelRight aria-hidden="true" /></button>
        </div>
      </header>

      <div className="workspace-scroll" ref={scrollRef}>
        {answer.phase === 'idle' ? (
          conversation ? (
            <ConversationHistory conversation={conversation} />
          ) : (
            <EmptyWorkspace space={space} readyDocuments={readyDocuments} onCreateSpace={onCreateSpace} onLibrary={onLibrary} onSuggestion={suggest} />
          )
        ) : (
          <AnswerView key={answer.question} answer={answer} savedCitations={savedCitations} onSaveCitation={onSaveCitation} />
        )}
      </div>

      <section className="composer-wrap" aria-label="提问">
        <div className="strategy-bar" role="group" aria-label="检索策略">
          {strategies.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={strategy === item.id}
              className={strategy === item.id ? 'active' : ''}
              onClick={() => setStrategy(item.id)}
              title={item.description}
            >
              <span>{item.short}</span>
            </button>
          ))}
        </div>
        <form className="composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="research-question">输入文献问题</label>
          <textarea
            ref={questionRef}
            id="research-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                event.preventDefault()
                if (canAsk) onAsk(question.trim(), strategy)
              }
            }}
            placeholder={space ? readyDocuments > 0 ? '今天，你想从文献中找到什么？' : '文献索引完成后，就可以开始提问' : '先创建或选择一个知识空间'}
            rows={2}
            maxLength={8000}
            disabled={!space || readyDocuments === 0}
          />
          <div className="composer-footer">
            <div className="composer-mode"><Search aria-hidden="true" /><span>{selectedStrategy.label}</span><small>Enter 发送 · Shift + Enter 换行</small></div>
            {running ? (
              <button className="send-button stop" type="button" onClick={onStop} aria-label="停止生成"><Square aria-hidden="true" /></button>
            ) : (
              <button className="send-button" type="submit" disabled={!canAsk} aria-label="发送问题"><ArrowUp aria-hidden="true" /></button>
            )}
          </div>
        </form>
        <p className="composer-disclaimer"><ShieldCheck aria-hidden="true" />回答仅基于当前空间检索证据；证据不足时系统会拒答。</p>
      </section>
    </main>
  )
}

function EmptyWorkspace({
  space,
  readyDocuments,
  onCreateSpace,
  onLibrary,
  onSuggestion,
}: {
  space: KnowledgeSpace | null
  readyDocuments: number
  onCreateSpace(): void
  onLibrary(): void
  onSuggestion(value: string): void
}) {
  if (!space) {
    return (
      <div className="workspace-empty no-space">
        <p className="eyebrow">A PLACE FOR YOUR NEXT IDEA</p>
        <h2>给好奇心，<br /><em>留一个位置。</em></h2>
        <p>从一个研究主题开始，把论文、问题与发现收在同一个知识空间。</p>
        <button className="button button-primary" type="button" onClick={onCreateSpace}>创建知识空间</button>
      </div>
    )
  }

  if (readyDocuments === 0) {
    return (
      <div className="workspace-empty">
        <p className="eyebrow">EVERY DISCOVERY STARTS SOMEWHERE</p>
        <h2>第一篇论文，<br /><em>第一条线索。</em></h2>
        <p>放入含文本层的 PDF。我们整理好原文与页码，你专注于值得追问的问题。</p>
        <button className="button button-primary" type="button" onClick={onLibrary}><FileSearch aria-hidden="true" />前往文献库</button>
        <div className="empty-steps">
          <span><strong>01</strong>上传文献</span><span><strong>02</strong>整理证据</span><span><strong>03</strong>开始探索</span>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-empty ready">
      <div className="folio-top"><span><span className="tiny-dot" /> OPEN FOR DISCOVERY</span><span>文献 · 证据 · 洞见</span></div>
      <div className="research-hero"><div><p className="eyebrow">让好问题，遇见好证据</p><h2>读过的文献，<br /><em>有迹可循。</em></h2><p>在 {readyDocuments} 篇文献之间寻找联系。<br />从一个问题出发，让每一步思考都有出处。</p></div>
        <div className="folio-art" aria-hidden="true"><div className="folio-sheet sheet-back" /><div className="folio-sheet sheet-front"><span>FIELD NOTES</span><Quote /><i /><i /><i /><b>[ 01 ]</b><small>循证而行</small></div><span className="folio-seal">证<br />据</span></div>
      </div>
      <div className="suggestion-heading"><span>从这里打开思路</span><span>01 — 03</span></div>
      <div className="suggestion-list">
        {suggestions.map((suggestion, index) => (
          <button type="button" key={suggestion.label} onClick={() => onSuggestion(suggestion.question)}>
            <span className="suggestion-number">0{index + 1}</span><span><strong>{suggestion.label}</strong><small>{suggestion.hint}</small></span><ArrowUpRight aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

function ConversationHistory({ conversation }: { conversation: ConversationDetail }) {
  return (
    <article className="answer-view conversation-history" aria-label={`会话：${conversation.title}`}>
      <div className="question-card">
        <span>会话记录</span>
        <h2>{conversation.title}</h2>
      </div>
      {conversation.messages.length === 0 && (
        <div className="answer-loading"><div><strong>还没有消息</strong><span>在下方输入框提问，问答会自动写入这个会话。</span></div></div>
      )}
      {conversation.messages.map((message) => (
        <section key={message.id} className={`history-message history-${message.role.toLowerCase()}`}>
          <div className="answer-label">
            {message.role === 'USER' ? <Search aria-hidden="true" /> : <BrainCircuit aria-hidden="true" />}
            <span>{message.role === 'USER' ? '问题' : '证据回答'}</span>
          </div>
          <div className="answer-prose">{renderAnswer(message.content, [])}</div>
        </section>
      ))}
    </article>
  )
}

function AnswerView({ answer, savedCitations, onSaveCitation }: { answer: AnswerRun; savedCitations: Citation[]; onSaveCitation(citation: Citation): void }) {
  const [peek, setPeek] = useState<Citation | null>(null)
  return (
    <article className="answer-view">
      <div className="question-card">
        <div className="question-heading"><span className="eyebrow">RESEARCH QUESTION / 研究问题</span>{answer.phase === 'complete' && answer.text && <button type="button" className="text-button" onClick={() => downloadMarkdown(answer.question, answerMarkdown(answer))}><ArrowDownToLine aria-hidden="true" />导出回答</button>}</div>
        <h2>{answer.question}</h2>
      </div>

      {answer.phase === 'retrieving' && (
        <div className="answer-loading" role="status">
          <LoaderCircle className="spin" aria-hidden="true" />
          <div><strong>正在翻阅文献，寻找证据…</strong><span>回答会附上对应的文献与页码。</span></div>
        </div>
      )}

      {answer.refusal && (
        <div className="refusal-card">
          <ShieldCheck aria-hidden="true" />
          <div><p className="eyebrow">EVIDENCE REQUIRED</p><h3>{answer.refusal.message}</h3><span>系统未调用生成模型，以避免无依据回答。</span></div>
        </div>
      )}

      {answer.error && (
        <div className="refusal-card error">
          <ShieldCheck aria-hidden="true" />
          <div><p className="eyebrow">REQUEST FAILED</p><h3>{answer.error}</h3><span>请检查模型服务配置或稍后重试。</span></div>
        </div>
      )}

      {(answer.text || answer.phase === 'streaming') && (
        <section className="answer-content">
          <div className="answer-label"><BrainCircuit aria-hidden="true" /><span>证据回答</span>{answer.phase === 'streaming' && <small>生成中</small>}</div>
          <div className="answer-prose">{renderAnswer(answer.text, answer.citations, setPeek)}{answer.phase === 'streaming' && <span className="stream-caret" />}</div>
        </section>
      )}

      {answer.metrics && <Metrics metrics={answer.metrics} />}

      {answer.citations.length > 0 && (
        <section className="evidence-section">
          <div className="section-heading-row"><div><p className="eyebrow">IN THE MARGINS</p><h3>回到原文</h3></div><span>{answer.citations.length} 条引用证据 · 可收藏</span></div>
          <div className="evidence-list">
            {answer.citations.map((citation) => <EvidenceCard key={citation.passageId} citation={citation} saved={savedCitations.some((item) => item.passageId === citation.passageId)} onSave={onSaveCitation} />)}
          </div>
        </section>
      )}
      <Modal open={peek !== null} onClose={() => setPeek(null)} title="原文侧注" description="核对这一处引用，无需离开正在阅读的回答。">
        {peek && <div className="citation-peek"><span className="eyebrow">EVIDENCE [{peek.citationNumber}] · {pageLabel(peek)}</span><h3>{peek.documentTitle}</h3><blockquote>{peek.excerpt}</blockquote><SaveEvidence citation={peek} saved={savedCitations.some((item) => item.passageId === peek.passageId)} onToggle={onSaveCitation} /></div>}
      </Modal>
    </article>
  )
}

function renderAnswer(text: string, citations: Citation[], onCitation?: (citation: Citation) => void): ReactNode[] {
  const valid = new Set(citations.map((citation) => citation.citationNumber))
  return text.split(/(\[\d+\]|\*\*[^*\n]+\*\*)/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/)
    const number = match ? Number(match[1]) : null
    if (number && valid.has(number)) {
      return <button key={`${part}-${index}`} type="button" className="inline-citation" aria-label={`查看引用 ${number} 的原文`} onClick={() => { const citation = citations.find((item) => item.citationNumber === number); if (citation) onCitation?.(citation) }}>{part}</button>
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function Metrics({ metrics }: { metrics: NonNullable<AnswerRun['metrics']> }) {
  const items = [
    { icon: <Search aria-hidden="true" />, label: '检索', value: formatMs(metrics.retrievalDurationMs) },
    { icon: <Clock3 aria-hidden="true" />, label: '模型', value: formatMs(metrics.modelDurationMs) },
    { icon: <Database aria-hidden="true" />, label: '候选', value: metrics.candidateCount == null ? '—' : `${metrics.candidateCount}` },
    { icon: <BrainCircuit aria-hidden="true" />, label: 'Token', value: metrics.totalTokens == null ? '未返回' : metrics.totalTokens.toLocaleString() },
  ]
  return <div className="metrics-row">{items.map((item) => <div key={item.label}>{item.icon}<span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
}

function EvidenceCard({ citation, saved, onSave }: { citation: Citation; saved: boolean; onSave(citation: Citation): void }) {
  return (
    <article className="evidence-card" id={`evidence-${citation.citationNumber}`}>
      <div className="citation-index">[{citation.citationNumber}]</div>
      <div className="evidence-copy">
        <div className="evidence-title-row"><strong>{citation.documentTitle}</strong><span>p. {citation.pageStart}{citation.pageEnd !== citation.pageStart ? `–${citation.pageEnd}` : ''}</span></div>
        <blockquote>{citation.excerpt}</blockquote>
        <div className="evidence-footer"><span>相关分数 {citation.score.toFixed(3)}</span><SaveEvidence citation={citation} saved={saved} onToggle={onSave} /></div>
      </div>
    </article>
  )
}

function formatMs(value: number | null) {
  if (value == null) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value} ms`
}
