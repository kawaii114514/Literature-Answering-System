import {
  BookOpen,
  ChevronRight,
  Copy,
  Folder,
  LogOut,
  Plus,
  Users,
  X,
} from 'lucide-react'
import type { KnowledgeSpace, ResearchGroup, User } from '../types'

interface SidebarProps {
  open: boolean
  user: User
  spaces: KnowledgeSpace[]
  groups: ResearchGroup[]
  selectedSpaceId: string | null
  onSelectSpace(spaceId: string): void
  onCreateSpace(): void
  onManageGroups(): void
  onLogout(): void
  onClose(): void
  onCopyUserId(): void
}

const roleLabels = { OWNER: '所有者', EDITOR: '编辑者', VIEWER: '只读' } as const

export function Sidebar({
  open,
  user,
  spaces,
  groups,
  selectedSpaceId,
  onSelectSpace,
  onCreateSpace,
  onManageGroups,
  onLogout,
  onClose,
  onCopyUserId,
}: SidebarProps) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-row">
          <a className="brand brand-light" href="#" aria-label="LitEvidence 工作台">
            <span className="brand-mark"><BookOpen aria-hidden="true" /></span>
            <span>LitEvidence</span>
          </a>
          <button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="关闭导航">
            <X aria-hidden="true" />
          </button>
        </div>

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

        <button type="button" className="group-summary" onClick={onManageGroups}>
          <span><Users aria-hidden="true" /></span>
          <span><strong>课题组管理</strong><small>{groups.length} 个已加入课题组</small></span>
          <ChevronRight aria-hidden="true" />
        </button>

        <div className="sidebar-spacer" />

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
