import { useState } from 'react'
import type { Product } from './types'
import { StatusChip } from './StatusChip'
import { StockAdjustDialog } from './StockAdjustDialog'
import { useProductMovements } from './hooks'
import { Icon } from '../../shared/components'
import { formatCurrency, formatDate, formatDateTime } from '../../shared/utils/format'
import { maskSupplierCost } from '../../shared/utils/mask'
import { usePermission } from '../../shared/hooks/usePermission'

const MOVEMENT_ICON: Record<string, string> = {
  received: 'arrow_downward',
  sale: 'shopping_cart',
  transfer: 'swap_horiz',
  adjustment: 'tune',
  return: 'keyboard_return',
  damaged: 'broken_image',
}

interface ProductSheetProps {
  tenantId: string
  product: Product
  onClose: () => void
}

export function ProductSheet({ tenantId, product, onClose }: ProductSheetProps) {
  const [tab, setTab] = useState<'details' | 'movements'>('details')
  const [showAdjust, setShowAdjust] = useState(false)
  const [costRevealed, setCostRevealed] = useState(false)
  const canAdjust = usePermission('product.adjust')

  const { data: movements, isLoading: movLoading } = useProductMovements(tenantId, product.id)

  return (
    <>
      <div className="side-sheet-backdrop" onClick={onClose} />
      <aside className="side-sheet" role="dialog" aria-modal="true" aria-label={product.name}>
        {/* Header */}
        <div className="side-sheet-header">
          <div className="side-sheet-avatar">{product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : product.imageInitial}</div>
          <div className="side-sheet-title-group">
            <h2 className="side-sheet-title">{product.name}</h2>
            <code className="side-sheet-sku">{product.sku}</code>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Status + Actions */}
        <div className="side-sheet-actions">
          <StatusChip quantity={product.quantity} reorderLevel={product.reorderLevel} />
          {canAdjust && (
            <button className="btn btn--tonal btn--sm" onClick={() => setShowAdjust(true)}>
              <Icon name="tune" size={16} />
              Adjust Stock
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="sheet-tabs">
          <button
            className={`sheet-tab ${tab === 'details' ? 'active' : ''}`}
            onClick={() => setTab('details')}
          >
            Details
          </button>
          <button
            className={`sheet-tab ${tab === 'movements' ? 'active' : ''}`}
            onClick={() => setTab('movements')}
          >
            Movements
          </button>
        </div>

        <div className="side-sheet-body">
          {tab === 'details' && (
            <div className="details-tab">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{product.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Quantity</span>
                  <span className="detail-value tabular-nums">{product.quantity.toLocaleString('en-IN')}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reorder Level</span>
                  <span className="detail-value tabular-nums">{product.reorderLevel}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Sale Price</span>
                  <span className="detail-value tabular-nums">{formatCurrency(product.price)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Supplier Cost</span>
                  <span className="detail-value tabular-nums detail-value--masked">
                    {maskSupplierCost(product.supplierCost, costRevealed)}
                    <button
                      className="reveal-btn"
                      onClick={() => setCostRevealed((v) => !v)}
                      aria-label={costRevealed ? 'Hide supplier cost' : 'Reveal supplier cost'}
                    >
                      <Icon name={costRevealed ? 'visibility_off' : 'visibility'} size={16} />
                    </button>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">{formatDate(product.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{formatDate(product.updatedAt)}</span>
                </div>
              </div>
              {product.description && (
                <div className="detail-description">
                  <span className="detail-label">Description</span>
                  <p className="detail-desc-text">{product.description}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'movements' && (
            <div className="movements-tab">
              {movLoading ? (
                <div className="sheet-loading">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton-row" />
                  ))}
                </div>
              ) : !movements || movements.length === 0 ? (
                <div className="empty-mini">
                  <Icon name="inbox" size={32} />
                  <span>No movements yet</span>
                </div>
              ) : (
                <ul className="movement-list">
                  {movements.map((mv) => (
                    <li key={mv.id} className="movement-item">
                      <div className="movement-icon movement-icon--primary">
                        <Icon name={MOVEMENT_ICON[mv.type] ?? 'swap_horiz'} size={16} />
                      </div>
                      <div className="movement-info">
                        <span className="movement-product" style={{ textTransform: 'capitalize' }}>
                          {mv.type}
                        </span>
                        <span className="movement-meta">
                          {mv.reference} · {formatDateTime(mv.date)}
                        </span>
                        {mv.note && <span className="movement-meta">{mv.note}</span>}
                      </div>
                      <span className={`movement-qty ${mv.quantity < 0 ? 'movement-qty--neg' : 'movement-qty--pos'}`}>
                        {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>

      {showAdjust && (
        <StockAdjustDialog
          tenantId={tenantId}
          productId={product.id}
          productName={product.name}
          currentQty={product.quantity}
          onClose={() => setShowAdjust(false)}
        />
      )}
    </>
  )
}
