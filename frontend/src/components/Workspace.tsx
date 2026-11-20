import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import {
  ArrowUp,
  BrainCircuit,
  Clock3,
  Database,
  Plus,
  Search,
  ShieldCheck,
  Square,
  ArrowDownToLine,
  Maximize2,
  Minimize2,
  PanelRight,
  Command,
} from 'lucide-react'
import type { AnswerRun, Citation, ConversationDetail, KnowledgeSpace, LiteratureDocument, RetrievalStrategy } from '../types'
import { answerMarkdown, downloadMarkdown, pageLabel } from '../research'
import { BOOK_DRAG_TYPE, clothFor, documentQuestion, spineCloths, spineFor } from '../library'
import { burst, centerOf, flySprite, replayClass, spotlightBook, type Point } from '../pixel/effects'
import { Owl, owlSprite, type OwlMood } from '../pixel/Owl'
import { PixelSprite } from '../pixel/PixelSprite'
import { glyphs, magnifier, miniBook, note, sparkle } from '../pixel/sprites'
import { useDemoPolicy } from './DemoPolicy'
import { SaveEvidence } from './ResearchTools'
import { Modal } from './Modal'

interface WorkspaceProps {
  space: KnowledgeSpace | null
  readyDocuments: number
  documents: LiteratureDocument[]
  /** Grows each time a document finishes indexing. */
  cheer: number
  uploading: boolean
  /** A question handed over from elsewhere, e.g. "ask about this book". A new key applies it. */
  seed: { text: string; key: number } | null
  answer: AnswerRun
  conversation: ConversationDetail | null
  savedCitations: Citation[]
  focused: boolean
  onToggleFocus(): void
  onCommand(): void
  onLibrary(): void
  onUpload(file: File, origin: Point | null): void
  onSaveCitation(citation: Citation, origin?: Point): void
  onAsk(question: string, strategy: RetrievalStrategy): void
  onStop(): void
  onCreateSpace(): void
}

const strategies: Array<{ id: RetrievalStrategy; label: string; short: string; description: string }> = [
  { id: 'VECTOR', label: '语义检索', short: '语义', description: '寻找意思相近的原文' },
  { id: 'HYBRID_RRF', label: '混合检索', short: '混合', description: '同时匹配关键词与语义' },
  { id: 'HYBRID_RERANK', label: '深度检索', short: '深度', description: '混合检索后重新排序，需要重排服务' },
]

const suggestions = [
  { glyph: glyphs.consensus, label: '寻找共识', hint: '从多篇论文中梳理共同结论', question: '这些论文的主要研究结论有哪些共识？请结合原文证据总结。' },
  { glyph: glyphs.compare, label: '对比方法', hint: '看清方法、实验与适用边界', question: '比较这些论文采用的研究方法、实验设计与局限，并给出原文依据。' },
  { glyph: glyphs.gap, label: '发现空白', hint: '沿着局限找到下一个问题', question: '这些文献明确提到了哪些研究局限与未来方向？请区分原文结论和推断。' },
]

const TRUST_NOTE = '回答只基于当前空间检索到的证据；证据不足时会拒答。'

const owlTips = [
  'Enter 发送，Shift + Enter 换行。',
  '我只根据这个空间里的文献回答，证据不够就不答。',
  '把 PDF 拖进窗口任何地方，我来上架。',
  '点回答里的 [1]，就地核对原文。',
  '把书架上的书拖到输入框，就能针对它提问。',
  'Ctrl / ⌘ K 可以快速跳转。',
  '书架上的书可以点开看详情。',
]

export function Workspace({ space, readyDocuments, documents, cheer, uploading, seed, answer, conversation, savedCitations, focused, onToggleFocus, onCommand, onLibrary, onUpload, onSaveCitation, onAsk, onStop, onCreateSpace }: WorkspaceProps) {
  const [question, setQuestion] = useState('')
  const [strategy, setStrategy] = useState<RetrievalStrategy>('HYBRID_RRF')
  const [celebrating, setCelebrating] = useState(false)
  const [said, setSaid] = useState<{ text: string; key: number } | null>(null)
  const [typing, setTyping] = useState(false)
  const [bookOver, setBookOver] = useState(false)
  const seenSeed = useRef(seed?.key ?? 0)
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const composerRef = useRef<HTMLFormElement>(null)
  const sendRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seenCheer = useRef(cheer)
  const seenPhase = useRef(answer.phase)
  const running = answer.phase === 'retrieving' || answer.phase === 'streaming'
  const canAsk = Boolean(space && readyDocuments > 0 && question.trim() && !running)
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [answer.question, conversation?.id])

  // 咕咕 reacts to the two moments worth celebrating: an answer landing and a book shelved.
  useEffect(() => {
    const finished = answer.phase === 'complete' && seenPhase.current !== 'complete' && seenPhase.current !== 'idle'
    seenPhase.current = answer.phase
    const shelved = cheer !== seenCheer.current
    seenCheer.current = cheer
    if (!finished && !shelved) return
    if (shelved) setSaid({ text: '新书上架，可以问我了！', key: cheer })
    setCelebrating(true)
    const perch = document.querySelector('.composer-owl .owl-button')
    if (perch) burst(centerOf(perch), { count: 10, spread: 30 })
    const timer = window.setTimeout(() => setCelebrating(false), 2400)
    return () => window.clearTimeout(timer)
  }, [answer.phase, cheer])

  // While the reader types, 咕咕 looks down at the page instead of following the pointer.
  useEffect(() => {
    if (!typing) return
    const timer = window.setTimeout(() => setTyping(false), 1100)
    return () => window.clearTimeout(timer)
  }, [typing, question])

  const mood: OwlMood = celebrating ? 'excited'
    : answer.phase === 'retrieving' ? 'searching'
      : answer.phase === 'streaming' ? 'writing'
        : answer.phase === 'refused' ? 'shy'
          : answer.phase === 'error' ? 'sad'
            : space && readyDocuments === 0 ? 'sleepy' : typing ? 'writing' : 'idle'

  function suggest(value: string) {
    setQuestion(value)
    questionRef.current?.focus()
    replayClass(composerRef.current, 'composer-flash', 700)
  }

  useEffect(() => {
    if (!seed || seed.key === seenSeed.current) return
    seenSeed.current = seed.key
    suggest(seed.text)
  }, [seed])

  function dropBook(documentId: string) {
    const dropped = documents.find((document) => document.id === documentId)
    if (!dropped || dropped.status !== 'READY') return
    suggest(documentQuestion(dropped.title))
    setSaid({ text: '好，就问这本。', key: Date.now() })
    if (composerRef.current) burst(centerOf(composerRef.current), { count: 10, spread: 40 })
  }

  function send() {
    if (!canAsk) return
    const perch = document.querySelector('.composer-owl .owl-button')
    if (sendRef.current && perch) void flySprite({ sprite: note, from: centerOf(sendRef.current), to: centerOf(perch), scale: 3, lift: 46, spin: 180, duration: 460 })
    onAsk(question.trim(), strategy)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    send()
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <h1>{space?.name || '我的研究空间'}</h1>
        <div className="workspace-tools">
          {space && <div className="space-health px-text" title={`${readyDocuments} 篇文献可检索`}>
            <span className={readyDocuments > 0 ? 'online' : ''} />
            {readyDocuments > 0 ? `${readyDocuments} 篇就绪` : '等待文献'}
          </div>}
          <button className="icon-button" type="button" onClick={onCommand} aria-label="快速跳转" title="快速跳转 · Ctrl / ⌘ K"><Command aria-hidden="true" /></button>
          <button className="icon-button" type="button" onClick={onToggleFocus} aria-label={focused ? '退出专注阅读' : '专注阅读'} aria-pressed={focused} title={focused ? '退出专注阅读' : '专注阅读'}>{focused ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button>
          <button className="icon-button library-toggle" data-fx="library" type="button" onClick={onLibrary} aria-label="打开文献与摘录" title="文献与摘录"><PanelRight aria-hidden="true" /></button>
        </div>
      </header>

      <div className="workspace-scroll" ref={scrollRef}>
        {answer.phase === 'idle' ? (
          conversation ? (
            <ConversationHistory conversation={conversation} />
          ) : (
            <EmptyWorkspace space={space} readyDocuments={readyDocuments} documents={documents} uploading={uploading} onCreateSpace={onCreateSpace} onUpload={onUpload} onSuggestion={suggest} />
          )
        ) : (
          <AnswerView key={answer.question} answer={answer} documents={documents} savedCitations={savedCitations} onSaveCitation={onSaveCitation} />
        )}
      </div>

      <section className="composer-wrap" aria-label="提问">
        <form
          className="composer px-box"
          ref={composerRef}
          data-book-over={bookOver ? '' : undefined}
          onSubmit={submit}
          onDragOver={(event) => { if (event.dataTransfer.types.includes(BOOK_DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setBookOver(true) } }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBookOver(false) }}
          onDrop={(event) => {
            const documentId = event.dataTransfer.getData(BOOK_DRAG_TYPE)
            if (!documentId) return
            event.preventDefault()
            setBookOver(false)
            dropBook(documentId)
          }}
        >
          <Owl className="composer-owl" mood={mood} scale={3} tips={owlTips} say={said?.text} sayKey={said?.key} />
          <label className="sr-only" htmlFor="research-question">输入文献问题</label>
          <textarea
            ref={questionRef}
            id="research-question"
            value={question}
            onChange={(event) => { setQuestion(event.target.value); setTyping(true) }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                event.preventDefault()
                send()
              }
            }}
            placeholder={space ? readyDocuments > 0 ? '今天，你想从文献中找到什么？' : '文献入库后，就可以开始提问' : '先创建或选择一个知识空间'}
            rows={2}
            maxLength={8000}
            disabled={!space || readyDocuments === 0}
          />
          <div className="composer-footer">
            <div className="strategy-bar" role="group" aria-label="检索策略">
              {strategies.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={strategy === item.id}
                  className={strategy === item.id ? 'active' : ''}
                  onClick={() => setStrategy(item.id)}
                  aria-label={item.label}
                  title={`${item.label} · ${item.description}`}
                >
                  <span className="strategy-pips" aria-hidden="true">{[0, 1, 2].map((pip) => <i key={pip} data-on={pip <= index ? '' : undefined} />)}</span>
                  <span>{item.short}</span>
                </button>
              ))}
            </div>
            <button type="button" className="composer-trust" aria-label="回答依据说明" title={TRUST_NOTE} onClick={() => setSaid({ text: TRUST_NOTE, key: Date.now() })}><ShieldCheck aria-hidden="true" /></button>
            {running ? (
              <button className="send-button stop px-button" type="button" onClick={onStop} aria-label="停止生成" title="停止生成"><Square aria-hidden="true" /></button>
            ) : (
              <button ref={sendRef} className="send-button px-button" type="submit" disabled={!canAsk} aria-label="发送问题" title="发送 · Enter"><ArrowUp aria-hidden="true" /></button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}

function EmptyWorkspace({
  space,
  readyDocuments,
  documents,
  uploading,
  onCreateSpace,
  onUpload,
  onSuggestion,
}: {
  space: KnowledgeSpace | null
  readyDocuments: number
  documents: LiteratureDocument[]
  uploading: boolean
  onCreateSpace(): void
  onUpload(file: File, origin: Point | null): void
  onSuggestion(value: string): void
}) {
  const demo = useDemoPolicy()
  const inputRef = useRef<HTMLInputElement>(null)
  const origin = useRef<Point | null>(null)

  if (!space) {
    return (
      <div className="workspace-empty no-space">
        <PixelSprite sprite={owlSprite('closed')} scale={8} className="float-slow empty-owl" />
        <h2>给好奇心，<br /><em>留一个位置。</em></h2>
        <button className="button button-primary px-button" type="button" onClick={onCreateSpace}><Plus aria-hidden="true" />创建知识空间</button>
      </div>
    )
  }

  if (readyDocuments === 0) {
    const canEdit = space.role === 'OWNER' || space.role === 'EDITOR'
    const waiting = documents.length > 0
    return (
      <div className="workspace-empty first-book">
        <h2>第一篇论文，<br /><em>第一条线索。</em></h2>
        {waiting ? (
          <div className="book-drop px-box" role="status">
            <span className="book-drop-art"><PixelSprite sprite={miniBook} scale={5} className="float-slow" /></span>
            <strong>正在整理 {documents.length} 篇文献…</strong>
          </div>
        ) : canEdit ? (
          <div className="book-drop px-box">
            <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" tabIndex={-1} aria-hidden="true" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file, origin.current); event.target.value = '' }} />
            <span className="book-drop-art"><PixelSprite sprite={miniBook} scale={5} className="float-slow" /><i aria-hidden="true" /></span>
            <strong>把 PDF 拖到这里</strong>
            <button className="button button-primary px-button" type="button" disabled={uploading} onClick={(event) => { origin.current = centerOf(event.currentTarget); inputRef.current?.click() }}><Plus aria-hidden="true" />选择 PDF</button>
            <small>含文本层 · ≤ {Math.floor(demo.maxFileSizeBytes / (1024 * 1024))} MiB · ≤ {demo.maxPages} 页</small>
          </div>
        ) : (
          <div className="book-drop px-box"><strong>等待空间编辑者上传文献</strong></div>
        )}
      </div>
    )
  }

  const stack = documents.filter((document) => document.status === 'READY').slice(0, 6)
  return (
    <div className="workspace-empty ready">
      <div className="research-hero">
        <div><h2>读过的文献，<br /><em>有迹可循。</em></h2><p>向 {readyDocuments} 篇文献提问，每个结论都带着出处。</p></div>
        <div className="book-stack" role="group" aria-label="就某一篇文献提问">
          <PixelSprite sprite={sparkle} scale={3} className="stack-sparkle twinkle" />
          {stack.map((document, index) => {
            const spine = spineFor(document)
            const cloth = spineCloths[spine.cloth]
            return (
              <button
                key={document.id}
                type="button"
                className="stack-book"
                style={{ '--cover': cloth.cover, '--cover-light': cloth.light, '--cover-dark': cloth.dark, '--i': index, width: Math.round(spine.height * 1.2), height: Math.max(18, Math.round(spine.width * 0.62)), marginLeft: ((index * 37) % 5 - 2) * 6 } as CSSProperties}
                title={`就《${document.title}》提问`}
                aria-label={`就《${document.title}》提问`}
                onClick={() => onSuggestion(documentQuestion(document.title))}
              />
            )
          })}
        </div>
      </div>
      <div className="suggestion-list">
        {suggestions.map((suggestion) => (
          <button type="button" className="px-box" key={suggestion.label} title={suggestion.hint} onClick={() => onSuggestion(suggestion.question)}>
            <PixelSprite sprite={suggestion.glyph} scale={3} />
            <strong>{suggestion.label}</strong>
            <span className="sr-only">：{suggestion.hint}</span>
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
        <span className="px-tag">会话记录</span>
        <h2>{conversation.title}</h2>
      </div>
      {conversation.messages.length === 0 && (
        <div className="answer-loading"><div><strong>还没有消息</strong></div></div>
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

/** The wait for evidence: a magnifier sweeping the spines of the books being searched. */
function ScanScene({ documents }: { documents: LiteratureDocument[] }) {
  const books = documents.filter((document) => document.status === 'READY').slice(0, 14)
  return (
    <div className="scan-scene" role="status">
      <div className="scan-row" aria-hidden="true">
        {books.map((document, index) => {
          const spine = spineFor(document)
          const cloth = spineCloths[spine.cloth]
          return <i key={document.id} style={{ '--cover': cloth.cover, '--cover-light': cloth.light, '--cover-dark': cloth.dark, '--i': index, width: Math.round(spine.width * 0.75), height: Math.round(spine.height * 0.66) } as CSSProperties} />
        })}
        <PixelSprite sprite={magnifier} scale={4} className="scan-lens" />
      </div>
      <strong>翻阅中…</strong>
    </div>
  )
}

function AnswerView({ answer, documents, savedCitations, onSaveCitation }: { answer: AnswerRun; documents: LiteratureDocument[]; savedCitations: Citation[]; onSaveCitation(citation: Citation, origin?: Point): void }) {
  const [peek, setPeek] = useState<Citation | null>(null)
  const peekRef = useRef<Citation | null>(null)
  peekRef.current = peek
  // The open side note keeps its book lit; hovering elsewhere only borrows the spotlight.
  const spotlight = (documentId: string | null) => spotlightBook(documentId ?? peekRef.current?.documentId ?? null)
  useEffect(() => { spotlightBook(peek?.documentId ?? null) }, [peek])
  useEffect(() => () => spotlightBook(null), [])
  return (
    <article className="answer-view">
      <div className="question-card">
        <div className="question-heading"><span className="px-tag">Q</span>{answer.phase === 'complete' && answer.text && <button type="button" className="text-button" onClick={() => downloadMarkdown(answer.question, answerMarkdown(answer))}><ArrowDownToLine aria-hidden="true" />导出回答</button>}</div>
        <h2>{answer.question}</h2>
      </div>

      {answer.phase === 'retrieving' && <ScanScene documents={documents} />}

      {answer.refusal && (
        <div className="refusal-card px-box">
          <PixelSprite sprite={owlSprite('covered')} scale={4} />
          <div><h3>{answer.refusal.message}</h3><span>没有调用生成模型，避免无依据的回答。</span></div>
        </div>
      )}

      {answer.error && (
        <div className="refusal-card error px-box">
          <PixelSprite sprite={owlSprite('dizzy')} scale={4} />
          <div><h3>{answer.error}</h3><span>请稍后重试。</span></div>
        </div>
      )}

      {(answer.text || answer.phase === 'streaming') && (
        <section className="answer-content">
          <div className="answer-label"><BrainCircuit aria-hidden="true" /><span>证据回答</span>{answer.phase === 'streaming' && <small className="px-text">生成中</small>}</div>
          <div className="answer-prose">{renderAnswer(answer.text, answer.citations, setPeek, spotlight)}{answer.phase === 'streaming' && <span className="stream-caret" />}</div>
        </section>
      )}

      {answer.metrics && <Metrics metrics={answer.metrics} />}

      {answer.citations.length > 0 && (
        <section className="evidence-section">
          <div className="section-heading-row"><h3>回到原文</h3><span className="document-count px-text" title={`${answer.citations.length} 条引用证据`}>{answer.citations.length}</span></div>
          <div className="evidence-list">
            {answer.citations.map((citation, index) => <EvidenceCard key={citation.passageId} index={index} citation={citation} onSpotlight={spotlight} saved={savedCitations.some((item) => item.passageId === citation.passageId)} onSave={onSaveCitation} />)}
          </div>
        </section>
      )}
      <Modal open={peek !== null} onClose={() => setPeek(null)} title="原文侧注" description={peek ? `引用 [${peek.citationNumber}] · ${pageLabel(peek)}` : undefined}>
        {peek && <div className="citation-peek" style={{ '--cloth': clothFor(peek.documentId).cover } as CSSProperties}><h3>{peek.documentTitle}</h3><blockquote>{peek.excerpt}</blockquote><SaveEvidence citation={peek} saved={savedCitations.some((item) => item.passageId === peek.passageId)} onToggle={onSaveCitation} /></div>}
      </Modal>
    </article>
  )
}

function renderAnswer(text: string, citations: Citation[], onCitation?: (citation: Citation) => void, onSpotlight?: (documentId: string | null) => void): ReactNode[] {
  const byNumber = new Map(citations.map((citation) => [citation.citationNumber, citation]))
  return text.split(/(\[\d+\]|\*\*[^*\n]+\*\*)/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/)
    const citation = match ? byNumber.get(Number(match[1])) : undefined
    if (citation) {
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          className="inline-citation"
          style={{ '--cloth': clothFor(citation.documentId).cover } as CSSProperties}
          aria-label={`查看引用 ${citation.citationNumber} 的原文`}
          title={citation.documentTitle}
          onPointerEnter={() => onSpotlight?.(citation.documentId)}
          onPointerLeave={() => onSpotlight?.(null)}
          onFocus={() => onSpotlight?.(citation.documentId)}
          onBlur={() => onSpotlight?.(null)}
          onClick={() => onCitation?.(citation)}
        >{part}</button>
      )
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
  return <div className="metrics-row">{items.map((item) => <div key={item.label}>{item.icon}<span>{item.label}</span><strong className="px-text">{item.value}</strong></div>)}</div>
}

function EvidenceCard({ citation, index, saved, onSave, onSpotlight }: { citation: Citation; index: number; saved: boolean; onSave(citation: Citation, origin?: Point): void; onSpotlight(documentId: string | null): void }) {
  return (
    <article
      className="evidence-card"
      id={`evidence-${citation.citationNumber}`}
      style={{ '--cloth': clothFor(citation.documentId).cover, '--i': index } as CSSProperties}
      onPointerEnter={() => onSpotlight(citation.documentId)}
      onPointerLeave={() => onSpotlight(null)}
    >
      <div className="citation-index px-text">{citation.citationNumber}</div>
      <div className="evidence-copy">
        <div className="evidence-title-row"><strong>{citation.documentTitle}</strong><span>{pageLabel(citation)}</span></div>
        <blockquote>{citation.excerpt}</blockquote>
        <div className="evidence-footer"><span className="score-meter" title={`相关分数 ${citation.score.toFixed(3)}`} aria-label={`相关分数 ${citation.score.toFixed(3)}`}>{[0, 1, 2, 3, 4].map((pip) => <i key={pip} data-on={citation.score >= (pip + 1) * 0.2 - 0.1 ? '' : undefined} />)}</span><SaveEvidence citation={citation} saved={saved} onToggle={onSave} /></div>
      </div>
    </article>
  )
}

function formatMs(value: number | null) {
  if (value == null) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value} ms`
}
