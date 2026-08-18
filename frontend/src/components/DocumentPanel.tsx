import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  UploadCloud,
} from 'lucide-react'
import type { IndexingTask, KnowledgeSpace, LiteratureDocument } from '../types'

interface DocumentPanelProps {
  space: KnowledgeSpace | null
  documents: LiteratureDocument[]
  loading: boolean
  activeTask: IndexingTask | null
  uploading: boolean
  onUpload(file: File): void
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
}: DocumentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
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

  return (
    <aside className="document-panel" aria-labelledby="documents-heading">
      <header className="panel-header">
        <div>
          <p className="eyebrow">KNOWLEDGE BASE</p>
          <h2 id="documents-heading">文献库</h2>
        </div>
        <span className="document-count">{readyCount}/{documents.length}</span>
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
          <strong>{uploading ? '正在上传…' : '上传 PDF 文献'}</strong>
          <span>拖放文件，或</span>
          <button type="button" disabled={uploading || !space} onClick={() => inputRef.current?.click()}>
            浏览本地文件
          </button>
          <small>最大 50 MB · 500 页</small>
        </div>
      ) : (
        <div className="viewer-notice">
          <FileText aria-hidden="true" />
          <p><strong>只读空间</strong><span>你可以检索和提问，但不能上传文献。</span></p>
        </div>
      )}

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
        {documents.map((document) => (
          <article className="document-card" key={document.id}>
            <div className="document-icon"><FileText aria-hidden="true" /></div>
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
          </article>
        ))}
      </div>
    </aside>
  )
}
