import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowUp,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  FileSearch,
  LoaderCircle,
  Search,
  ShieldCheck,
  Square,
} from 'lucide-react'
import type { AnswerRun, Citation, KnowledgeSpace, RetrievalStrategy } from '../types'

interface WorkspaceProps {
  space: KnowledgeSpace | null
  readyDocuments: number
  answer: AnswerRun
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
  { id: 'VECTOR', label: '向量检索', short: 'Vector', description: 'BGE-M3 语义相似度基线' },
  { id: 'HYBRID_RRF', label: '混合检索', short: 'Hybrid', description: 'BM25 与向量结果经 RRF 融合' },
  { id: 'HYBRID_RERANK', label: '混合 + 重排', short: 'Rerank', description: '融合候选经 bge-reranker 精排' },
]

const suggestions = [
  '比较这些论文采用的检索方法与主要结论',
  '哪些实验结果支持重排序能够提升检索质量？',
  '总结文献中对 RAG 无依据生成风险的讨论',
]

export function Workspace({ space, readyDocuments, answer, onAsk, onStop, onCreateSpace }: WorkspaceProps) {
  const [question, setQuestion] = useState('')
  const [strategy, setStrategy] = useState<RetrievalStrategy>('HYBRID_RERANK')
  const running = answer.phase === 'retrieving' || answer.phase === 'streaming'
  const canAsk = Boolean(space && readyDocuments > 0 && question.trim() && !running)

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
          <p className="eyebrow">EVIDENCE WORKSPACE</p>
          <h1>{space?.name || '文献证据工作台'}</h1>
        </div>
        {space && (
          <div className="space-health">
            <span className={readyDocuments > 0 ? 'online' : ''} />
            {readyDocuments > 0 ? `${readyDocuments} 篇文献可检索` : '等待文献索引'}
          </div>
        )}
      </header>

      <div className="workspace-scroll">
        {answer.phase === 'idle' ? (
          <EmptyWorkspace space={space} readyDocuments={readyDocuments} onCreateSpace={onCreateSpace} onSuggestion={setQuestion} />
        ) : (
          <AnswerView answer={answer} />
        )}
      </div>

      <section className="composer-wrap" aria-label="提问">
        <div className="strategy-bar" role="radiogroup" aria-label="检索策略">
          {strategies.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={strategy === item.id}
              className={strategy === item.id ? 'active' : ''}
              onClick={() => setStrategy(item.id)}
              title={item.description}
            >
              <span>{item.short}</span>
              {item.id === 'HYBRID_RERANK' && <small>推荐</small>}
            </button>
          ))}
        </div>
        <form className="composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="research-question">输入文献问题</label>
          <textarea
            id="research-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (canAsk) onAsk(question.trim(), strategy)
              }
            }}
            placeholder={space ? readyDocuments > 0 ? '针对当前知识空间提问，Enter 发送…' : '文献索引完成后即可提问' : '先创建或选择一个知识空间'}
            rows={3}
            disabled={!space || readyDocuments === 0}
          />
          <div className="composer-footer">
            <div className="composer-mode"><BrainCircuit aria-hidden="true" /><span>{selectedStrategy.label}</span><small>{selectedStrategy.description}</small></div>
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
  onSuggestion,
}: {
  space: KnowledgeSpace | null
  readyDocuments: number
  onCreateSpace(): void
  onSuggestion(value: string): void
}) {
  if (!space) {
    return (
      <div className="workspace-empty no-space">
        <div className="empty-illustration"><Database aria-hidden="true" /><span>01</span></div>
        <p className="eyebrow">START WITH A SPACE</p>
        <h2>建立你的第一座文献库</h2>
        <p>知识空间用于隔离不同研究主题，也可以绑定课题组共同维护。</p>
        <button className="button button-primary" type="button" onClick={onCreateSpace}>创建知识空间</button>
      </div>
    )
  }

  if (readyDocuments === 0) {
    return (
      <div className="workspace-empty">
        <div className="empty-illustration"><FileSearch aria-hidden="true" /><span>02</span></div>
        <p className="eyebrow">ADD YOUR SOURCES</p>
        <h2>上传论文，构建可检索证据</h2>
        <p>在右侧上传含文本层的 PDF。解析与双索引异步完成，不会阻塞页面。</p>
        <div className="empty-steps">
          <span><strong>1</strong>解析页码</span><span><strong>2</strong>分段向量化</span><span><strong>3</strong>BM25 建库</span>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-empty ready">
      <div className="empty-illustration"><BookOpenCheck aria-hidden="true" /><span>03</span></div>
      <p className="eyebrow">READY FOR EVIDENCE</p>
      <h2>从文献证据开始提问</h2>
      <p>系统会返回文献名称、页码与原文片段。试试下面的问题，或输入你的研究问题。</p>
      <div className="suggestion-list">
        {suggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => onSuggestion(suggestion)}>
            <Search aria-hidden="true" /><span>{suggestion}</span><ArrowUp aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}

function AnswerView({ answer }: { answer: AnswerRun }) {
  return (
    <article className="answer-view" aria-live="polite">
      <div className="question-card">
        <span>研究问题</span>
        <h2>{answer.question}</h2>
      </div>

      {answer.phase === 'retrieving' && (
        <div className="answer-loading">
          <LoaderCircle className="spin" aria-hidden="true" />
          <div><strong>正在定位支持证据</strong><span>并行检索 BM25 与 BGE-M3 向量索引…</span></div>
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
          <div className="answer-prose">{renderAnswer(answer.text, answer.citations)}{answer.phase === 'streaming' && <span className="stream-caret" />}</div>
        </section>
      )}

      {answer.metrics && <Metrics metrics={answer.metrics} />}

      {answer.citations.length > 0 && (
        <section className="evidence-section">
          <div className="section-heading-row"><div><p className="eyebrow">SOURCE EVIDENCE</p><h3>引用证据</h3></div><span>{answer.citations.length} 条 Top-K 证据</span></div>
          <div className="evidence-list">
            {answer.citations.map((citation) => <EvidenceCard key={citation.passageId} citation={citation} />)}
          </div>
        </section>
      )}
    </article>
  )
}

function renderAnswer(text: string, citations: Citation[]): ReactNode[] {
  const valid = new Set(citations.map((citation) => citation.citationNumber))
  return text.split(/(\[\d+\]|\*\*[^*\n]+\*\*)/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/)
    const number = match ? Number(match[1]) : null
    if (number && valid.has(number)) {
      return <button key={`${part}-${index}`} type="button" className="inline-citation" onClick={() => document.getElementById(`evidence-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{part}</button>
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

function EvidenceCard({ citation }: { citation: Citation }) {
  return (
    <article className="evidence-card" id={`evidence-${citation.citationNumber}`}>
      <div className="citation-index">[{citation.citationNumber}]</div>
      <div className="evidence-copy">
        <div className="evidence-title-row"><strong>{citation.documentTitle}</strong><span>p. {citation.pageStart}{citation.pageEnd !== citation.pageStart ? `–${citation.pageEnd}` : ''}</span></div>
        <blockquote>{citation.excerpt}</blockquote>
        <div className="evidence-footer"><CheckCircle2 aria-hidden="true" />原文证据 <span>相关分数 {citation.score.toFixed(3)}</span></div>
      </div>
    </article>
  )
}

function formatMs(value: number | null) {
  if (value == null) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value} ms`
}
