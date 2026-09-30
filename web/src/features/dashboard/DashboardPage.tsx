
import { useTenant } from '../tenant/TenantProvider'
import { useDashboard } from './hooks'
import { Icon } from '../../shared/components'
import { formatCurrency, formatDateTime } from '../../shared/utils/format'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import './dashboard.css'

function KpiCard({ label, value, icon, color }: {
  label: string
  value: string | number
  icon: string
  color: 'primary' | 'success' | 'warning' | 'error'
}) {
  return (
    <div className={`kpi-card kpi-card--${color}`}>
      <div className="kpi-card__icon">
        <Icon name={icon} size={24} filled />
      </div>
      <div className="kpi-card__body">
        <span className="kpi-card__value">{value}</span>
        <span className="kpi-card__label">{label}</span>
      </div>
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
  const { data, isLoading } = useDashboard(tenantId)

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
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{activeTenant?.name} — overview</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Products"
          value={data.totalProducts}
          icon="inventory_2"
          color="primary"
        />
        <KpiCard
          label="Total Units"
          value={data.totalUnits.toLocaleString('en-IN')}
          icon="warehouse"
          color="success"
        />
        <KpiCard
          label="Low Stock Items"
          value={data.lowStockCount}
          icon="warning"
          color="warning"
        />
        <KpiCard
          label="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          icon="payments"
          color="primary"
        />
      </div>

      {/* Charts + Lists */}
      <div className="dashboard-body">
        {/* Trend Chart */}
        <div className="dashboard-card">
          <h2 className="card-title">Inventory Value Trend</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--sys-primary)" stopOpacity={0.3} />
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
                    background: 'var(--sys-surface-container)',
                    border: '1px solid var(--sys-outline-variant)',
                    borderRadius: '12px',
                    color: 'var(--sys-on-surface)',
                  }}
                  formatter={(value) => [formatCurrency(value as number), 'Value']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--sys-primary)"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-aside">
          {/* Low Stock Items */}
          <div className="dashboard-card">
            <h2 className="card-title">Low Stock Items</h2>
            {data.lowStockItems.length === 0 ? (
              <div className="empty-mini">
                <Icon name="check_circle" size={32} />
                <span>All items in stock</span>
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
                      <span className="low-stock-qty">{item.quantity} units</span>
                    </div>
                    <span className="status-chip status-chip--warning">Low</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Movements */}
          <div className="dashboard-card">
            <h2 className="card-title">Recent Movements</h2>
            {data.recentMovements.length === 0 ? (
              <div className="empty-mini">
                <Icon name="inbox" size={32} />
                <span>No movements yet</span>
              </div>
            ) : (
              <ul className="movement-list">
                {data.recentMovements.map((mv) => (
                  <li key={mv.id} className="movement-item">
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
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
