
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAdjustStock, useProducts } from './hooks'
import { Icon } from '../../shared/components'

const schema = z.object({
  mode: z.enum(['add', 'remove']),
  quantity: z.number({ invalid_type_error: 'Required' }).int().positive('Must be positive'),
  reason: z.string().min(1, 'Required'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface StockAdjustDialogProps {
  tenantId: string
  productId?: string
  productName?: string
  currentQty?: number
  onClose: () => void
  onSuccess?: () => void
}

const REASONS = [
  'Purchase order received',
  'Damaged/defective',
  'Theft or loss',
  'Return from customer',
  'Cycle count adjustment',
  'Sample/demo used',
  'Other',
]

export function StockAdjustDialog({
  tenantId,
  productId: initialProductId,
  productName: initialProductName,
  currentQty: initialCurrentQty,
  onClose,
  onSuccess,
}: StockAdjustDialogProps) {
  const { data: allProducts } = useProducts(tenantId)
  const [selectedProdId, setSelectedProdId] = useState<string>(initialProductId ?? allProducts?.[0]?.id ?? '')

  const activeProduct = allProducts?.find((p) => p.id === selectedProdId)
  const targetId = initialProductId || selectedProdId
  const targetName = initialProductName || activeProduct?.name || 'Selected Product'
  const currentQty = initialCurrentQty ?? activeProduct?.quantity ?? 0

  const { mutateAsync, isPending } = useAdjustStock(tenantId)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'add', quantity: 1, reason: '' },
  })

  const mode = watch('mode')
  const quantity = watch('quantity')
  const newQty = mode === 'add' ? currentQty + (quantity || 0) : Math.max(0, currentQty - (quantity || 0))

  const onSubmit = async (data: FormValues) => {
    if (!targetId) return
    const delta = data.mode === 'add' ? data.quantity : -data.quantity
    await mutateAsync({ productId: targetId, delta, reason: data.reason, note: data.note ?? '' })
    onSuccess?.()
    onClose()
  }


  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog-container" role="dialog" aria-modal="true" aria-labelledby="adjust-dialog-title">
        <div className="dialog-header">
          <Icon name="tune" size={24} />
          <h2 id="adjust-dialog-title" className="dialog-title">Adjust Stock</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="dialog-body">
          {!initialProductId && allProducts && allProducts.length > 0 ? (
            <div className="field-group" style={{ marginBottom: '16px' }}>
              <label className="field-label" htmlFor="select-adjust-product">Select Product *</label>
              <select
                id="select-adjust-product"
                className="select-field"
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
              >
                <option value="">Select a product…</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Current: {p.quantity} units
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="dialog-product-name">{targetName}</p>
          )}

          <p className="dialog-current-qty">
            Current quantity: <strong>{currentQty}</strong>
          </p>


          {/* Mode toggle */}
          <div className="adjust-mode-toggle">
            <button
              type="button"
              className={`adjust-mode-btn ${mode === 'add' ? 'active' : ''}`}
              onClick={() => setValue('mode', 'add')}
            >
              <Icon name="add" size={18} />
              Add stock
            </button>
            <button
              type="button"
              className={`adjust-mode-btn adjust-mode-btn--remove ${mode === 'remove' ? 'active' : ''}`}
              onClick={() => setValue('mode', 'remove')}
            >
              <Icon name="remove" size={18} />
              Remove stock
            </button>
          </div>

          <form id="adjust-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="field-group">
              <label className="field-label" htmlFor="adjust-qty">Quantity</label>
              <input
                id="adjust-qty"
                type="number"
                className={`text-field ${errors.quantity ? 'text-field--error' : ''}`}
                min={1}
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <span className="field-error">{errors.quantity.message}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="adjust-reason">Reason *</label>
              <select
                id="adjust-reason"
                className={`select-field ${errors.reason ? 'select-field--error' : ''}`}
                {...register('reason')}
              >
                <option value="">Select a reason…</option>
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {errors.reason && <span className="field-error">{errors.reason.message}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="adjust-note">Note (optional)</label>
              <textarea
                id="adjust-note"
                className="text-field text-field--textarea"
                rows={2}
                placeholder="Optional details…"
                {...register('note')}
              />
            </div>

            <div className={`adjust-preview ${mode === 'remove' ? 'adjust-preview--remove' : ''}`}>
              <Icon name={mode === 'add' ? 'arrow_upward' : 'arrow_downward'} size={16} />
              New quantity: <strong>{newQty}</strong>
            </div>
          </form>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn--text" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="adjust-form"
            className={`btn ${mode === 'add' ? 'btn--primary' : 'btn--error'}`}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : `Confirm ${mode === 'add' ? 'Add' : 'Remove'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
