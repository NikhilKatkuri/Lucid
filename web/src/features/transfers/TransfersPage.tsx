import { useState } from 'react'
import { useTenant } from '../tenant/TenantProvider'
import { useTransfers } from './hooks'
import { Icon } from '../../shared/components'
import { formatDateTime } from '../../shared/utils/format'
import { usePermission } from '../../shared/hooks/usePermission'
import type { TransferStatus } from '../../mocks/db'
import './transfers.css'

const STATUS_CONFIG: Record<TransferStatus, { label: string; cls: string; icon: string }> = {
  pending: { label: 'Pending', cls: 'status-chip--warning', icon: 'schedule' },
  in_transit: { label: 'In Transit', cls: 'status-chip--info', icon: 'local_shipping' },
  completed: { label: 'Completed', cls: 'status-chip--success', icon: 'check_circle' },
  cancelled: { label: 'Cancelled', cls: 'status-chip--neutral', icon: 'cancel' },
}

function TransferStatusChip({ status }: { status: TransferStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`status-chip ${cfg.cls}`}>
      <Icon name={cfg.icon} size={12} filled />
      {cfg.label}
    </span>
  )
}

export function TransfersPage() {
  const { activeTenant, activeOrg } = useTenant()
  const tenantId = activeTenant?.tenantId ?? ''
  const orgId = activeOrg?.orgId ?? ''
  const [tab, setTab] = useState<'incoming' | 'outgoing' | 'history'>('incoming')
  const canCreate = usePermission('transfer.create')

  const { data: transfers, isLoading } = useTransfers(orgId, tenantId)

  const incoming = transfers?.filter(
    (t) => t.toTenantId === tenantId && (t.status === 'pending' || t.status === 'in_transit'),
  ) ?? []
  const outgoing = transfers?.filter(
    (t) => t.fromTenantId === tenantId && (t.status === 'pending' || t.status === 'in_transit'),
  ) ?? []
  const history = transfers?.filter(
    (t) => t.status === 'completed' || t.status === 'cancelled',
  ) ?? []

  const tabData = tab === 'incoming' ? incoming : tab === 'outgoing' ? outgoing : history

  return (
    <div className="transfers-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transfers</h1>
          <p className="page-subtitle">Stock movements between locations</p>
        </div>
        {canCreate && (
          <button className="btn btn--primary">
            <Icon name="swap_horiz" size={18} />
            New Transfer
          </button>
        )}
      </div>

      <div className="tab-bar">
        {(['incoming', 'outgoing', 'history'] as const).map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'incoming' && incoming.length > 0 && (
              <span className="tab-badge">{incoming.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="transfers-list">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="skeleton-row" style={{ height: 80 }} />)
        ) : tabData.length === 0 ? (
          <div className="empty-state">
            <Icon name="swap_horiz" size={48} />
            <h3>No transfers</h3>
            <p>No {tab} transfers found.</p>
          </div>
        ) : (
          tabData.map((t) => (
            <div key={t.id} className="transfer-card">
              <div className="transfer-route">
                <div className="transfer-location">
                  <Icon name="store" size={16} />
                  <span>{t.fromTenantName}</span>
                </div>
                <Icon name="arrow_forward" size={20} className="transfer-arrow" />
                <div className="transfer-location">
                  <Icon name="store" size={16} />
                  <span>{t.toTenantName}</span>
                </div>
              </div>
              <div className="transfer-meta">
                <code className="sku-code">{t.id}</code>
                <span className="text-muted">{t.items} item{t.items !== 1 ? 's' : ''}</span>
                <span className="text-muted">{formatDateTime(t.createdAt)}</span>
                {t.note && <span className="text-muted transfer-note">{t.note}</span>}
              </div>
              <div className="transfer-actions">
                <TransferStatusChip status={t.status} />
                {t.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--sm btn--tonal" style={{ background: 'var(--accent-green-container)', color: 'var(--accent-green-on-container)' }}>
                      <Icon name="check" size={14} />
                      Approve
                    </button>
                    <button className="btn btn--sm btn--text" style={{ color: 'var(--sys-error)' }}>
                      <Icon name="close" size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
