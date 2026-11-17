import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, Library, Menu, X } from 'lucide-react'
import { ApiError, api, streamAnswer } from './api'
import { AuthScreen } from './components/AuthScreen'
import { DocumentPanel } from './components/DocumentPanel'
import { GroupDialog, SpaceDialog } from './components/ManagementDialogs'
import { Sidebar } from './components/Sidebar'
import { Workspace } from './components/Workspace'
import { CommandPalette, ExcerptShelf } from './components/ResearchTools'
import { readShelf, shelfKey } from './research'
import type {
  AnswerRun,
  Citation,
  ConversationDetail,
  ConversationSummary,
  IndexingTask,
  KnowledgeSpace,
  LiteratureDocument,
  Refusal,
  ResearchGroup,
  RetrievalStrategy,
  Session,
} from './types'

const SESSION_KEY = 'litevidence.session.v1'
const SELECTED_SPACE_KEY = 'litevidence.selected-space.v1'

const emptyAnswer: AnswerRun = {
  phase: 'idle',
  question: '',
  text: '',
  citations: [],
  metrics: null,
  refusal: null,
  error: null,
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>([])
  const [groups, setGroups] = useState<ResearchGroup[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(() => localStorage.getItem(SELECTED_SPACE_KEY))
  const [documents, setDocuments] = useState<LiteratureDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null)
  const [activeTask, setActiveTask] = useState<IndexingTask | null>(null)
  const [uploading, setUploading] = useState(false)
  const [answer, setAnswer] = useState<AnswerRun>(emptyAnswer)
  const [spaceDialog, setSpaceDialog] = useState(false)
  const [groupDialog, setGroupDialog] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [managementPending, setManagementPending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(() => window.matchMedia('(min-width: 1180px)').matches)
  const [railTab, setRailTab] = useState<'library' | 'excerpts'>('library')
  const [shelfRevision, setShelfRevision] = useState(0)
  const [draftRevision, setDraftRevision] = useState(0)
  const currentShelfKey = session && selectedSpaceId ? shelfKey(session.user.id, selectedSpaceId) : null
  const savedCitations = useMemo(() => currentShelfKey ? readShelf(currentShelfKey) : [], [currentShelfKey, shelfRevision])
  const streamController = useRef<AbortController | null>(null)
  const pollingGeneration = useRef(0)
  const contextGeneration = useRef(0)
  const activeScope = useRef('')
  activeScope.current = `${session?.user.id ?? ''}:${selectedSpaceId ?? ''}`

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && session) {
        if (document.querySelector('[role="dialog"]') && !commandOpen) return
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    const resize = () => { if (!window.matchMedia('(min-width: 1180px)').matches) setLibraryOpen(false) }
    window.addEventListener('keydown', shortcut)
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('keydown', shortcut); window.removeEventListener('resize', resize) }
  }, [session, commandOpen])

  function toggleCitation(citation: Citation) {
    if (!currentShelfKey) return
    const current = readShelf(currentShelfKey)
    const alreadySaved = current.some((item) => item.passageId === citation.passageId)
    const next = alreadySaved ? current.filter((item) => item.passageId !== citation.passageId) : [...current, citation]
    try {
      localStorage.setItem(currentShelfKey, JSON.stringify(next))
      setShelfRevision((revision) => revision + 1)
      setToast(alreadySaved ? '已从研究摘录移除' : '证据已收藏 · 在右侧「摘录」中查看')
    } catch { setToast('浏览器存储空间不足，摘录未能保存。请先导出已有摘录。') }
  }

  function showLibrary() { setFocused(false); setLibraryOpen(true) }

  const logout = useCallback(() => {
    contextGeneration.current += 1
    streamController.current?.abort()
    pollingGeneration.current += 1
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SELECTED_SPACE_KEY)
    setSession(null)
    setSpaces([])
    setGroups([])
    setSelectedSpaceId(null)
    setDocuments([])
    setConversations([])
    setActiveConversation(null)
    setAnswer(emptyAnswer)
    setCommandOpen(false)
    setFocused(false)
    setUploading(false)
    setActiveTask(null)
  }, [])

  const handleError = useCallback((cause: unknown, fallback: string) => {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    if (cause instanceof ApiError && cause.status === 401) {
      logout()
      return
    }
    setToast(cause instanceof Error ? cause.message : fallback)
  }, [logout])

  const loadCatalog = useCallback(async (current: Session) => {
    try {
      const [nextSpaces, nextGroups] = await Promise.all([
        api.listSpaces(current.accessToken),
        api.listGroups(current.accessToken),
      ])
      setSpaces(nextSpaces)
      setGroups(nextGroups)
      setSelectedSpaceId((existing) => {
        const next = nextSpaces.some((space) => space.id === existing) ? existing : nextSpaces[0]?.id ?? null
        if (next) localStorage.setItem(SELECTED_SPACE_KEY, next)
        else localStorage.removeItem(SELECTED_SPACE_KEY)
        return next
      })
    } catch (cause) {
      handleError(cause, '无法载入知识空间')
    }
  }, [handleError])

  useEffect(() => {
    if (session) void loadCatalog(session)
  }, [session, loadCatalog])

  useEffect(() => {
    if (!session || !selectedSpaceId) {
      setDocuments([])
      setConversations([])
      setActiveConversation(null)
      return
    }
    let active = true
    setDocumentsLoading(true)
    api.listDocuments(session.accessToken, selectedSpaceId)
      .then((items) => { if (active) setDocuments(items) })
      .catch((cause) => { if (active) handleError(cause, '无法载入文献') })
      .finally(() => { if (active) setDocumentsLoading(false) })
    api.listConversations(session.accessToken, selectedSpaceId)
      .then((items) => { if (active) setConversations(items) })
      .catch((cause) => { if (active) handleError(cause, '无法载入会话记录') })
    setAnswer(emptyAnswer)
    setActiveConversation(null)
    setActiveTask(null)
    return () => { active = false }
  }, [session, selectedSpaceId, handleError])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  function authenticated(next: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    setSession(next)
  }

  function selectSpace(spaceId: string) {
    if (spaceId === selectedSpaceId) return
    contextGeneration.current += 1
    streamController.current?.abort()
    pollingGeneration.current += 1
    setDocuments([])
    setAnswer(emptyAnswer)
    setActiveConversation(null)
    setActiveTask(null)
    setUploading(false)
    localStorage.setItem(SELECTED_SPACE_KEY, spaceId)
    setSelectedSpaceId(spaceId)
  }

  async function refreshDocuments(spaceId = selectedSpaceId) {
    if (!session || !spaceId) return
    const scope = `${session.user.id}:${spaceId}`
    const items = await api.listDocuments(session.accessToken, spaceId)
    if (activeScope.current === scope) setDocuments(items)
  }

  async function upload(file: File) {
    if (!session || !selectedSpaceId) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setToast('请选择 PDF 文件')
      return
    }
    setUploading(true)
    const generation = ++pollingGeneration.current
    try {
      const result = await api.uploadDocument(session.accessToken, selectedSpaceId, file)
      if (generation !== pollingGeneration.current) return
      setToast('上传成功，正在异步构建索引')
      await refreshDocuments()
      await followTask(result.taskId, generation)
    } catch (cause) {
      if (generation === pollingGeneration.current) handleError(cause, '上传失败')
    } finally {
      if (generation === pollingGeneration.current) setUploading(false)
    }
  }

  async function followTask(taskId: string, generation: number) {
    if (!session) return
    for (let attempt = 0; attempt < 300 && pollingGeneration.current === generation; attempt += 1) {
      const task = await api.getTask(session.accessToken, taskId)
      if (pollingGeneration.current !== generation) return
      setActiveTask(task)
      await refreshDocuments()
      if (pollingGeneration.current !== generation) return
      if (task.status === 'COMPLETED') {
        setToast(`索引完成：${task.passageCount ?? 0} 个证据片段`)
        return
      }
      if (task.status === 'FAILED') {
        setToast('文献处理失败，请查看失败原因')
        return
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
    }
  }

  async function ask(question: string, strategy: RetrievalStrategy) {
    if (!session || !selectedSpaceId) return
    streamController.current?.abort()
    const controller = new AbortController()
    streamController.current = controller
    const generation = contextGeneration.current
    const isCurrent = () => !controller.signal.aborted && generation === contextGeneration.current
    let fullText = ''
    let refusalData: Refusal | null = null
    setAnswer({ ...emptyAnswer, phase: 'retrieving', question })
    try {
      await streamAnswer(session.accessToken, selectedSpaceId, question, strategy, {
        onCitations: (citations) => { if (isCurrent()) setAnswer((current) => ({ ...current, phase: 'streaming', citations })) },
        onToken: (token) => {
          if (!isCurrent()) return
          fullText += token
          setAnswer((current) => ({ ...current, phase: 'streaming', text: current.text + token }))
        },
        onMetrics: (metrics) => { if (isCurrent()) setAnswer((current) => ({ ...current, metrics })) },
        onRefusal: (refusal) => {
          if (!isCurrent()) return
          refusalData = refusal
          setAnswer((current) => ({ ...current, phase: 'refused', refusal }))
        },
        onDone: () => {
          if (!isCurrent()) return
          setAnswer((current) => ({ ...current, phase: current.refusal ? 'refused' : 'complete' }))
          void persistExchange(question, fullText, refusalData, generation)
        },
      }, controller.signal)
    } catch (cause) {
      if (!isCurrent() || (cause instanceof DOMException && cause.name === 'AbortError')) return
      setAnswer((current) => ({ ...current, phase: 'error', error: cause instanceof Error ? cause.message : '回答生成失败' }))
      handleError(cause, '回答生成失败')
    } finally {
      if (streamController.current === controller) streamController.current = null
    }
  }

  async function persistExchange(question: string, answerText: string, refusal: Refusal | null, generation: number) {
    if (!session || !selectedSpaceId) return
    const content = refusal ? `【已拒答】${refusal.message}` : answerText
    if (!content.trim()) return
    try {
      let conversationId = activeConversation?.id ?? null
      if (!conversationId) {
        const title = question.length > 40 ? `${question.slice(0, 40)}…` : question
        const created = await api.createConversation(session.accessToken, selectedSpaceId, title)
        conversationId = created.id
      }
      await api.appendConversationMessage(session.accessToken, selectedSpaceId, conversationId, 'USER', question)
      await api.appendConversationMessage(session.accessToken, selectedSpaceId, conversationId, 'ASSISTANT', content)
      const detail = await api.getConversation(session.accessToken, selectedSpaceId, conversationId)
      if (generation !== contextGeneration.current) return
      setActiveConversation(detail)
      await refreshConversations(generation)
    } catch (cause) {
      if (generation === contextGeneration.current) handleError(cause, '问答内容未能保存到会话记录')
    }
  }

  async function refreshConversations(generation = contextGeneration.current) {
    if (!session || !selectedSpaceId) return
    try {
      const items = await api.listConversations(session.accessToken, selectedSpaceId)
      if (generation === contextGeneration.current) setConversations(items)
    } catch (cause) {
      if (generation === contextGeneration.current) handleError(cause, '无法载入会话记录')
    }
  }

  async function openConversation(conversationId: string) {
    if (!session || !selectedSpaceId) return
    streamController.current?.abort()
    const generation = ++contextGeneration.current
    try {
      const detail = await api.getConversation(session.accessToken, selectedSpaceId, conversationId)
      if (generation !== contextGeneration.current) return
      setActiveConversation(detail)
      setAnswer(emptyAnswer)
      setDraftRevision((revision) => revision + 1)
    } catch (cause) {
      if (generation === contextGeneration.current) handleError(cause, '无法打开会话')
    }
  }

  function startNewConversation() {
    contextGeneration.current += 1
    streamController.current?.abort()
    setActiveConversation(null)
    setAnswer(emptyAnswer)
    setDraftRevision((revision) => revision + 1)
  }

  async function deleteDocument(document: LiteratureDocument) {
    if (!session || !selectedSpaceId) return
    try {
      await api.deleteDocument(session.accessToken, selectedSpaceId, document.id)
      setToast(`已删除文献：${document.title}`)
      await refreshDocuments()
    } catch (cause) {
      handleError(cause, '删除文献失败')
    }
  }

  function stopAnswer() {
    streamController.current?.abort()
    setAnswer((current) => ({ ...current, phase: current.text ? 'complete' : 'idle' }))
  }

  async function createSpace(name: string, groupId: string | null) {
    if (!session) return
    setManagementPending(true)
    try {
      const created = await api.createSpace(session.accessToken, name, groupId)
      await loadCatalog(session)
      selectSpace(created.id)
      setSpaceDialog(false)
      setToast('知识空间已创建')
    } catch (cause) {
      handleError(cause, '创建空间失败')
    } finally {
      setManagementPending(false)
    }
  }

  async function createGroup(name: string) {
    if (!session) return
    setManagementPending(true)
    try {
      await api.createGroup(session.accessToken, name)
      await loadCatalog(session)
      setToast('课题组已创建')
    } catch (cause) {
      handleError(cause, '创建课题组失败')
    } finally {
      setManagementPending(false)
    }
  }

  async function addMember(groupId: string, userId: string, role: 'EDITOR' | 'VIEWER') {
    if (!session) return
    setManagementPending(true)
    try {
      await api.addGroupMember(session.accessToken, groupId, userId, role)
      setGroupDialog(false)
      setToast(`成员已添加为 ${role}`)
    } catch (cause) {
      handleError(cause, '添加成员失败')
    } finally {
      setManagementPending(false)
    }
  }

  async function copyUserId() {
    if (!session) return
    try { await navigator.clipboard.writeText(session.user.id); setToast('成员 ID 已复制') }
    catch { setToast('无法访问剪贴板，请稍后重试') }
  }

  if (!session) return <AuthScreen onAuthenticated={authenticated} />

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null
  const readyDocuments = documents.filter((document) => document.status === 'READY').length

  return (
    <div className={`app-shell ${focused ? 'focus-mode' : ''} ${libraryOpen ? 'library-open' : ''}`}>
      <Sidebar
        open={sidebarOpen}
        user={session.user}
        spaces={spaces}
        groups={groups}
        selectedSpaceId={selectedSpaceId}
        conversations={conversations}
        activeConversationId={activeConversation?.id ?? null}
        onSelectSpace={selectSpace}
        onCreateSpace={() => setSpaceDialog(true)}
        onSelectConversation={(id) => void openConversation(id)}
        onNewConversation={startNewConversation}
        onManageGroups={() => setGroupDialog(true)}
        onLogout={logout}
        onClose={() => setSidebarOpen(false)}
        onCopyUserId={() => void copyUserId()}
        onCommand={() => setCommandOpen(true)}
      />
      <div className="mobile-topbar">
        <button className="icon-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="打开导航"><Menu aria-hidden="true" /></button>
        <strong>{selectedSpace?.name || 'LitEvidence'}</strong>
        <button className="mobile-library-button" type="button" onClick={showLibrary} aria-label="打开文献与摘录"><Library aria-hidden="true" /><span>{readyDocuments} 篇</span></button>
      </div>
      <div className="workbench">
        <Workspace
          key={`${selectedSpaceId ?? 'no-space'}:${draftRevision}`}
          space={selectedSpace}
          readyDocuments={readyDocuments}
          answer={answer}
          conversation={activeConversation}
          savedCitations={savedCitations}
          focused={focused}
          onToggleFocus={() => setFocused((value) => !value)}
          onCommand={() => setCommandOpen(true)}
          onLibrary={showLibrary}
          onSaveCitation={toggleCitation}
          onAsk={(question, strategy) => void ask(question, strategy)}
          onStop={stopAnswer}
          onCreateSpace={() => setSpaceDialog(true)}
        />
        {!focused && libraryOpen && <aside className="research-rail" aria-label="文献与研究摘录">
          <div className="rail-tabs"><div role="group" aria-label="文献栏视图"><button type="button" className={railTab === 'library' ? 'active' : ''} aria-pressed={railTab === 'library'} onClick={() => setRailTab('library')}><Library aria-hidden="true" />文献</button><button type="button" className={railTab === 'excerpts' ? 'active' : ''} aria-pressed={railTab === 'excerpts'} onClick={() => setRailTab('excerpts')}><Bookmark aria-hidden="true" />摘录 <span>{savedCitations.length}</span></button></div><button type="button" className="icon-button" aria-label="收起文献栏" onClick={() => setLibraryOpen(false)}><X aria-hidden="true" /></button></div>
        {railTab === 'library' ? <DocumentPanel
          key={selectedSpaceId ?? 'no-space'}
          space={selectedSpace}
          documents={documents}
          loading={documentsLoading}
          activeTask={activeTask}
          uploading={uploading}
          onUpload={(file) => void upload(file)}
          onDelete={(document) => void deleteDocument(document)}
        /> : <ExcerptShelf citations={savedCitations} spaceName={selectedSpace?.name ?? '研究摘录'} onRemove={toggleCitation} />}
        </aside>}
      </div>
      {!focused && libraryOpen && <button type="button" className="rail-scrim" aria-label="收起文献与摘录" onClick={() => setLibraryOpen(false)} />}
      {commandOpen && <CommandPalette spaces={spaces} conversations={conversations} focused={focused} onClose={() => setCommandOpen(false)} onSpace={selectSpace} onConversation={(id) => void openConversation(id)} onNew={startNewConversation} onFocus={() => setFocused((value) => !value)} onLibrary={() => { setRailTab('library'); showLibrary() }} />}
      <SpaceDialog open={spaceDialog} groups={groups} user={session.user} pending={managementPending} onClose={() => setSpaceDialog(false)} onCreate={(name, groupId) => void createSpace(name, groupId)} />
      <GroupDialog open={groupDialog} groups={groups} user={session.user} pending={managementPending} onClose={() => setGroupDialog(false)} onCreate={(name) => void createGroup(name)} onAddMember={(groupId, userId, role) => void addMember(groupId, userId, role)} />
      {toast && <div className="toast" role="status"><span>{toast}</span><button type="button" onClick={() => setToast(null)} aria-label="关闭通知"><X aria-hidden="true" /></button></div>}
    </div>
  )
}
