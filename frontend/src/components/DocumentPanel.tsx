import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  LibraryBig,
  List,
  LoaderCircle,
  MessageSquarePlus,
  Plus,
  Trash2,
  Search,
  X,
} from 'lucide-react'
import { Modal } from './Modal'
import { Bookshelf, receiveIncoming, type ShelfSignal } from './Bookshelf'
import { DemoNotice, useDemoPolicy } from './DemoPolicy'
import { citationFlags, spineCloths, spineFor } from '../library'
import type { Point } from '../pixel/effects'
import type { Citation, IndexingTask, KnowledgeSpace, LiteratureDocument } from '../types'

interface DocumentPanelProps {
  space: KnowledgeSpace | null
  documents: LiteratureDocument[]
  loading: boolean
  activeTask: IndexingTask | null
  uploading: boolean
  /** A book is on its way: the upload request has not returned yet. */
  incoming: boolean
  signal: ShelfSignal | null
  /** Citations of the answer on screen; cited books get a numbered flag. */
  citations: Citation[]
  scanning: boolean
  onUpload(file: File, origin: Point | null): void
  onDelete(document: LiteratureDocument): void
  /** Starts a question about one document. */
  onAskAbout(document: LiteratureDocument): void
}

const statusCopy = {
  PENDING: '等待处理',
  PROCESSING: '正在索引',
  READY: '可检索',
  FAILED: '处理失败',
} as const

const VIEW_KEY = 'litevidence.library-view.v1'
type LibraryView = 'shelf' | 'list'

function loadView(): LibraryView {
  try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'shelf' } catch { return 'shelf' }
}

export function DocumentPanel({
  space,
  documents,
  loading,
  activeTask,
  uploading,
  incoming,
  signal,
  citations,
  scanning,
  onUpload,
  onDelete,
  onAskAbout,
}: DocumentPanelProps) {
  const demo = useDemoPolicy()
  const inputRef = useRef<HTMLInputElement>(null)
  const pickOrigin = useRef<Point | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'title'>('recent')
  const [view, setView] = useState<LibraryView>(() => loadView())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<LiteratureDocument | null>(null)
  const canEdit = space?.role === 'OWNER' || space?.role === 'EDITOR'
  const limits = `PDF · ≤ ${Math.floor(demo.maxFileSizeBytes / (1024 * 1024))} MiB · ≤ ${demo.maxPages} 页`

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onUpload(file, pickOrigin.current)
    event.target.value = ''
  }

  const openPicker = useCallback((origin: Point | null) => {
    pickOrigin.current = origin
    inputRef.current?.click()
  }, [])

  function changeView(next: LibraryView) {
    setView(next)
    try { localStorage.setItem(VIEW_KEY, next) } catch { /* The choice still applies to this page. */ }
  }

  const readyCount = documents.filter((document) => document.status === 'READY').length
  const needle = query.trim().toLocaleLowerCase()
  const sorted = useMemo(
    () => [...documents].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [documents, sort],
  )
  const filteredDocuments = useMemo(
    () => sorted.filter((document) => `${document.title} ${document.authors ?? ''} ${document.originalFilename}`.toLocaleLowerCase().includes(needle)),
    [sorted, needle],
  )
  const matches = useMemo(() => needle ? new Set(filteredDocuments.map((document) => document.id)) : null, [filteredDocuments, needle])
  const flags = useMemo(() => citationFlags(citations), [citations])
  const selected = documents.find((document) => document.id === selectedId) ?? null
  const taskRunning = activeTask !== null && activeTask.status !== 'COMPLETED' && activeTask.status !== 'FAILED'
  // An empty space always shows the shelf: its one empty slot is the invitation to add a book.
  const shownView: LibraryView = documents.length === 0 ? 'shelf' : view
  const showShelf = shownView === 'shelf' && space !== null && !loading
  const listRef = useRef<HTMLDivElement>(null)

  // Without a shelf on screen, an incoming book lands on the list's add row instead.
  useEffect(() => {
    if (shownView === 'list') receiveIncoming(signal, listRef.current?.querySelector('.list-add') ?? listRef.current)
  }, [signal, shownView])

  return (
    <aside className="document-panel" aria-labelledby="documents-heading">
      <header className="panel-header">
        <h2 id="documents-heading">案头文献</h2>
        <span className="document-count px-text" title={`${readyCount} 篇可检索，共 ${documents.length} 篇`}>{readyCount}/{documents.length}</span>
        {documents.length > 0 && (
          <div className="view-toggle" role="group" aria-label="文献展示方式">
            <button type="button" aria-pressed={view === 'shelf'} aria-label="书架" title="书架" onClick={() => changeView('shelf')}><LibraryBig aria-hidden="true" /></button>
            <button type="button" aria-pressed={view === 'list'} aria-label="列表" title="列表" onClick={() => changeView('list')}><List aria-hidden="true" /></button>
          </div>
        )}
      </header>
      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" tabIndex={-1} aria-hidden="true" onChange={pickFile} />

      {space && !canEdit && (
        <div className="viewer-notice">
          <FileText aria-hidden="true" />
          <p><strong>只读空间</strong><span>可以检索和提问，不能上传。</span></p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="document-controls">
          <label className="document-search">
            <Search aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、作者…" aria-label="搜索文献" />
            {query && <button type="button" className="search-clear" aria-label="清空搜索框" onClick={() => setQuery('')}><X aria-hidden="true" /></button>}
          </label>
          <div className="document-sort">
            <span aria-live="polite">{query ? `找到 ${filteredDocuments.length} 篇` : ''}</span>
            <select aria-label="文献排序" value={sort} onChange={(event) => setSort(event.target.value as 'recent' | 'title')}>
              <option value="recent">最近添加</option>
              <option value="title">按标题</option>
            </select>
          </div>
        </div>
      )}

      {loading && <div className="panel-loading"><LoaderCircle className="spin" aria-hidden="true" />载入文献…</div>}

      {showShelf && (
        <>
          <Bookshelf
            documents={sorted}
            matches={matches}
            selectedId={selectedId}
            flags={flags}
            scanning={scanning}
            ghost={incoming}
            signal={signal}
            canAdd={canEdit}
            addDisabled={uploading}
            addHint={uploading ? '上一本还在整理' : `添加文献 · ${limits}`}
            onSelect={setSelectedId}
            onAdd={openPicker}
          />
          {selected && (
            <DocumentDetail
              key={selected.id}
              document={selected}
              numbers={flags.get(selected.id)}
              canEdit={canEdit}
              onAsk={() => onAskAbout(selected)}
              onClose={() => setSelectedId(null)}
              onDelete={() => setPendingDelete(selected)}
            />
          )}
        </>
      )}

      {!loading && space && documents.length === 0 && !incoming && <p className="shelf-caption">{canEdit ? `书架还空着 · ${limits}` : '书架还空着，等待空间编辑者上传'}</p>}
      {!space && (
        <>
          <div className="shelf" aria-hidden="true" />
          <p className="shelf-caption">尚未选择空间</p>
        </>
      )}
      {query && filteredDocuments.length === 0 && <div className="documents-empty"><Search aria-hidden="true" /><strong>没有匹配的文献</strong><button type="button" className="text-button" onClick={() => setQuery('')}>清除搜索</button></div>}

      {activeTask && (
        <section className={`task-card ${activeTask.status.toLowerCase()}`} aria-live="polite">
          <div className="task-card-heading">
            {activeTask.status === 'FAILED'
              ? <AlertCircle aria-hidden="true" />
              : activeTask.status === 'COMPLETED'
                ? <CheckCircle2 aria-hidden="true" />
                : <LoaderCircle className="spin" aria-hidden="true" />}
            <strong>{activeTask.status === 'COMPLETED' ? '已入库' : activeTask.status === 'FAILED' ? '入库失败' : activeTask.status === 'PROCESSING' ? '解析 · 分段 · 建索引' : '排队中'}</strong>
            {activeTask.status === 'COMPLETED' && <span className="px-text">{activeTask.passageCount ?? 0} 片段 · {((activeTask.totalDurationMs ?? 0) / 1000).toFixed(1)}s</span>}
          </div>
          {taskRunning && <div className="task-progress" data-step={activeTask.status === 'PROCESSING' ? 2 : 1}><i /><i /><i /><i /><i /><i /><i /><i /></div>}
          {activeTask.failureReason && <p className="task-error">{activeTask.failureReason}</p>}
        </section>
      )}

      {shownView === 'list' && !loading && (
        <div className="document-list" aria-live="polite" ref={listRef}>
          {canEdit && documents.length > 0 && (
            <button type="button" className="list-add" disabled={uploading} title={limits} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); openPicker({ x: rect.left + rect.width / 2, y: rect.top }) }}>
              <Plus aria-hidden="true" />{uploading ? '正在处理文献…' : '添加 PDF 文献'}
            </button>
          )}
          {filteredDocuments.map((document) => {
            const cloth = spineCloths[spineFor(document).cloth]
            return (
              <article className="document-card" key={document.id} data-id={document.id}>
                <div className="document-icon"><i style={{ background: cloth.cover, boxShadow: `inset 2px 0 0 ${cloth.light}, inset -2px 0 0 ${cloth.dark}` }} /></div>
                <div className="document-copy">
                  <strong title={document.title}>{document.title}</strong>
                  <span>{document.authors || document.originalFilename}</span>
                  <DocumentMeta document={document} numbers={flags.get(document.id)} />
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
            )
          })}
        </div>
      )}

      <DemoNotice compact />

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
              if (pendingDelete) { onDelete(pendingDelete); if (pendingDelete.id === selectedId) setSelectedId(null) }
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

function DocumentMeta({ document, numbers }: { document: LiteratureDocument; numbers?: number[] }) {
  return (
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
      {numbers && <small className="cited-chip" title="本次回答引用了这篇文献">{numbers.map((number) => `[${number}]`).join(' ')}</small>}
    </div>
  )
}

/** The opened book: everything the spine cannot show. */
function DocumentDetail({ document, numbers, canEdit, onAsk, onClose, onDelete }: { document: LiteratureDocument; numbers?: number[]; canEdit: boolean; onAsk(): void; onClose(): void; onDelete(): void }) {
  const cloth = spineCloths[spineFor(document).cloth]
  return (
    <article className="book-detail px-box" aria-label={`文献详情：${document.title}`} style={{ borderTopColor: cloth.cover }}>
      <i className="book-detail-ribbon" style={{ background: cloth.cover }} aria-hidden="true" />
      <div className="book-detail-actions">
        {canEdit && <button type="button" className="icon-button document-delete" aria-label={`删除文献《${document.title}》`} title="删除文献及其索引" onClick={onDelete}><Trash2 aria-hidden="true" /></button>}
        <button type="button" className="icon-button" aria-label="合上这本书" title="合上" onClick={onClose}><X aria-hidden="true" /></button>
      </div>
      <strong>{document.title}</strong>
      <span>{document.authors || document.originalFilename}</span>
      <DocumentMeta document={document} numbers={numbers} />
      {document.failureReason && <p className="document-failure">{document.failureReason}</p>}
      {document.status === 'READY' && <button type="button" className="text-button book-ask" onClick={onAsk}><MessageSquarePlus aria-hidden="true" />就这篇提问</button>}
    </article>
  )
}
