
import { getStockStatus, type StockStatus } from './types'
import { Icon } from '../../shared/components'

const STATUS_CONFIG: Record<StockStatus, { label: string; icon: string; cls: string }> = {
  in_stock: { label: 'In Stock', icon: 'check_circle', cls: 'status-chip--success' },
  low: { label: 'Low', icon: 'warning', cls: 'status-chip--warning' },
  out_of_stock: { label: 'Out of Stock', icon: 'cancel', cls: 'status-chip--error' },
}

interface StatusChipProps {
  quantity: number
  reorderLevel: number
  status?: StockStatus
}

export function StatusChip({ quantity, reorderLevel, status }: StatusChipProps) {
  const s = status ?? getStockStatus(quantity, reorderLevel)
  const cfg = STATUS_CONFIG[s]
  return (
    <span className={`status-chip ${cfg.cls}`}>
      <Icon name={cfg.icon} size={12} filled />
      {cfg.label}
    </span>
  )
}
