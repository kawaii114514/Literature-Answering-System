import {
  ChevronRight,
  Copy,
  Folder,
  LogOut,
  MessageSquarePlus,
  MessagesSquare,
  Plus,
  Users,
  X,
  Search,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import type { ConversationSummary, KnowledgeSpace, ResearchGroup, User } from '../types'
import { DeskPlant } from '../pixel/DeskPlant'
import type { MotionPreference } from '../pixel/effects'
import { owlSprite } from '../pixel/Owl'
import { PixelSprite } from '../pixel/PixelSprite'

const brandOwl = owlSprite('open')

interface SidebarProps {
  open: boolean
  user: User
  motion: MotionPreference
  onToggleMotion(): void
  spaces: KnowledgeSpace[]
  groups: ResearchGroup[]
  selectedSpaceId: string | null
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectSpace(spaceId: string): void
  onCreateSpace(): void
  onSelectConversation(conversationId: string): void
  onNewConversation(): void
  onManageGroups(): void
  onLogout(): void
  onClose(): void
  onCopyUserId(): void
  onCommand(): void
}

const roleLabels = { OWNER: '所有者', EDITOR: '编辑者', VIEWER: '只读' } as const

export function Sidebar({
  open,
  user,
  motion,
  onToggleMotion,
  spaces,
  groups,
  selectedSpaceId,
  conversations,
  activeConversationId,
  onSelectSpace,
  onCreateSpace,
  onSelectConversation,
  onNewConversation,
  onManageGroups,
  onLogout,
  onClose,
  onCopyUserId,
  onCommand,
}: SidebarProps) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-row">
          <a className="brand" href="#" aria-label="LitEvidence 工作台" onClick={(event) => { event.preventDefault(); onNewConversation(); onClose() }}>
            <span className="brand-mark brand-owl"><PixelSprite sprite={brandOwl} scale={2} /></span>
            <span>LitEvidence<small>循证 · 文献研究室</small></span>
          </a>
          <button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="关闭导航">
            <X aria-hidden="true" />
          </button>
        </div>
        <button className="sidebar-search" type="button" onClick={() => { onCommand(); onClose() }}><Search aria-hidden="true" /><span>快速跳转</span><kbd>Ctrl K</kbd></button>
        <button className="new-research" type="button" onClick={() => { onNewConversation(); onClose() }}><Plus aria-hidden="true" />开启新的提问<ArrowUpRight aria-hidden="true" /></button>

        <nav className="space-nav" aria-label="知识空间">
          <div className="sidebar-section-heading">
            <span>知识空间</span>
            <button type="button" onClick={onCreateSpace} aria-label="新建知识空间"><Plus aria-hidden="true" /></button>
          </div>
          <div className="space-list">
            {spaces.length === 0 && (
              <button type="button" className="empty-space-button" onClick={onCreateSpace}>
                <Plus aria-hidden="true" />
                <span>创建第一个空间</span>
              </button>
            )}
            {spaces.map((space) => (
              <button
                type="button"
                key={space.id}
                className={`space-item ${selectedSpaceId === space.id ? 'active' : ''}`}
                onClick={() => { onSelectSpace(space.id); onClose() }}
              >
                <span className="space-icon">{space.groupId ? <Users aria-hidden="true" /> : <Folder aria-hidden="true" />}</span>
                <span className="space-copy">
                  <strong>{space.name}</strong>
                  <small>{space.groupId ? '课题组空间' : '个人空间'} · {roleLabels[space.role]}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </nav>

        {selectedSpaceId && (
          <nav className="space-nav conversation-nav" aria-label="会话记录">
            <div className="sidebar-section-heading">
              <span>会话记录</span>
              <button type="button" onClick={onNewConversation} aria-label="开始新会话" title="开始新会话"><MessageSquarePlus aria-hidden="true" /></button>
            </div>
            <div className="space-list conversation-list">
              {conversations.length === 0 && (
                <p className="conversation-empty">提问后自动保存到这里</p>
              )}
              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  className={`space-item conversation-item ${activeConversationId === conversation.id ? 'active' : ''}`}
                  onClick={() => { onSelectConversation(conversation.id); onClose() }}
                >
                  <span className="space-icon"><MessagesSquare aria-hidden="true" /></span>
                  <span className="space-copy">
                    <strong>{conversation.title}</strong>
                    <small>{conversation.messageCount} 条消息 · {formatConversationTime(conversation.updatedAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          </nav>
        )}

        <button type="button" className="group-summary" onClick={onManageGroups}>
          <span><Users aria-hidden="true" /></span>
          <span><strong>课题组管理</strong><small>{groups.length} 个已加入课题组</small></span>
          <ChevronRight aria-hidden="true" />
        </button>

        <div className="sidebar-spacer" />
        <div className="sidebar-desk">
          <DeskPlant conversations={conversations.length} />
          <button type="button" className="motion-toggle" role="switch" aria-checked={motion === 'on'} onClick={onToggleMotion} title={motion === 'on' ? '动效已开启，点击关闭' : '动效已关闭，点击开启'}>
            <Sparkles aria-hidden="true" /><span>动效</span><i aria-hidden="true" />
          </button>
        </div>

        <div className="user-card">
          <div className="avatar" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</div>
          <div className="user-copy">
            <strong>{user.displayName}</strong>
            <span>@{user.username}</span>
          </div>
          <button type="button" className="icon-button subtle" onClick={onLogout} aria-label="退出登录">
            <LogOut aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="user-id-button" onClick={onCopyUserId} title={user.id}>
          <Copy aria-hidden="true" />复制我的成员 ID
        </button>
      </aside>
      {open && <button className="sidebar-scrim" type="button" aria-label="关闭导航" onClick={onClose} />}
    </>
  )
}

function formatConversationTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = Date.now()
  const diffMinutes = Math.floor((now - date.getTime()) / 60000)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  const datePart = sameYear
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  return `${datePart} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
