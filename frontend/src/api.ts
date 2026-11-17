import type {
  AnswerMetrics,
  AuthResponse,
  Citation,
  ConversationDetail,
  ConversationSummary,
  DocumentUploadResult,
  IndexingTask,
  KnowledgeSpace,
  LiteratureDocument,
  Refusal,
  ResearchGroup,
  RetrievalStrategy,
} from './types'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { message?: string; code?: string }
    return new ApiError(body.message || `请求失败（${response.status}）`, response.status, body.code)
  } catch {
    return new ApiError(`请求失败（${response.status}）`, response.status)
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) throw await readError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  login(username: string, password: string) {
    return request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  register(username: string, displayName: string, password: string) {
    return request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, displayName, password }),
    })
  },

  me(token: string) {
    return request<{ id: string; username: string; displayName: string }>('/api/v1/auth/me', {}, token)
  },

  listSpaces(token: string) {
    return request<KnowledgeSpace[]>('/api/v1/spaces', {}, token)
  },

  createSpace(token: string, name: string, groupId: string | null) {
    return request<KnowledgeSpace>('/api/v1/spaces', {
      method: 'POST',
      body: JSON.stringify({ name, groupId }),
    }, token)
  },

  listGroups(token: string) {
    return request<ResearchGroup[]>('/api/v1/groups', {}, token)
  },

  createGroup(token: string, name: string) {
    return request<ResearchGroup>('/api/v1/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }, token)
  },

  addGroupMember(token: string, groupId: string, userId: string, role: 'EDITOR' | 'VIEWER') {
    return request<void>(`/api/v1/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }, token)
  },

  listDocuments(token: string, spaceId: string) {
    return request<LiteratureDocument[]>(`/api/v1/spaces/${spaceId}/documents`, {}, token)
  },

  uploadDocument(token: string, spaceId: string, file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<DocumentUploadResult>(`/api/v1/spaces/${spaceId}/documents`, {
      method: 'POST',
      body,
    }, token)
  },

  getTask(token: string, taskId: string) {
    return request<IndexingTask>(`/api/v1/indexing-tasks/${taskId}`, {}, token)
  },

  retryTask(token: string, taskId: string) {
    return request<IndexingTask>(`/api/v1/indexing-tasks/${taskId}/retry`, { method: 'POST' }, token)
  },

  deleteDocument(token: string, spaceId: string, documentId: string) {
    return request<void>(`/api/v1/spaces/${spaceId}/documents/${documentId}`, { method: 'DELETE' }, token)
  },

  listConversations(token: string, spaceId: string) {
    return request<ConversationSummary[]>(`/api/v1/spaces/${spaceId}/conversations`, {}, token)
  },

  createConversation(token: string, spaceId: string, title: string) {
    return request<ConversationDetail>(`/api/v1/spaces/${spaceId}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }, token)
  },

  appendConversationMessage(
    token: string,
    spaceId: string,
    conversationId: string,
    role: 'USER' | 'ASSISTANT',
    content: string,
  ) {
    return request<ConversationDetail>(`/api/v1/spaces/${spaceId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    }, token)
  },

  getConversation(token: string, spaceId: string, conversationId: string) {
    return request<ConversationDetail>(`/api/v1/spaces/${spaceId}/conversations/${conversationId}`, {}, token)
  },
}

export interface StreamHandlers {
  onCitations(citations: Citation[]): void
  onToken(token: string): void
  onMetrics(metrics: AnswerMetrics): void
  onRefusal(refusal: Refusal): void
  onDone(): void
}

interface SseEvent {
  event: string
  data: string
}

export function parseSseText(text: string): SseEvent[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map((block) => parseSseBlock(block))
    .filter((event): event is SseEvent => event !== null)
}

function parseSseBlock(block: string): SseEvent | null {
  if (!block.trim()) return null
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
  }
  if (data.length === 0) return null
  return { event, data: data.join('\n') }
}

function dispatchSse(event: SseEvent, handlers: StreamHandlers) {
  switch (event.event) {
    case 'citations':
      handlers.onCitations(JSON.parse(event.data) as Citation[])
      break
    case 'token':
      handlers.onToken((JSON.parse(event.data) as { text: string }).text)
      break
    case 'metrics':
      handlers.onMetrics(JSON.parse(event.data) as AnswerMetrics)
      break
    case 'refusal':
      handlers.onRefusal(JSON.parse(event.data) as Refusal)
      break
    case 'done':
      handlers.onDone()
      break
  }
}

export async function streamAnswer(
  token: string,
  spaceId: string,
  question: string,
  strategy: RetrievalStrategy,
  handlers: StreamHandlers,
  signal?: AbortSignal,
) {
  const response = await fetch(`${API_BASE}/api/v1/spaces/${spaceId}/answers/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ question, limit: 5, strategy }),
    signal,
  })
  if (!response.ok) throw await readError(response)
  if (!response.body) throw new ApiError('浏览器不支持流式响应', 0)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n')
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    blocks.map(parseSseBlock).forEach((event) => {
      if (event) dispatchSse(event, handlers)
    })
    if (done) break
  }
  const finalEvent = parseSseBlock(buffer)
  if (finalEvent) dispatchSse(finalEvent, handlers)
}
