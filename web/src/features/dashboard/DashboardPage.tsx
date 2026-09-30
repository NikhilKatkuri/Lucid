
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../tenant/TenantProvider'
import { useDashboard } from './hooks'
import { useProducts, useCreateProduct } from '../inventory/hooks'
import { StockAdjustDialog } from '../inventory/StockAdjustDialog'
import { Icon } from '../../shared/components'
import { formatCurrency, formatDateTime } from '../../shared/utils/format'
import { usePermission } from '../../shared/hooks/usePermission'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import './dashboard.css'

// Add Product Form Schema
const createSchema = z.object({
  name: z.string().min(1, 'Required'),
  sku: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  description: z.string().optional(),
  quantity: z.number({ invalid_type_error: 'Required' }).int().min(0),
  reorderLevel: z.number({ invalid_type_error: 'Required' }).int().min(0),
  price: z.number({ invalid_type_error: 'Required' }).min(0),
  supplierCost: z.number({ invalid_type_error: 'Required' }).min(0),
})
type CreateFormValues = z.infer<typeof createSchema>

const CATEGORIES = ['Accessories', 'Electronics', 'Furniture', 'Equipment', 'Wearables', 'Packaging', 'Shelving', 'Other']

function AddProductModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateProduct(tenantId)
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { quantity: 0, reorderLevel: 5, price: 0, supplierCost: 0 },
  })

  const onSubmit = async (data: CreateFormValues) => {
    await mutateAsync({
      name: data.name,
      sku: data.sku,
      category: data.category,
      description: data.description ?? '',
      quantity: data.quantity,
      reorderLevel: data.reorderLevel,
      price: data.price,
      supplierCost: data.supplierCost,
    })
    onClose()
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog-container dialog-container--large" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <Icon name="add_box" size={24} />
          <h2 className="dialog-title">Add New Product</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <form id="dash-add-product-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="dialog-body">
            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label" htmlFor="dash-p-name">Product Name *</label>
                <input id="dash-p-name" className={`text-field ${errors.name ? 'text-field--error' : ''}`} {...register('name')} />
                {errors.name && <span className="field-error">{errors.name.message}</span>}
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="dash-p-sku">SKU Code *</label>
                <input id="dash-p-sku" className={`text-field ${errors.sku ? 'text-field--error' : ''}`} style={{ fontFamily: 'var(--font-mono)' }} {...register('sku')} />
                {errors.sku && <span className="field-error">{errors.sku.message}</span>}
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="dash-p-cat">Category *</label>
                <select id="dash-p-cat" className={`select-field ${errors.category ? 'select-field--error' : ''}`} {...register('category')}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <span className="field-error">{errors.category.message}</span>}
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="dash-p-qty">Initial Quantity</label>
                <input id="dash-p-qty" type="number" className="text-field" min={0} {...register('quantity', { valueAsNumber: true })} />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="dash-p-reorder">Reorder Level</label>
                <input id="dash-p-reorder" type="number" className="text-field" min={0} {...register('reorderLevel', { valueAsNumber: true })} />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="dash-p-price">Sale Price (₹)</label>
                <input id="dash-p-price" type="number" className="text-field" min={0} step={0.01} {...register('price', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="dash-p-desc">Description</label>
              <textarea id="dash-p-desc" className="text-field text-field--textarea" rows={2} {...register('description')} />
            </div>
          </div>
        </form>
        <div className="dialog-actions">
          <button type="button" className="btn btn--text" onClick={onClose}>Cancel</button>
          <button type="submit" form="dash-add-product-form" className="btn btn--primary" disabled={isPending}>
            {isPending ? 'Saving…' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
function KpiCard({
  label,
  value,
  icon,
  color,
  subtitle,
  onClick,
}: {
  label: string
  value: string | number
  icon: string
  color: 'primary' | 'success' | 'warning' | 'error'
  subtitle?: string
  onClick?: () => void
}) {
  return (
    <div
      className={`kpi-card kpi-card--${color} ${onClick ? 'kpi-card--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
    >
      <div className="kpi-card__icon">
        <Icon name={icon} size={24} filled />
      </div>
      <div className="kpi-card__body">
        <span className="kpi-card__value">{value}</span>
        <span className="kpi-card__label">{label}</span>
        {subtitle && <span className="kpi-card__sub">{subtitle}</span>}
      </div>
      {onClick && (
        <div className="kpi-card__arrow">
          <Icon name="arrow_forward" size={16} />
        </div>
      )}
    </div>
  )
}

const movementTypeIcon: Record<string, string> = {
  received: 'arrow_downward',
  sale: 'arrow_upward',
  transfer: 'swap_horiz',
  adjustment: 'tune',
  return: 'keyboard_return',
  damaged: 'broken_image',
}

const movementTypeColor: Record<string, string> = {
  received: 'success',
  sale: 'error',
  transfer: 'primary',
  adjustment: 'warning',
  return: 'primary',
  damaged: 'error',
}

export function DashboardPage() {
  const { activeTenant } = useTenant()
  const tenantId = activeTenant?.tenantId ?? ''
  const navigate = useNavigate()
  const canCreate = usePermission('product.create')
  const canAdjust = usePermission('product.adjust')

  const { data, isLoading } = useDashboard(tenantId)
  const { data: allProducts } = useProducts(tenantId)

  // Chart state
  const [chartMode, setChartMode] = useState<'value' | 'product'>('value')
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  // Modals state
  const [showUnitsModal, setShowUnitsModal] = useState(false)
  const [showValueModal, setShowValueModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<{ id?: string; name?: string; qty?: number } | null>(null)

  // Selected movement modal state
  const [selectedMovement, setSelectedMovement] = useState<typeof data extends undefined ? null : any>(null)

  // Generate product movement timeline data when viewing a product graph
  const productChartData = useMemo(() => {
    if (!selectedProductId || !data) return []
    const movements = data.recentMovements.filter((m) => m.productId === selectedProductId || m.productName.toLowerCase().includes(selectedProductId.toLowerCase()))

    let baseQty = 50
    return movements.map((m, idx) => {
      baseQty = Math.max(0, baseQty + m.quantity)
      return {
        label: `Mv ${idx + 1}`,
        date: formatDateTime(m.date),
        type: m.type,
        change: m.quantity,
        stock: baseQty,
        productName: m.productName,
      }
    })
  }, [selectedProductId, data])

  // Handle clicking a movement item in the recent movements list
  const handleMovementClick = (mv: any) => {
    setSelectedMovement(mv)
    if (mv.productName) {
      setSelectedProductId(mv.productName)
      setChartMode('product')
    }
  }

  // CSV Export handler
  const handleExportCSV = () => {
    if (!allProducts || allProducts.length === 0) return
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Quantity', 'ReorderLevel', 'Price', 'SupplierCost', 'UpdatedAt']
    const rows = allProducts.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.category,
      p.quantity,
      p.reorderLevel,
      p.price,
      p.supplierCost,
      p.updatedAt,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inventory_summary_${activeTenant?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="skeleton-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-kpi" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-bar">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{activeTenant?.name} — real-time overview & stock analytics</p>
        </div>

        <div className="dashboard-quick-actions">
          {canCreate && (
            <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
              <Icon name="add" size={18} />
              Add Product
            </button>
          )}
          {canAdjust && (
            <button className="btn btn--tonal" onClick={() => setAdjustTarget({})}>
              <Icon name="tune" size={18} />
              Adjust Stock
            </button>
          )}
          <button className="btn btn--outlined" onClick={handleExportCSV} title="Export inventory report CSV">
            <Icon name="download" size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Low Stock Notification Banner */}
      {data.lowStockCount > 0 && (
        <div className="dash-alert-banner">
          <div className="dash-alert-content">
            <Icon name="warning" size={20} className="dash-alert-icon" />
            <span>
              <strong>{data.lowStockCount} item{data.lowStockCount === 1 ? '' : 's'}</strong> are currently running low on stock!
            </span>
          </div>
          <div className="dash-alert-actions">
            <button className="btn btn--sm btn--outlined" onClick={() => navigate('/inventory?status=low')}>
              View Low Stock Items
            </button>
            {canAdjust && (
              <button className="btn btn--sm btn--primary" onClick={() => setAdjustTarget({})}>
                Quick Adjust Stock
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Products"
          value={data.totalProducts}
          icon="inventory_2"
          color="primary"
          subtitle="Click to view all products →"
          onClick={() => navigate('/inventory')}
        />
        <KpiCard
          label="Total Units"
          value={data.totalUnits.toLocaleString('en-IN')}
          icon="warehouse"
          color="success"
          subtitle="Click to inspect units breakdown →"
          onClick={() => setShowUnitsModal(true)}
        />
        <KpiCard
          label="Low Stock Items"
          value={data.lowStockCount}
          icon="warning"
          color="warning"
          subtitle="Click to filter low stock →"
          onClick={() => navigate('/inventory?status=low')}
        />
        <KpiCard
          label="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          icon="payments"
          color="primary"
          subtitle="Click for valuation breakdown →"
          onClick={() => setShowValueModal(true)}
        />
      </div>

      {/* Main Dashboard Layout */}
      <div className="dashboard-body">
        {/* Trend & Product Movement Chart */}
        <div className="dashboard-card chart-card">
          <div className="chart-header">
            <div>
              <h2 className="card-title">
                {chartMode === 'value'
                  ? 'Inventory Value Trend'
                  : `Movement Trajectory: ${selectedProductId || 'Product'}`}
              </h2>
              <p className="card-subtext">
                {chartMode === 'value'
                  ? 'Total portfolio valuation over the past 30 days'
                  : 'Product stock level fluctuations from recent movements'}
              </p>
            </div>

            <div className="chart-mode-controls">
              <button
                className={`chart-mode-btn ${chartMode === 'value' ? 'active' : ''}`}
                onClick={() => setChartMode('value')}
              >
                <Icon name="show_chart" size={16} />
                Portfolio Value
              </button>
              <button
                className={`chart-mode-btn ${chartMode === 'product' ? 'active' : ''}`}
                onClick={() => {
                  setChartMode('product')
                  if (!selectedProductId && data.recentMovements[0]) {
                    setSelectedProductId(data.recentMovements[0].productName)
                  }
                }}
              >
                <Icon name="monitoring" size={16} />
                Product Graph
              </button>
            </div>
          </div>

          {chartMode === 'product' && (
            <div className="chart-product-select-row">
              <label htmlFor="dash-prod-graph-select" className="field-label">
                Select Product to View Movement Graph:
              </label>
              <select
                id="dash-prod-graph-select"
                className="select-field select-field--sm"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">Select a product…</option>
                {allProducts?.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.sku}) — {p.quantity} units
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="chart-container">
            {chartMode === 'value' ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--sys-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--sys-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-outline-variant)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--sys-on-surface-variant)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--sys-on-surface-variant)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--sys-surface-container-high)',
                      border: '1px solid var(--sys-outline-variant)',
                      borderRadius: '12px',
                      color: 'var(--sys-on-surface)',
                    }}
                    formatter={(value) => [formatCurrency(value as number), 'Valuation']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--sys-primary)"
                    strokeWidth={2.5}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : productChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={productChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-outline-variant)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--sys-on-surface-variant)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--sys-on-surface-variant)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--sys-surface-container-high)',
                      border: '1px solid var(--sys-outline-variant)',
                      borderRadius: '12px',
                      color: 'var(--sys-on-surface)',
                    }}
                    formatter={(val, _name, item) => [
                      `${val} units (${item.payload.change > 0 ? '+' : ''}${item.payload.change})`,
                      item.payload.type,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="stock"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-mini" style={{ height: '240px', justifyContent: 'center' }}>
                <Icon name="show_chart" size={40} />
                <span>Select a product above or click a movement item to view its movement trajectory chart.</span>
              </div>
            )}
          </div>
        </div>

        {/* Aside: Low Stock & Recent Movements */}
        <div className="dashboard-aside">
          {/* Low Stock Items Widget */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="card-title">Low Stock Items</h2>
              <button className="btn btn--text btn--sm" onClick={() => navigate('/inventory?status=low')}>
                View all
              </button>
            </div>
            {data.lowStockItems.length === 0 ? (
              <div className="empty-mini">
                <Icon name="check_circle" size={32} />
                <span>All items healthy in stock</span>
              </div>
            ) : (
              <ul className="low-stock-list">
                {data.lowStockItems.map((item) => (
                  <li key={item.productId} className="low-stock-item">
                    <div className="low-stock-icon">
                      <Icon name="warning" size={18} filled />
                    </div>
                    <div className="low-stock-info">
                      <span className="low-stock-name">{item.name}</span>
                      <span className="low-stock-qty">{item.quantity} units remaining</span>
                    </div>
                    {canAdjust && (
                      <button
                        type="button"
                        className="btn btn--tonal btn--sm"
                        onClick={() =>
                          setAdjustTarget({
                            id: item.productId,
                            name: item.name,
                            qty: item.quantity,
                          })
                        }
                        title="Adjust stock"
                      >
                        ⚡ Adjust
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Movements Widget */}
          <div className="dashboard-card">
            <div className="card-header-row">
              <h2 className="card-title">Recent Movements</h2>
              <span className="card-hint">Click item to plot graph</span>
            </div>
            {data.recentMovements.length === 0 ? (
              <div className="empty-mini">
                <Icon name="inbox" size={32} />
                <span>No movements recorded</span>
              </div>
            ) : (
              <ul className="movement-list">
                {data.recentMovements.map((mv) => {
                  const isSelected = selectedProductId === mv.productName
                  return (
                    <li
                      key={mv.id}
                      className={`movement-item ${isSelected ? 'movement-item--selected' : ''}`}
                      onClick={() => handleMovementClick(mv)}
                      role="button"
                      tabIndex={0}
                      title="Click to view product graph"
                    >
                      <div className={`movement-icon movement-icon--${movementTypeColor[mv.type]}`}>
                        <Icon name={movementTypeIcon[mv.type] ?? 'swap_horiz'} size={16} />
                      </div>
                      <div className="movement-info">
                        <span className="movement-product">{mv.productName}</span>
                        <span className="movement-meta">{mv.type} · {formatDateTime(mv.date)}</span>
                      </div>
                      <span className={`movement-qty ${mv.quantity < 0 ? 'movement-qty--neg' : 'movement-qty--pos'}`}>
                        {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Total Units Breakdown Modal */}
      {showUnitsModal && (
        <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && setShowUnitsModal(false)}>
          <div className="dialog-container dialog-container--large" role="dialog" aria-modal="true">
            <div className="dialog-header">
              <Icon name="warehouse" size={24} />
              <div>
                <h2 className="dialog-title">Total Units Inventory Breakdown</h2>
                <p className="dialog-subtitle">{data.totalUnits.toLocaleString('en-IN')} total stock units across {allProducts?.length ?? 0} SKUs</p>
              </div>
              <button className="icon-btn" onClick={() => setShowUnitsModal(false)} aria-label="Close">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="dialog-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th className="text-right">Units</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts?.map((prod) => (
                    <tr key={prod.id} className="inventory-row">
                      <td>
                        <div className="product-cell">
                          <div className="product-avatar">{prod.imageInitial}</div>
                          <span className="product-name">{prod.name}</span>
                        </div>
                      </td>
                      <td><code>{prod.sku}</code></td>
                      <td>{prod.category}</td>
                      <td className="text-right tabular-nums"><strong>{prod.quantity.toLocaleString('en-IN')}</strong></td>
                      <td>
                        <span className={`status-chip status-chip--${prod.quantity <= 0 ? 'error' : prod.quantity <= prod.reorderLevel ? 'warning' : 'success'}`}>
                          {prod.quantity <= 0 ? 'Out of Stock' : prod.quantity <= prod.reorderLevel ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="text-right">
                        {canAdjust && (
                          <button
                            className="btn btn--tonal btn--sm"
                            onClick={() => {
                              setShowUnitsModal(false)
                              setAdjustTarget({ id: prod.id, name: prod.name, qty: prod.quantity })
                            }}
                          >
                            ⚡ Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dialog-actions">
              <button className="btn btn--outlined" onClick={() => navigate('/inventory')}>
                Go to Inventory Page →
              </button>
              <button className="btn btn--primary" onClick={() => setShowUnitsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Financial Valuation Modal */}
      {showValueModal && (
        <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && setShowValueModal(false)}>
          <div className="dialog-container dialog-container--large" role="dialog" aria-modal="true">
            <div className="dialog-header">
              <Icon name="payments" size={24} />
              <div>
                <h2 className="dialog-title">Inventory Financial Valuation</h2>
                <p className="dialog-subtitle">Total portfolio asset value: <strong>{formatCurrency(data.inventoryValue)}</strong></p>
              </div>
              <button className="icon-btn" onClick={() => setShowValueModal(false)} aria-label="Close">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="dialog-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Units</th>
                    <th className="text-right">Total Valuation</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts?.map((prod) => {
                    const totalVal = prod.quantity * prod.price
                    return (
                      <tr key={prod.id} className="inventory-row">
                        <td>
                          <div className="product-cell">
                            <div className="product-avatar">{prod.imageInitial}</div>
                            <span className="product-name">{prod.name}</span>
                          </div>
                        </td>
                        <td>{prod.category}</td>
                        <td className="text-right tabular-nums">{formatCurrency(prod.price)}</td>
                        <td className="text-right tabular-nums">{prod.quantity.toLocaleString('en-IN')}</td>
                        <td className="text-right tabular-nums"><strong>{formatCurrency(totalVal)}</strong></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="dialog-actions">
              <button className="btn btn--primary" onClick={() => setShowValueModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Movement Detail Modal */}
      {selectedMovement && (
        <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && setSelectedMovement(null)}>
          <div className="dialog-container" role="dialog" aria-modal="true">
            <div className="dialog-header">
              <Icon name="history" size={24} />
              <h2 className="dialog-title">Movement Detail</h2>
              <button className="icon-btn" onClick={() => setSelectedMovement(null)} aria-label="Close">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="dialog-body">
              <p className="dialog-product-name">{selectedMovement.productName}</p>
              <div className="detail-grid" style={{ marginTop: '12px' }}>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedMovement.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Quantity Change</span>
                  <span className={`detail-value ${selectedMovement.quantity < 0 ? 'movement-qty--neg' : 'movement-qty--pos'}`}>
                    {selectedMovement.quantity > 0 ? '+' : ''}{selectedMovement.quantity} units
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Timestamp</span>
                  <span className="detail-value">{formatDateTime(selectedMovement.date)}</span>
                </div>
                {selectedMovement.reference && (
                  <div className="detail-item">
                    <span className="detail-label">Reference ID</span>
                    <span className="detail-value"><code>{selectedMovement.reference}</code></span>
                  </div>
                )}
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="btn btn--tonal"
                onClick={() => {
                  const p = allProducts?.find((prod) => prod.name === selectedMovement.productName)
                  setSelectedMovement(null)
                  setAdjustTarget({ id: p?.id, name: p?.name || selectedMovement.productName, qty: p?.quantity })
                }}
              >
                ⚡ Adjust Stock for {selectedMovement.productName}
              </button>
              <button className="btn btn--primary" onClick={() => setSelectedMovement(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjust Dialog */}
      {adjustTarget !== null && (
        <StockAdjustDialog
          tenantId={tenantId}
          productId={adjustTarget.id}
          productName={adjustTarget.name}
          currentQty={adjustTarget.qty}
          onClose={() => setAdjustTarget(null)}
        />
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal tenantId={tenantId} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
