
import { useTenant } from '../tenant/TenantProvider'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import { fetchMovements } from '../../mocks/db'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { useUrlState } from '../../shared/hooks/useUrlState'
import { Icon } from '../../shared/components'
import { formatDateTime } from '../../shared/utils/format'
import type { MovementType } from '../../mocks/db'
import './movements.css'

const TYPE_CONFIG: Record<MovementType, { label: string; icon: string; color: string }> = {
  received: { label: 'Received', icon: 'arrow_downward', color: 'success' },
  sale: { label: 'Sale', icon: 'shopping_cart', color: 'error' },
  transfer: { label: 'Transfer', icon: 'swap_horiz', color: 'primary' },
  adjustment: { label: 'Adjustment', icon: 'tune', color: 'warning' },
  return: { label: 'Return', icon: 'keyboard_return', color: 'primary' },
  damaged: { label: 'Damaged', icon: 'broken_image', color: 'error' },
}

export function MovementsPage() {
  const { activeTenant } = useTenant()
  const tenantId = activeTenant?.tenantId ?? ''
  const [search, setSearch] = useUrlState('search')
  const [type, setType] = useUrlState('type')
  const debouncedSearch = useDebounce(search, 300)

  const { data: movements, isLoading } = useQuery({
    queryKey: queryKeys.movements(tenantId, { search: debouncedSearch, type }),
    queryFn: () => fetchMovements(tenantId, {
      search: debouncedSearch || undefined,
      type: type || undefined,
    }),
    enabled: !!tenantId,
  })

  return (
    <div className="movements-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Movements</h1>
          <p className="page-subtitle">Stock movement ledger — {movements?.length ?? '—'} entries</p>
        </div>
      </div>

      <div className="movements-filters">
        <div className="search-bar-wrapper">
          <Icon name="search" size={20} className="search-icon" />
          <input
            type="search"
            className="search-bar"
            placeholder="Search product or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search movements"
          />
          {search && (
            <button className="icon-btn search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <select
          className="select-field select-field--sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div className="movements-table-wrap">
        {isLoading ? (
          <div className="table-skeleton">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton-row" />)}
          </div>
        ) : !movements || movements.length === 0 ? (
          <div className="empty-state">
            <Icon name="receipt_long" size={48} />
            <h3>No movements</h3>
            <p>No stock movements match your filters.</p>
          </div>
        ) : (
          <table className="movements-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Product</th>
                <th>Reference</th>
                <th className="text-right">Qty Change</th>
                <th>Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mv) => {
                const cfg = TYPE_CONFIG[mv.type]
                return (
                  <tr key={mv.id} className="movement-row">
                    <td>
                      <div className={`movement-type-cell movement-type-cell--${cfg.color}`}>
                        <Icon name={cfg.icon} size={16} />
                        <span>{cfg.label}</span>
                      </div>
                    </td>
                    <td className="font-medium">{mv.productName}</td>
                    <td><code className="sku-code">{mv.reference}</code></td>
                    <td className={`text-right tabular-nums font-bold ${mv.quantity < 0 ? 'text-error' : 'text-success'}`}>
                      {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                    </td>
                    <td className="text-muted">{formatDateTime(mv.date)}</td>
                    <td className="text-muted">{mv.note || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
