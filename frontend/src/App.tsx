import { useCallback, useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ApiError, api, streamAnswer } from './api'
import { AuthScreen } from './components/AuthScreen'
import { DocumentPanel } from './components/DocumentPanel'
import { GroupDialog, SpaceDialog } from './components/ManagementDialogs'
import { Sidebar } from './components/Sidebar'
import { Workspace } from './components/Workspace'
import type {
  AnswerRun,
  IndexingTask,
  KnowledgeSpace,
  LiteratureDocument,
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
  const [activeTask, setActiveTask] = useState<IndexingTask | null>(null)
  const [uploading, setUploading] = useState(false)
  const [answer, setAnswer] = useState<AnswerRun>(emptyAnswer)
  const [spaceDialog, setSpaceDialog] = useState(false)
  const [groupDialog, setGroupDialog] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [managementPending, setManagementPending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const streamController = useRef<AbortController | null>(null)
  const pollingGeneration = useRef(0)

  const logout = useCallback(() => {
    streamController.current?.abort()
    pollingGeneration.current += 1
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SELECTED_SPACE_KEY)
    setSession(null)
    setSpaces([])
    setGroups([])
    setSelectedSpaceId(null)
    setDocuments([])
    setAnswer(emptyAnswer)
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
      return
    }
    let active = true
    setDocumentsLoading(true)
    api.listDocuments(session.accessToken, selectedSpaceId)
      .then((items) => { if (active) setDocuments(items) })
      .catch((cause) => { if (active) handleError(cause, '无法载入文献') })
      .finally(() => { if (active) setDocumentsLoading(false) })
    setAnswer(emptyAnswer)
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
    localStorage.setItem(SELECTED_SPACE_KEY, spaceId)
    setSelectedSpaceId(spaceId)
  }

  async function refreshDocuments(spaceId = selectedSpaceId) {
    if (!session || !spaceId) return
    const items = await api.listDocuments(session.accessToken, spaceId)
    setDocuments(items)
  }

  async function upload(file: File) {
    if (!session || !selectedSpaceId) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setToast('请选择 PDF 文件')
      return
    }
    setUploading(true)
    try {
      const result = await api.uploadDocument(session.accessToken, selectedSpaceId, file)
      setToast('上传成功，正在异步构建索引')
      await refreshDocuments()
      const generation = ++pollingGeneration.current
      await followTask(result.taskId, generation)
    } catch (cause) {
      handleError(cause, '上传失败')
    } finally {
      setUploading(false)
    }
  }

  async function followTask(taskId: string, generation: number) {
    if (!session) return
    for (let attempt = 0; attempt < 300 && pollingGeneration.current === generation; attempt += 1) {
      const task = await api.getTask(session.accessToken, taskId)
      setActiveTask(task)
      await refreshDocuments()
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
    setAnswer({ ...emptyAnswer, phase: 'retrieving', question })
    try {
      await streamAnswer(session.accessToken, selectedSpaceId, question, strategy, {
        onCitations: (citations) => setAnswer((current) => ({ ...current, phase: 'streaming', citations })),
        onToken: (token) => setAnswer((current) => ({ ...current, phase: 'streaming', text: current.text + token })),
        onMetrics: (metrics) => setAnswer((current) => ({ ...current, metrics })),
        onRefusal: (refusal) => setAnswer((current) => ({ ...current, phase: 'refused', refusal })),
        onDone: () => setAnswer((current) => ({ ...current, phase: current.refusal ? 'refused' : 'complete' })),
      }, controller.signal)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setAnswer((current) => ({ ...current, phase: 'error', error: cause instanceof Error ? cause.message : '回答生成失败' }))
      handleError(cause, '回答生成失败')
    } finally {
      streamController.current = null
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
    await navigator.clipboard.writeText(session.user.id)
    setToast('成员 ID 已复制')
  }

  if (!session) return <AuthScreen onAuthenticated={authenticated} />

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null
  const readyDocuments = documents.filter((document) => document.status === 'READY').length

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        user={session.user}
        spaces={spaces}
        groups={groups}
        selectedSpaceId={selectedSpaceId}
        onSelectSpace={selectSpace}
        onCreateSpace={() => setSpaceDialog(true)}
        onManageGroups={() => setGroupDialog(true)}
        onLogout={logout}
        onClose={() => setSidebarOpen(false)}
        onCopyUserId={() => void copyUserId()}
      />
      <div className="mobile-topbar">
        <button className="icon-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="打开导航"><Menu aria-hidden="true" /></button>
        <strong>{selectedSpace?.name || 'LitEvidence'}</strong>
        <span>{readyDocuments} 篇</span>
      </div>
      <div className="workbench">
        <Workspace
          space={selectedSpace}
          readyDocuments={readyDocuments}
          answer={answer}
          onAsk={(question, strategy) => void ask(question, strategy)}
          onStop={stopAnswer}
          onCreateSpace={() => setSpaceDialog(true)}
        />
        <DocumentPanel
          space={selectedSpace}
          documents={documents}
          loading={documentsLoading}
          activeTask={activeTask}
          uploading={uploading}
          onUpload={(file) => void upload(file)}
        />
      </div>
      <SpaceDialog open={spaceDialog} groups={groups} user={session.user} pending={managementPending} onClose={() => setSpaceDialog(false)} onCreate={(name, groupId) => void createSpace(name, groupId)} />
      <GroupDialog open={groupDialog} groups={groups} user={session.user} pending={managementPending} onClose={() => setGroupDialog(false)} onCreate={(name) => void createGroup(name)} onAddMember={(groupId, userId, role) => void addMember(groupId, userId, role)} />
      {toast && <div className="toast" role="status"><span>{toast}</span><button type="button" onClick={() => setToast(null)} aria-label="关闭通知"><X aria-hidden="true" /></button></div>}
    </div>
  )
}
