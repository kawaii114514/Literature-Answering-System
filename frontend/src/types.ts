export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER'
export type RetrievalStrategy = 'VECTOR' | 'HYBRID_RRF' | 'HYBRID_RERANK'
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'
export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface User {
  id: string
  username: string
  displayName: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresAt: string
  user: User
}

export interface Session extends AuthResponse {}

export interface KnowledgeSpace {
  id: string
  ownerUserId: string
  groupId: string | null
  name: string
  createdAt: string
  role: MemberRole
}

export interface ResearchGroup {
  id: string
  name: string
  ownerUserId: string
  createdAt: string
}

export interface LiteratureDocument {
  id: string
  spaceId: string
  originalFilename: string
  title: string
  authors: string | null
  publicationYear: number | null
  pageCount: number | null
  status: DocumentStatus
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentUploadResult {
  documentId: string
  taskId: string
  documentStatus: DocumentStatus
  taskStatus: TaskStatus
}

export interface IndexingTask {
  id: string
  documentId: string
  status: TaskStatus
  attemptCount: number
  failureReason: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  parseDurationMs: number | null
  chunkDurationMs: number | null
  vectorIndexDurationMs: number | null
  keywordIndexDurationMs: number | null
  totalDurationMs: number | null
  passageCount: number | null
}

export interface Citation {
  citationNumber: number
  passageId: string
  documentId: string
  documentTitle: string
  pageStart: number
  pageEnd: number
  excerpt: string
  score: number
}

export interface AnswerMetrics {
  retrievalDurationMs: number | null
  fusionDurationMs: number | null
  rerankDurationMs: number | null
  modelDurationMs: number | null
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  candidateCount: number | null
}

export interface Refusal {
  message: string
  reason: string
}

export type AnswerPhase = 'idle' | 'retrieving' | 'streaming' | 'complete' | 'refused' | 'error'

export interface AnswerRun {
  phase: AnswerPhase
  question: string
  text: string
  citations: Citation[]
  metrics: AnswerMetrics | null
  refusal: Refusal | null
  error: string | null
}
