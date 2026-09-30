import { useTenant } from '../../features/tenant/TenantProvider'
import type { Role } from '../types'

export type Permission =
  | 'product.create'
  | 'product.edit'
  | 'product.delete'
  | 'product.adjust'
  | 'transfer.create'
  | 'transfer.approve'
  | 'file.upload'
  | 'file.delete'
  | 'member.manage'
  | 'settings.manage'

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  OrgAdmin: [
    'product.create',
    'product.edit',
    'product.delete',
    'product.adjust',
    'transfer.create',
    'transfer.approve',
    'file.upload',
    'file.delete',
    'member.manage',
    'settings.manage',
  ],
  Manager: [
    'product.create',
    'product.edit',
    'product.adjust',
    'transfer.create',
    'transfer.approve',
    'file.upload',
    'file.delete',
  ],
  Staff: [
    'product.create',
    'product.adjust',
    'transfer.create',
    'file.upload',
  ],
  Viewer: [
    'product.create',
    'file.upload',
  ],
}

export function usePermission(permission: Permission): boolean {
  const { activeTenant } = useTenant()
  if (!activeTenant) return false

  const permissions = PERMISSION_MATRIX[activeTenant.role] || []
  return permissions.includes(permission)
}
