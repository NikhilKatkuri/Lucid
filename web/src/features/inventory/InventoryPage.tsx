import { useState } from 'react'
import { useTenant } from '../tenant/TenantProvider'
import { useProducts, useCreateProduct } from './hooks'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { useUrlState } from '../../shared/hooks/useUrlState'
import { usePermission } from '../../shared/hooks/usePermission'
import { StatusChip } from './StatusChip'
import { ProductSheet } from './ProductSheet'
import { Icon } from '../../shared/components'
import { formatCurrency, formatDate } from '../../shared/utils/format'
import type { Product } from './types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import './inventory.css'

const CATEGORIES = ['Accessories', 'Electronics', 'Furniture', 'Equipment', 'Wearables', 'Packaging', 'Shelving', 'Other']

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

function AddProductDialog({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
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
          <h2 className="dialog-title">Add Product</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>
        <form id="add-product-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="dialog-body">
            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label" htmlFor="p-name">Name *</label>
                <input id="p-name" className={`text-field ${errors.name ? 'text-field--error' : ''}`} {...register('name')} />
                {errors.name && <span className="field-error">{errors.name.message}</span>}
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="p-sku">SKU *</label>
                <input id="p-sku" className={`text-field ${errors.sku ? 'text-field--error' : ''}`} style={{ fontFamily: 'var(--font-mono)' }} {...register('sku')} />
                {errors.sku && <span className="field-error">{errors.sku.message}</span>}
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="p-cat">Category *</label>
                <select id="p-cat" className={`select-field ${errors.category ? 'select-field--error' : ''}`} {...register('category')}>
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <span className="field-error">{errors.category.message}</span>}
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="p-qty">Initial Quantity</label>
                <input id="p-qty" type="number" className="text-field" min={0} {...register('quantity', { valueAsNumber: true })} />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="p-reorder">Reorder Level</label>
                <input id="p-reorder" type="number" className="text-field" min={0} {...register('reorderLevel', { valueAsNumber: true })} />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="p-price">Sale Price (₹)</label>
                <input id="p-price" type="number" className="text-field" min={0} step={0.01} {...register('price', { valueAsNumber: true })} />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="p-cost">Supplier Cost (₹)</label>
                <input id="p-cost" type="number" className="text-field" min={0} step={0.01} {...register('supplierCost', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="p-desc">Description</label>
              <textarea id="p-desc" className="text-field text-field--textarea" rows={2} {...register('description')} />
            </div>
          </div>
        </form>
        <div className="dialog-actions">
          <button type="button" className="btn btn--text" onClick={onClose}>Cancel</button>
          <button type="submit" form="add-product-form" className="btn btn--primary" disabled={isPending}>
            {isPending ? 'Adding…' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function InventoryPage() {
  const { activeTenant } = useTenant()
  const tenantId = activeTenant?.tenantId ?? ''

  const [search, setSearch] = useUrlState('search')
  const [category, setCategory] = useUrlState('category')
  const [status, setStatus] = useUrlState('status')
  const debouncedSearch = useDebounce(search, 300)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const canCreate = usePermission('product.create')

  const { data: products, isLoading } = useProducts(tenantId, {
    search: debouncedSearch || undefined,
    category: category || undefined,
    status: status || undefined,
  })

  const allCategories = [...new Set(products?.map((p) => p.category) ?? [])]

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{products?.length ?? '—'} products</p>
        </div>
        {canCreate && (
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            <Icon name="add" size={18} />
            Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="inventory-filters">
        <div className="search-bar-wrapper">
          <Icon name="search" size={20} className="search-icon" />
          <input
            type="search"
            className="search-bar"
            placeholder="Search products or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
          {search && (
            <button className="icon-btn search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <select
          className="select-field select-field--sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className="select-field select-field--sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {(search || category || status) && (
          <button className="btn btn--text btn--sm" onClick={() => { setSearch(''); setCategory(''); setStatus('') }}>
            <Icon name="filter_alt_off" size={16} />
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="inventory-table-wrap">
        {isLoading ? (
          <div className="table-skeleton">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-row" />)}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="empty-state">
            <Icon name="inventory_2" size={48} />
            <h3>No products found</h3>
            <p>{search || category || status ? 'Try adjusting your filters.' : 'Start by adding your first product.'}</p>
            {canCreate && <button className="btn btn--primary" onClick={() => setShowAdd(true)}>Add Product</button>}
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="text-right">Quantity</th>
                <th>Status</th>
                <th className="text-right">Price</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="inventory-row"
                  onClick={() => setSelectedProduct(product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedProduct(product)}
                >
                  <td>
                    <div className="product-cell">
                      <div className="product-avatar">{product.imageInitial}</div>
                      <span className="product-name">{product.name}</span>
                    </div>
                  </td>
                  <td><code className="sku-code">{product.sku}</code></td>
                  <td>
                    <span className="category-badge">{product.category}</span>
                  </td>
                  <td className="text-right tabular-nums">{product.quantity.toLocaleString('en-IN')}</td>
                  <td>
                    <StatusChip quantity={product.quantity} reorderLevel={product.reorderLevel} />
                  </td>
                  <td className="text-right tabular-nums">{formatCurrency(product.price)}</td>
                  <td className="text-muted">{formatDate(product.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedProduct && (
        <ProductSheet
          tenantId={tenantId}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {showAdd && (
        <AddProductDialog tenantId={tenantId} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
