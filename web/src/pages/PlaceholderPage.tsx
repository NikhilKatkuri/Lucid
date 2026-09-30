import { Banner, Card, Icon } from '../shared/components'
import { accentFor } from '../shared/components'
import { useTenant } from '../features/tenant/TenantProvider'

export interface PlaceholderPageProps {
  title: string
  description: string
  icon: string
}

/**
 * Visually consistent scaffold for Phase 2 screens: real page header with the
 * active tenant badge, an honest "coming next" banner, and a card.
 */
export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  const { activeOrg, activeTenant } = useTenant()
  const accent = activeTenant ? accentFor(activeTenant.tenantId) : 'blue'

  return (
    <div className="page">
      <header className="page__head">
        <div>
          {activeTenant && activeOrg && (
            <span className="page__eyebrow">
              <span
                className="page__eyebrow-dot"
                style={{ background: `var(--sys-${accent}-container)` }}
                aria-hidden="true"
              />
              {activeOrg.name} › <strong>{activeTenant.name}</strong>
            </span>
          )}
          <h1 className="t-headline-md">{title}</h1>
          <p className="page__subtitle">{description}</p>
        </div>
      </header>

      <Banner tone="info" title="Coming in Phase 2">
        The {title.toLowerCase()} screen is scaffolded — layout, routing and
        tenant scope are wired up. Data, tables and actions land in Phase 2.
      </Banner>

      <Card padding="lg" className="page__empty">
        <span className="page__empty-icon" aria-hidden="true">
          <Icon name={icon} size={36} />
        </span>
        <p className="t-title-md">{title} is not built yet</p>
        <p className="page__empty-text">
          Phase 1 delivers the design system, authentication flow and workspace
          selection. {title} will read tenant-scoped data in the next phase.
        </p>
      </Card>
    </div>
  )
}
