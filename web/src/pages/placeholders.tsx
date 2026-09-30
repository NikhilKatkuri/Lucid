import { PlaceholderPage } from './PlaceholderPage'

export function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="KPIs, low-stock alerts and recent movements across this location."
      icon="dashboard"
    />
  )
}

export function InventoryPage() {
  return (
    <PlaceholderPage
      title="Inventory"
      description="Products, quantities and stock status for this workspace."
      icon="inventory_2"
    />
  )
}

export function TransfersPage() {
  return (
    <PlaceholderPage
      title="Transfers"
      description="Move stock between locations inside the same organization."
      icon="swap_horiz"
    />
  )
}

export function MovementsPage() {
  return (
    <PlaceholderPage
      title="Movements"
      description="Append-only ledger of every stock change."
      icon="history"
    />
  )
}

export function FilesPage() {
  return (
    <PlaceholderPage
      title="Files"
      description="Product images and documents for this workspace."
      icon="folder"
    />
  )
}

export function MembersPage() {
  return (
    <PlaceholderPage
      title="Members"
      description="People, roles and MFA status for this organization."
      icon="group"
    />
  )
}

export function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Workspace preferences, integrations and organization settings."
      icon="settings"
    />
  )
}
