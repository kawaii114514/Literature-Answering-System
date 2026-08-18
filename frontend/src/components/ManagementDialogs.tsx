import { useMemo, useState, type FormEvent } from 'react'
import { Check, FolderPlus, UserPlus, Users } from 'lucide-react'
import type { ResearchGroup, User } from '../types'
import { Modal } from './Modal'

interface SpaceDialogProps {
  open: boolean
  groups: ResearchGroup[]
  user: User
  pending: boolean
  onClose(): void
  onCreate(name: string, groupId: string | null): void
}

export function SpaceDialog({ open, groups, user, pending, onClose, onCreate }: SpaceDialogProps) {
  const ownedGroups = useMemo(() => groups.filter((group) => group.ownerUserId === user.id), [groups, user.id])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'personal' | 'group'>('personal')
  const [groupId, setGroupId] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || (kind === 'group' && !groupId)) return
    onCreate(name.trim(), kind === 'group' ? groupId : null)
  }

  return (
    <Modal open={open} onClose={onClose} title="新建知识空间" description="按研究主题隔离文献、索引和问答记录。">
      <form className="management-form" onSubmit={submit}>
        <label>
          <span>空间名称</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：RAG 检索增强研究" maxLength={200} required autoFocus />
        </label>
        <fieldset>
          <legend>空间类型</legend>
          <div className="choice-grid">
            <button type="button" className={kind === 'personal' ? 'active' : ''} onClick={() => setKind('personal')}>
              <FolderPlus aria-hidden="true" /><span><strong>个人空间</strong><small>仅你本人管理和访问</small></span>{kind === 'personal' && <Check aria-hidden="true" />}
            </button>
            <button type="button" className={kind === 'group' ? 'active' : ''} onClick={() => setKind('group')} disabled={ownedGroups.length === 0}>
              <Users aria-hidden="true" /><span><strong>课题组空间</strong><small>{ownedGroups.length ? '继承课题组成员权限' : '需先创建课题组'}</small></span>{kind === 'group' && <Check aria-hidden="true" />}
            </button>
          </div>
        </fieldset>
        {kind === 'group' && (
          <label>
            <span>所属课题组</span>
            <select value={groupId} onChange={(event) => setGroupId(event.target.value)} required>
              <option value="">选择你拥有的课题组</option>
              {ownedGroups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
            </select>
          </label>
        )}
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>取消</button>
          <button className="button button-primary" type="submit" disabled={pending || !name.trim() || (kind === 'group' && !groupId)}>{pending ? '创建中…' : '创建空间'}</button>
        </div>
      </form>
    </Modal>
  )
}

interface GroupDialogProps {
  open: boolean
  groups: ResearchGroup[]
  user: User
  pending: boolean
  onClose(): void
  onCreate(name: string): void
  onAddMember(groupId: string, userId: string, role: 'EDITOR' | 'VIEWER'): void
}

export function GroupDialog({ open, groups, user, pending, onClose, onCreate, onAddMember }: GroupDialogProps) {
  const [tab, setTab] = useState<'groups' | 'member'>('groups')
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER')
  const ownedGroups = groups.filter((group) => group.ownerUserId === user.id)

  return (
    <Modal open={open} onClose={onClose} title="课题组管理" description="创建课题组，并通过成员 ID 分配编辑或查看权限。">
      <div className="dialog-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'groups'} className={tab === 'groups' ? 'active' : ''} onClick={() => setTab('groups')}>我的课题组</button>
        <button type="button" role="tab" aria-selected={tab === 'member'} className={tab === 'member' ? 'active' : ''} onClick={() => setTab('member')}>添加成员</button>
      </div>
      {tab === 'groups' ? (
        <div className="group-dialog-content">
          <div className="group-list-dialog">
            {groups.length === 0 && <div className="dialog-empty"><Users aria-hidden="true" /><span>还没有加入课题组</span></div>}
            {groups.map((group) => (
              <div className="group-row" key={group.id}><span><Users aria-hidden="true" /></span><div><strong>{group.name}</strong><small>{group.ownerUserId === user.id ? '你是所有者' : '已加入'}</small></div></div>
            ))}
          </div>
          <form className="inline-create-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onCreate(name.trim()) }}>
            <label htmlFor="group-name">新课题组名称</label>
            <div><input id="group-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：智能检索实验室" maxLength={200} /><button className="button button-primary" disabled={pending || !name.trim()} type="submit">创建</button></div>
          </form>
        </div>
      ) : (
        <form className="management-form" onSubmit={(event) => { event.preventDefault(); if (groupId && memberId.trim()) onAddMember(groupId, memberId.trim(), role) }}>
          {ownedGroups.length === 0 ? (
            <div className="dialog-empty tall"><UserPlus aria-hidden="true" /><strong>只有课题组所有者可以添加成员</strong><span>请先在“我的课题组”中创建一个课题组。</span></div>
          ) : (
            <>
              <label><span>课题组</span><select value={groupId} onChange={(event) => setGroupId(event.target.value)} required><option value="">选择课题组</option>{ownedGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
              <label><span>成员 ID</span><input value={memberId} onChange={(event) => setMemberId(event.target.value)} placeholder="粘贴对方在侧栏复制的成员 ID" required /></label>
              <fieldset><legend>成员角色</legend><div className="choice-grid roles">
                <button type="button" className={role === 'VIEWER' ? 'active' : ''} onClick={() => setRole('VIEWER')}><span><strong>VIEWER</strong><small>检索、问答和查看文献</small></span>{role === 'VIEWER' && <Check aria-hidden="true" />}</button>
                <button type="button" className={role === 'EDITOR' ? 'active' : ''} onClick={() => setRole('EDITOR')}><span><strong>EDITOR</strong><small>另可上传和管理文献</small></span>{role === 'EDITOR' && <Check aria-hidden="true" />}</button>
              </div></fieldset>
              <div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>取消</button><button className="button button-primary" type="submit" disabled={pending || !groupId || !memberId.trim()}>{pending ? '添加中…' : '添加成员'}</button></div>
            </>
          )}
        </form>
      )}
    </Modal>
  )
}
