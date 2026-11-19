import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  Trash2,
  UploadCloud,
  Search,
} from 'lucide-react'
import { Modal } from './Modal'
import { DemoNotice, useDemoPolicy } from './DemoPolicy'
import type { IndexingTask, KnowledgeSpace, LiteratureDocument } from '../types'

interface DocumentPanelProps {
  space: KnowledgeSpace | null
  documents: LiteratureDocument[]
  loading: boolean
  activeTask: IndexingTask | null
  uploading: boolean
  onUpload(file: File): void
  onDelete(document: LiteratureDocument): void
}

const statusCopy = {
  PENDING: '等待处理',
  PROCESSING: '正在索引',
  READY: '可检索',
  FAILED: '处理失败',
} as const

export function DocumentPanel({
  space,
  documents,
  loading,
  activeTask,
  uploading,
  onUpload,
  onDelete,
}: DocumentPanelProps) {
  const demo = useDemoPolicy()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'title'>('recent')
  const [pendingDelete, setPendingDelete] = useState<LiteratureDocument | null>(null)
  const canEdit = space?.role === 'OWNER' || space?.role === 'EDITOR'

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onUpload(file)
    event.target.value = ''
  }

  function dropFile(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file && canEdit && !uploading) onUpload(file)
  }

  const readyCount = documents.filter((document) => document.status === 'READY').length
  const filteredDocuments = documents.filter((document) => `${document.title} ${document.authors ?? ''} ${document.originalFilename}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : Date.parse(b.createdAt) - Date.parse(a.createdAt))

  return (
    <aside className="document-panel" aria-labelledby="documents-heading">
      <header className="panel-header">
        <div>
          <p className="eyebrow">THE READING COLLECTION</p>
          <h2 id="documents-heading">案头文献</h2>
        </div>
        <span className="document-count" title={`${readyCount} 篇可检索，共 ${documents.length} 篇`}>{documents.length} 篇</span>
      </header>

      {!space ? null : canEdit ? (
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''} ${uploading ? 'disabled' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={dropFile}
        >
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={pickFile} />
          <UploadCloud aria-hidden="true" />
          <strong>{uploading ? '正在处理文献…' : '为研究添一篇文献'}</strong>
          <span>拖放文件，或</span>
          <button type="button" disabled={uploading || !space} onClick={() => inputRef.current?.click()}>
            选择 PDF
          </button>
          <small>最大 {Math.floor(demo.maxFileSizeBytes / (1024 * 1024))} MiB · {demo.maxPages} 页</small>
        </div>
      ) : (
        <div className="viewer-notice">
          <FileText aria-hidden="true" />
          <p><strong>只读空间</strong><span>你可以检索和提问，但不能上传文献。</span></p>
        </div>
      )}

      <DemoNotice />
      {activeTask && (
        <section className={`task-card ${activeTask.status.toLowerCase()}`} aria-live="polite">
          <div className="task-card-heading">
            {activeTask.status === 'FAILED'
              ? <AlertCircle aria-hidden="true" />
              : activeTask.status === 'COMPLETED'
                ? <CheckCircle2 aria-hidden="true" />
                : <LoaderCircle className="spin" aria-hidden="true" />}
            <div>
              <strong>{activeTask.status === 'COMPLETED' ? '索引构建完成' : activeTask.status === 'FAILED' ? '索引构建失败' : '正在构建双索引'}</strong>
              <span>{activeTask.status === 'PROCESSING' ? '解析、分段、向量化与 BM25' : statusCopy[activeTask.status === 'COMPLETED' ? 'READY' : activeTask.status]}</span>
            </div>
          </div>
          {activeTask.status !== 'FAILED' && (
            <div className="task-progress"><span style={{ width: activeTask.status === 'COMPLETED' ? '100%' : activeTask.status === 'PROCESSING' ? '64%' : '18%' }} /></div>
          )}
          {activeTask.status === 'COMPLETED' && (
            <div className="task-metrics">
              <span>{activeTask.passageCount ?? 0} 个片段</span>
              <span>{activeTask.totalDurationMs ?? 0} ms</span>
            </div>
          )}
          {activeTask.failureReason && <p className="task-error">{activeTask.failureReason}</p>}
        </section>
      )}

      {documents.length > 0 && <div className="document-controls"><label className="document-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、作者…" aria-label="搜索文献" /></label><div className="document-sort"><span>{query ? `找到 ${filteredDocuments.length} 篇` : `${readyCount} 篇可检索`}</span><select aria-label="文献排序" value={sort} onChange={(event) => setSort(event.target.value as 'recent' | 'title')}><option value="recent">最近添加</option><option value="title">按标题</option></select></div></div>}
      <div className="document-list" aria-live="polite">
        {loading && (
          <div className="panel-loading"><LoaderCircle className="spin" aria-hidden="true" />载入文献…</div>
        )}
        {!loading && space && documents.length === 0 && (
          <div className="documents-empty">
            <FileText aria-hidden="true" />
            <strong>还没有文献</strong>
            <span>{canEdit ? '上传第一篇 PDF 开始构建知识库。' : '等待空间编辑者上传文献。'}</span>
          </div>
        )}
        {!space && (
          <div className="documents-empty">
            <FileText aria-hidden="true" />
            <strong>尚未选择空间</strong>
            <span>创建或选择知识空间后查看文献。</span>
          </div>
        )}
        {query && filteredDocuments.length === 0 && <div className="documents-empty"><Search aria-hidden="true" /><strong>没有匹配的文献</strong><span>试试其他标题或作者关键词。</span><button type="button" className="text-button" onClick={() => setQuery('')}>清除搜索</button></div>}
        {filteredDocuments.map((document, index) => (
          <article className="document-card" key={document.id}>
            <div className="document-icon"><span>{String(index + 1).padStart(2, '0')}</span><FileText aria-hidden="true" /></div>
            <div className="document-copy">
              <strong title={document.title}>{document.title}</strong>
              <span>{document.authors || document.originalFilename}</span>
              <div className="document-meta">
                {document.publicationYear && <small>{document.publicationYear}</small>}
                {document.pageCount && <small>{document.pageCount} 页</small>}
                <small className={`status status-${document.status.toLowerCase()}`}>
                  {document.status === 'PROCESSING' || document.status === 'PENDING'
                    ? <Clock3 aria-hidden="true" />
                    : document.status === 'READY'
                      ? <CheckCircle2 aria-hidden="true" />
                      : <AlertCircle aria-hidden="true" />}
                  {statusCopy[document.status]}
                </small>
              </div>
              {document.failureReason && <p className="document-failure">{document.failureReason}</p>}
            </div>
            {canEdit && (
              <button
                type="button"
                className="icon-button document-delete"
                aria-label={`删除文献《${document.title}》`}
                title="删除文献及其索引"
                onClick={() => setPendingDelete(document)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </article>
        ))}
      </div>

      <Modal
        title="删除文献"
        description="将同步删除该文献的原文、分段、向量与关键词索引，且不可恢复。"
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
      >
        <p className="modal-confirm-text">确认删除《{pendingDelete?.title}》吗？</p>
        <div className="modal-actions">
          <button type="button" className="button" onClick={() => setPendingDelete(null)}>取消</button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => {
              if (pendingDelete) onDelete(pendingDelete)
              setPendingDelete(null)
            }}
          >
            确认删除
          </button>
        </div>
      </Modal>
    </aside>
  )
}
