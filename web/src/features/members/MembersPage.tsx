import { useState } from 'react'
import { useTenant } from '../tenant/TenantProvider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import { fetchMembers, inviteMember } from '../../mocks/db'
import type { MemberRole } from '../../mocks/db'
import { Icon } from '../../shared/components'
import { formatDate } from '../../shared/utils/format'
import { usePermission } from '../../shared/hooks/usePermission'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import './members.css'

const ROLE_CONFIG: Record<MemberRole, { label: string; cls: string }> = {
  OrgAdmin: { label: 'Org Admin', cls: 'role-chip--admin' },
  Manager: { label: 'Manager', cls: 'role-chip--manager' },
  Staff: { label: 'Staff', cls: 'role-chip--staff' },
  Viewer: { label: 'Viewer', cls: 'role-chip--viewer' },
}

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['OrgAdmin', 'Manager', 'Staff', 'Viewer']),
})
type InviteValues = z.infer<typeof inviteSchema>

function InviteDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ email, role }: { email: string; role: MemberRole }) =>
      inviteMember(orgId, email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members(orgId) })
      onClose()
    },
  })
  const { register, handleSubmit, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'Staff' },
  })

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog-container" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className="dialog-header">
          <Icon name="person_add" size={24} />
          <h2 id="invite-title" className="dialog-title">Invite Member</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <form id="invite-form" onSubmit={handleSubmit((d) => mutateAsync({ email: d.email, role: d.role as MemberRole }))}>
          <div className="dialog-body">
            <div className="field-group">
              <label className="field-label" htmlFor="inv-email">Email address *</label>
              <input id="inv-email" type="email" className={`text-field ${errors.email ? 'text-field--error' : ''}`} placeholder="name@company.com" {...register('email')} />
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="inv-role">Role *</label>
              <select id="inv-role" className="select-field" {...register('role')}>
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
                <option value="OrgAdmin">Org Admin</option>
                <option value="Viewer">Viewer (read-only)</option>
              </select>
            </div>
          </div>
        </form>
        <div className="dialog-actions">
          <button type="button" className="btn btn--text" onClick={onClose}>Cancel</button>
          <button type="submit" form="invite-form" className="btn btn--primary" disabled={isPending}>
            {isPending ? 'Inviting…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MembersPage() {
  const { activeOrg } = useTenant()
  const orgId = activeOrg?.orgId ?? ''
  const canManage = usePermission('member.manage')
  const [showInvite, setShowInvite] = useState(false)

  const { data: members, isLoading } = useQuery({
    queryKey: queryKeys.members(orgId),
    queryFn: () => fetchMembers(orgId),
    enabled: !!orgId,
  })

  return (
    <div className="members-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{members?.length ?? '—'} member{members?.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <button className="btn btn--primary" onClick={() => setShowInvite(true)}>
            <Icon name="person_add" size={18} />
            Invite Member
          </button>
        )}
      </div>

      <div className="members-table-wrap">
        {isLoading ? (
          <div className="table-skeleton">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton-row" />)}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="empty-state">
            <Icon name="group" size={48} />
            <h3>No members</h3>
            <p>Invite your team to get started.</p>
          </div>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>MFA</th>
                <th>Joined</th>
                <th>Status</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const roleConf = ROLE_CONFIG[m.role]
                return (
                  <tr key={m.id} className="member-row">
                    <td>
                      <div className="member-cell">
                        <div className="member-avatar">
                          {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="member-info">
                          <span className="member-name">{m.name}</span>
                          <span className="member-email">{m.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-chip ${roleConf.cls}`}>{roleConf.label}</span>
                    </td>
                    <td>
                      {m.mfaEnabled ? (
                        <span className="mfa-badge mfa-badge--on">
                          <Icon name="verified_user" size={12} filled />
                          Enabled
                        </span>
                      ) : (
                        <span className="mfa-badge mfa-badge--off">
                          <Icon name="lock_open" size={12} />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="text-muted">{formatDate(m.joinedAt)}</td>
                    <td>
                      <span className={`status-chip ${m.status === 'active' ? 'status-chip--success' : 'status-chip--warning'}`}>
                        {m.status === 'active' ? 'Active' : 'Invited'}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <button className="icon-btn" aria-label="Member options">
                          <Icon name="more_vert" size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && <InviteDialog orgId={orgId} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
