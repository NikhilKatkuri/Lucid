/**
 * db.ts — typed mock database for the hackathon demo.
 * All data is keyed by tenantId so switching tenants is always correct.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StockStatus = 'in_stock' | 'low' | 'out_of_stock'
export type MovementType = 'received' | 'sale' | 'transfer' | 'adjustment' | 'return' | 'damaged'
export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled'
export type MemberRole = 'OrgAdmin' | 'Manager' | 'Staff' | 'Viewer'
export type MemberStatus = 'active' | 'invited'
export type FileType = 'image' | 'document' | 'other'

export interface Product {
  id: string
  tenantId: string
  name: string
  sku: string
  category: string
  description: string
  quantity: number
  reorderLevel: number
  price: number
  supplierCost: number
  imageInitial: string
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Movement {
  id: string
  tenantId: string
  productId: string
  productName: string
  type: MovementType
  quantity: number
  reference: string
  note: string
  date: string
}

export interface Transfer {
  id: string
  orgId: string
  fromTenantId: string
  fromTenantName: string
  toTenantId: string
  toTenantName: string
  items: number
  status: TransferStatus
  note: string
  createdAt: string
}

export interface MockFile {
  id: string
  tenantId: string
  name: string
  type: FileType
  size: number
  mimeType: string
  uploadedAt: string
  productId?: string
}

export interface Member {
  id: string
  orgId: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  mfaEnabled: boolean
  joinedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock status helper
// ─────────────────────────────────────────────────────────────────────────────

export function getStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock'
  if (quantity <= reorderLevel) return 'low'
  return 'in_stock'
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant IDs (import from tenants.ts for consistency)
// ─────────────────────────────────────────────────────────────────────────────

const HYD_STORE = 'tnt_acme_hyd_store'
const MUM_STORE = 'tnt_acme_mum_store'
const BLR_STORE = 'tnt_acme_blr_store'
const HYD_HUB = 'tnt_acme_hyd_hub'

const ORG_RETAIL = 'org_acme_retail'
const ORG_WAREHOUSE = 'org_acme_warehouse'

// ─────────────────────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCTS: Product[] = [
  // ── Hyderabad Store ──────────────────────────────────────────────────────
  {
    id: 'prod_hyd_001', tenantId: HYD_STORE, name: 'Wireless Mouse', sku: 'MM-001',
    category: 'Accessories', description: 'Ergonomic wireless mouse with USB receiver and 18-month battery life.',
    quantity: 124, reorderLevel: 20, price: 1499, supplierCost: 980,
    imageInitial: 'M', createdAt: '2024-01-15', updatedAt: '2024-10-28',
  },
  {
    id: 'prod_hyd_002', tenantId: HYD_STORE, name: 'USB-C Hub', sku: 'HUB-042',
    category: 'Accessories', description: 'Multi-port USB-C hub with HDMI, USB-A and USB-C ports.',
    quantity: 7, reorderLevel: 10, price: 2499, supplierCost: 1650,
    imageInitial: 'U', createdAt: '2024-02-10', updatedAt: '2024-10-28',
  },
  {
    id: 'prod_hyd_003', tenantId: HYD_STORE, name: 'Mechanical Keyboard', sku: 'KB-104',
    category: 'Accessories', description: 'Full-size mechanical keyboard with tactile switches and RGB lighting.',
    quantity: 0, reorderLevel: 5, price: 3999, supplierCost: 2600,
    imageInitial: 'K', createdAt: '2024-03-05', updatedAt: '2024-10-25',
  },
  {
    id: 'prod_hyd_004', tenantId: HYD_STORE, name: '27" Monitor', sku: 'MON-220',
    category: 'Electronics', description: '27-inch IPS display, 2560×1440, 75 Hz, with USB-C connectivity.',
    quantity: 38, reorderLevel: 5, price: 18999, supplierCost: 13500,
    imageInitial: 'D', createdAt: '2024-01-20', updatedAt: '2024-10-20',
  },
  {
    id: 'prod_hyd_005', tenantId: HYD_STORE, name: 'Laptop Stand', sku: 'LS-210',
    category: 'Accessories', description: 'Adjustable aluminium laptop stand with cable management.',
    quantity: 12, reorderLevel: 8, price: 1299, supplierCost: 750,
    imageInitial: 'S', createdAt: '2024-04-01', updatedAt: '2024-10-18',
  },
  {
    id: 'prod_hyd_006', tenantId: HYD_STORE, name: 'Office Chair', sku: 'CH-101',
    category: 'Furniture', description: 'Ergonomic mesh office chair with lumbar support and adjustable armrests.',
    quantity: 5, reorderLevel: 3, price: 8499, supplierCost: 5800,
    imageInitial: 'C', createdAt: '2024-02-28', updatedAt: '2024-10-15',
  },
  {
    id: 'prod_hyd_007', tenantId: HYD_STORE, name: 'Laptop 15"', sku: 'LP-550',
    category: 'Electronics', description: '15-inch business laptop with i5 processor and 16GB RAM.',
    quantity: 12, reorderLevel: 5, price: 65999, supplierCost: 52000,
    imageInitial: 'L', createdAt: '2024-05-10', updatedAt: '2024-10-22',
  },
  {
    id: 'prod_hyd_008', tenantId: HYD_STORE, name: 'Desk Lamp', sku: 'DL-033',
    category: 'Accessories', description: 'LED desk lamp with adjustable brightness and USB charging port.',
    quantity: 45, reorderLevel: 10, price: 799, supplierCost: 480,
    imageInitial: 'L', createdAt: '2024-06-15', updatedAt: '2024-10-10',
  },

  // ── Mumbai Store ─────────────────────────────────────────────────────────
  {
    id: 'prod_mum_001', tenantId: MUM_STORE, name: 'Bluetooth Speaker', sku: 'SPK-101',
    category: 'Electronics', description: 'Portable Bluetooth 5.0 speaker with 20W output and 12-hour battery.',
    quantity: 42, reorderLevel: 8, price: 3499, supplierCost: 2200,
    imageInitial: 'S', createdAt: '2024-01-10', updatedAt: '2024-10-27',
  },
  {
    id: 'prod_mum_002', tenantId: MUM_STORE, name: 'Noise Cancelling Headphones', sku: 'HC-220',
    category: 'Electronics', description: 'Over-ear ANC headphones with 30-hour playback.',
    quantity: 3, reorderLevel: 5, price: 12999, supplierCost: 9000,
    imageInitial: 'H', createdAt: '2024-02-20', updatedAt: '2024-10-26',
  },
  {
    id: 'prod_mum_003', tenantId: MUM_STORE, name: 'Smart Watch', sku: 'SW-440',
    category: 'Wearables', description: 'Fitness smartwatch with health monitoring and 7-day battery.',
    quantity: 0, reorderLevel: 4, price: 8999, supplierCost: 6200,
    imageInitial: 'W', createdAt: '2024-03-15', updatedAt: '2024-10-24',
  },
  {
    id: 'prod_mum_004', tenantId: MUM_STORE, name: 'Webcam 4K', sku: 'WC-080',
    category: 'Accessories', description: '4K webcam with auto-focus and built-in ring light.',
    quantity: 18, reorderLevel: 6, price: 6499, supplierCost: 4500,
    imageInitial: 'C', createdAt: '2024-04-05', updatedAt: '2024-10-20',
  },
  {
    id: 'prod_mum_005', tenantId: MUM_STORE, name: 'USB Microphone', sku: 'MIC-055',
    category: 'Accessories', description: 'Condenser USB microphone for podcasting and streaming.',
    quantity: 9, reorderLevel: 5, price: 4999, supplierCost: 3300,
    imageInitial: 'M', createdAt: '2024-05-20', updatedAt: '2024-10-15',
  },
  {
    id: 'prod_mum_006', tenantId: MUM_STORE, name: 'Tablet 10"', sku: 'TAB-110',
    category: 'Electronics', description: '10-inch Android tablet with 4G LTE and 64GB storage.',
    quantity: 22, reorderLevel: 5, price: 19999, supplierCost: 14500,
    imageInitial: 'T', createdAt: '2024-06-10', updatedAt: '2024-10-12',
  },

  // ── Bangalore Store ───────────────────────────────────────────────────────
  {
    id: 'prod_blr_001', tenantId: BLR_STORE, name: 'Standing Desk', sku: 'SD-201',
    category: 'Furniture', description: 'Electric height-adjustable standing desk, 140×60 cm.',
    quantity: 8, reorderLevel: 3, price: 28999, supplierCost: 21000,
    imageInitial: 'D', createdAt: '2024-01-25', updatedAt: '2024-10-25',
  },
  {
    id: 'prod_blr_002', tenantId: BLR_STORE, name: 'Whiteboard 90×120', sku: 'WB-090',
    category: 'Furniture', description: 'Magnetic dry-erase whiteboard with aluminum frame.',
    quantity: 4, reorderLevel: 2, price: 4999, supplierCost: 3200,
    imageInitial: 'W', createdAt: '2024-02-15', updatedAt: '2024-10-22',
  },
  {
    id: 'prod_blr_003', tenantId: BLR_STORE, name: 'Printer A4', sku: 'PR-404',
    category: 'Electronics', description: 'Wireless colour laser printer with duplex printing.',
    quantity: 0, reorderLevel: 2, price: 22999, supplierCost: 17000,
    imageInitial: 'P', createdAt: '2024-03-10', updatedAt: '2024-10-18',
  },
  {
    id: 'prod_blr_004', tenantId: BLR_STORE, name: 'Conference Phone', sku: 'CP-310',
    category: 'Electronics', description: '360° conference phone with noise cancellation for 20-person rooms.',
    quantity: 6, reorderLevel: 3, price: 12499, supplierCost: 9000,
    imageInitial: 'C', createdAt: '2024-04-20', updatedAt: '2024-10-15',
  },
  {
    id: 'prod_blr_005', tenantId: BLR_STORE, name: 'Projector FHD', sku: 'PJ-550',
    category: 'Electronics', description: 'Full HD projector, 3200 lumens, with HDMI and wireless casting.',
    quantity: 3, reorderLevel: 2, price: 34999, supplierCost: 27000,
    imageInitial: 'P', createdAt: '2024-05-15', updatedAt: '2024-10-10',
  },

  // ── Hyderabad Hub (Warehouse) ─────────────────────────────────────────────
  {
    id: 'prod_hub_001', tenantId: HYD_HUB, name: 'Pallet Jack 2T', sku: 'PJ-2000',
    category: 'Equipment', description: 'Manual hydraulic pallet jack with 2-tonne capacity.',
    quantity: 14, reorderLevel: 3, price: 24999, supplierCost: 18000,
    imageInitial: 'J', createdAt: '2023-11-01', updatedAt: '2024-10-20',
  },
  {
    id: 'prod_hub_002', tenantId: HYD_HUB, name: 'Barcode Scanner', sku: 'BC-112',
    category: 'Equipment', description: 'Wireless 2D barcode scanner with charging dock.',
    quantity: 3, reorderLevel: 5, price: 8999, supplierCost: 6200,
    imageInitial: 'B', createdAt: '2023-11-15', updatedAt: '2024-10-28',
  },
  {
    id: 'prod_hub_003', tenantId: HYD_HUB, name: 'Storage Racking 2m', sku: 'SR-2000',
    category: 'Shelving', description: 'Heavy-duty steel racking unit, 2 m × 1 m, rated to 500 kg per shelf.',
    quantity: 120, reorderLevel: 20, price: 5499, supplierCost: 3800,
    imageInitial: 'R', createdAt: '2023-12-01', updatedAt: '2024-10-15',
  },
  {
    id: 'prod_hub_004', tenantId: HYD_HUB, name: 'Shrink Wrap Roll', sku: 'SW-500',
    category: 'Packaging', description: 'Industrial stretch film roll, 500 m, 23 μm.',
    quantity: 380, reorderLevel: 50, price: 299, supplierCost: 180,
    imageInitial: 'W', createdAt: '2024-01-10', updatedAt: '2024-10-25',
  },
  {
    id: 'prod_hub_005', tenantId: HYD_HUB, name: 'Forklift Attachment', sku: 'FA-001',
    category: 'Equipment', description: 'Side-shift attachment compatible with Class I/II forklifts.',
    quantity: 0, reorderLevel: 2, price: 89999, supplierCost: 72000,
    imageInitial: 'A', createdAt: '2024-02-20', updatedAt: '2024-10-22',
  },
  {
    id: 'prod_hub_006', tenantId: HYD_HUB, name: 'Packing Tape Dispenser', sku: 'TD-006',
    category: 'Packaging', description: 'Heavy-duty H-type tape dispenser for 50 mm tape.',
    quantity: 65, reorderLevel: 10, price: 349, supplierCost: 210,
    imageInitial: 'T', createdAt: '2024-03-05', updatedAt: '2024-10-18',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Movements
// ─────────────────────────────────────────────────────────────────────────────

export const MOVEMENTS: Movement[] = [
  // Hyderabad
  { id: 'mv_hyd_001', tenantId: HYD_STORE, productId: 'prod_hyd_001', productName: 'Wireless Mouse', type: 'received', quantity: 50, reference: 'PO-2024-001', note: 'Stock replenishment', date: '2024-10-28T10:42:00' },
  { id: 'mv_hyd_002', tenantId: HYD_STORE, productId: 'prod_hyd_002', productName: 'USB-C Hub', type: 'sale', quantity: -12, reference: 'INV-2046', note: '', date: '2024-10-28T09:18:00' },
  { id: 'mv_hyd_003', tenantId: HYD_STORE, productId: 'prod_hyd_003', productName: 'Mechanical Keyboard', type: 'transfer', quantity: 30, reference: 'TR-2034', note: 'From Mumbai store', date: '2024-10-27T14:30:00' },
  { id: 'mv_hyd_004', tenantId: HYD_STORE, productId: 'prod_hyd_004', productName: '27" Monitor', type: 'sale', quantity: -5, reference: 'INV-2041', note: 'Corporate order', date: '2024-10-27T11:20:00' },
  { id: 'mv_hyd_005', tenantId: HYD_STORE, productId: 'prod_hyd_005', productName: 'Laptop Stand', type: 'received', quantity: 20, reference: 'PO-2024-002', note: '', date: '2024-10-26T15:00:00' },
  { id: 'mv_hyd_006', tenantId: HYD_STORE, productId: 'prod_hyd_006', productName: 'Office Chair', type: 'sale', quantity: -2, reference: 'INV-2039', note: '', date: '2024-10-26T10:15:00' },
  { id: 'mv_hyd_007', tenantId: HYD_STORE, productId: 'prod_hyd_007', productName: 'Laptop 15"', type: 'damaged', quantity: -1, reference: 'DMG-001', note: 'Screen damage in transit', date: '2024-10-25T16:30:00' },
  // Mumbai
  { id: 'mv_mum_001', tenantId: MUM_STORE, productId: 'prod_mum_001', productName: 'Bluetooth Speaker', type: 'received', quantity: 25, reference: 'PO-MUM-018', note: '', date: '2024-10-28T11:00:00' },
  { id: 'mv_mum_002', tenantId: MUM_STORE, productId: 'prod_mum_002', productName: 'Noise Cancelling Headphones', type: 'sale', quantity: -8, reference: 'INV-MUM-301', note: '', date: '2024-10-28T09:45:00' },
  { id: 'mv_mum_003', tenantId: MUM_STORE, productId: 'prod_mum_003', productName: 'Smart Watch', type: 'sale', quantity: -4, reference: 'INV-MUM-299', note: '', date: '2024-10-27T14:00:00' },
  { id: 'mv_mum_004', tenantId: MUM_STORE, productId: 'prod_mum_004', productName: 'Webcam 4K', type: 'received', quantity: 10, reference: 'PO-MUM-019', note: '', date: '2024-10-26T10:30:00' },
  // Bangalore
  { id: 'mv_blr_001', tenantId: BLR_STORE, productId: 'prod_blr_001', productName: 'Standing Desk', type: 'received', quantity: 5, reference: 'PO-BLR-011', note: '', date: '2024-10-28T10:00:00' },
  { id: 'mv_blr_002', tenantId: BLR_STORE, productId: 'prod_blr_002', productName: 'Whiteboard 90×120', type: 'sale', quantity: -2, reference: 'INV-BLR-145', note: '', date: '2024-10-27T15:30:00' },
  { id: 'mv_blr_003', tenantId: BLR_STORE, productId: 'prod_blr_003', productName: 'Printer A4', type: 'adjustment', quantity: -1, reference: 'ADJ-BLR-001', note: 'Counted stock discrepancy', date: '2024-10-26T09:00:00' },
  // Hub
  { id: 'mv_hub_001', tenantId: HYD_HUB, productId: 'prod_hub_001', productName: 'Pallet Jack 2T', type: 'received', quantity: 4, reference: 'PO-HUB-055', note: 'Q4 restock', date: '2024-10-28T08:30:00' },
  { id: 'mv_hub_002', tenantId: HYD_HUB, productId: 'prod_hub_002', productName: 'Barcode Scanner', type: 'sale', quantity: -2, reference: 'DISP-HUB-011', note: 'Dispatched to Mumbai', date: '2024-10-28T09:00:00' },
  { id: 'mv_hub_003', tenantId: HYD_HUB, productId: 'prod_hub_003', productName: 'Storage Racking 2m', type: 'received', quantity: 30, reference: 'PO-HUB-056', note: '', date: '2024-10-27T13:00:00' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Transfers
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSFERS: Transfer[] = [
  {
    id: 'TR-001', orgId: ORG_RETAIL,
    fromTenantId: HYD_STORE, fromTenantName: 'Hyderabad Store',
    toTenantId: MUM_STORE, toTenantName: 'Mumbai Store',
    items: 5, status: 'in_transit', note: 'USB-C Hubs for Mumbai launch',
    createdAt: '2024-10-26T10:00:00',
  },
  {
    id: 'TR-002', orgId: ORG_RETAIL,
    fromTenantId: MUM_STORE, fromTenantName: 'Mumbai Store',
    toTenantId: BLR_STORE, toTenantName: 'Bangalore Store',
    items: 12, status: 'completed', note: 'Overstock redistribution',
    createdAt: '2024-10-24T09:00:00',
  },
  {
    id: 'TR-003', orgId: ORG_RETAIL,
    fromTenantId: HYD_STORE, fromTenantName: 'Hyderabad Store',
    toTenantId: BLR_STORE, toTenantName: 'Bangalore Store',
    items: 8, status: 'pending', note: 'Office chairs for new joiners',
    createdAt: '2024-10-28T08:00:00',
  },
  {
    id: 'TR-004', orgId: ORG_RETAIL,
    fromTenantId: BLR_STORE, fromTenantName: 'Bangalore Store',
    toTenantId: MUM_STORE, toTenantName: 'Mumbai Store',
    items: 3, status: 'cancelled', note: 'Order cancelled by recipient',
    createdAt: '2024-10-22T14:00:00',
  },
  {
    id: 'TR-005', orgId: ORG_WAREHOUSE,
    fromTenantId: HYD_HUB, fromTenantName: 'Hyderabad Hub',
    toTenantId: HYD_HUB, toTenantName: 'Hyderabad Hub',
    items: 20, status: 'completed', note: 'Internal dock rebalance',
    createdAt: '2024-10-20T11:00:00',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────────────────────────────────────

export const FILES: MockFile[] = [
  { id: 'file_001', tenantId: HYD_STORE, name: 'mouse-product.jpg', type: 'image', size: 251000, mimeType: 'image/jpeg', uploadedAt: '2024-10-01T10:00:00', productId: 'prod_hyd_001' },
  { id: 'file_002', tenantId: HYD_STORE, name: 'hub-datasheet.pdf', type: 'document', size: 1245000, mimeType: 'application/pdf', uploadedAt: '2024-10-05T14:30:00', productId: 'prod_hyd_002' },
  { id: 'file_003', tenantId: HYD_STORE, name: 'keyboard-manual.pdf', type: 'document', size: 3480000, mimeType: 'application/pdf', uploadedAt: '2024-10-10T09:00:00', productId: 'prod_hyd_003' },
  { id: 'file_004', tenantId: HYD_STORE, name: 'monitor-warranty.pdf', type: 'document', size: 867000, mimeType: 'application/pdf', uploadedAt: '2024-10-12T11:00:00', productId: 'prod_hyd_004' },
  { id: 'file_005', tenantId: MUM_STORE, name: 'speaker-promo.jpg', type: 'image', size: 380000, mimeType: 'image/jpeg', uploadedAt: '2024-10-08T15:00:00', productId: 'prod_mum_001' },
  { id: 'file_006', tenantId: MUM_STORE, name: 'headphones-spec.pdf', type: 'document', size: 720000, mimeType: 'application/pdf', uploadedAt: '2024-10-15T09:30:00', productId: 'prod_mum_002' },
  { id: 'file_007', tenantId: BLR_STORE, name: 'desk-assembly.pdf', type: 'document', size: 2100000, mimeType: 'application/pdf', uploadedAt: '2024-09-20T10:00:00', productId: 'prod_blr_001' },
  { id: 'file_008', tenantId: HYD_HUB, name: 'pallet-jack-manual.pdf', type: 'document', size: 5600000, mimeType: 'application/pdf', uploadedAt: '2024-08-10T08:00:00', productId: 'prod_hub_001' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Members
// ─────────────────────────────────────────────────────────────────────────────

export const MEMBERS: Member[] = [
  { id: 'mem_001', orgId: ORG_RETAIL, name: 'Sreekar Reddy', email: 'sreekar@acme.com', role: 'OrgAdmin', status: 'active', mfaEnabled: true, joinedAt: '2023-06-01' },
  { id: 'mem_002', orgId: ORG_RETAIL, name: 'Priya Sharma', email: 'priya@acme.com', role: 'Manager', status: 'active', mfaEnabled: true, joinedAt: '2023-08-15' },
  { id: 'mem_003', orgId: ORG_RETAIL, name: 'Rahul Nair', email: 'rahul@acme.com', role: 'Staff', status: 'active', mfaEnabled: false, joinedAt: '2024-01-10' },
  { id: 'mem_004', orgId: ORG_RETAIL, name: 'Aisha Khan', email: 'aisha@acme.com', role: 'Viewer', status: 'invited', mfaEnabled: false, joinedAt: '2024-10-20' },
  { id: 'mem_005', orgId: ORG_WAREHOUSE, name: 'Vikram Patel', email: 'vikram@acme.com', role: 'OrgAdmin', status: 'active', mfaEnabled: true, joinedAt: '2023-07-01' },
  { id: 'mem_006', orgId: ORG_WAREHOUSE, name: 'Deepa Menon', email: 'deepa@acme.com', role: 'Manager', status: 'active', mfaEnabled: false, joinedAt: '2024-02-14' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard data
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardData {
  tenantId: string
  totalProducts: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValue: number
  lowStockItems: { productId: string; name: string; quantity: number }[]
  recentMovements: Movement[]
  trendData: { label: string; value: number; units: number }[]
}

function makeTrend(base: number): { label: string; value: number; units: number }[] {
  const labels = ['Oct 1', 'Oct 5', 'Oct 10', 'Oct 15', 'Oct 20', 'Oct 25', 'Oct 28']
  return labels.map((label, i) => ({
    label,
    value: Math.round(base * (0.85 + i * 0.025 + Math.random() * 0.04)),
    units: Math.round((base / 1500) * (0.9 + i * 0.02)),
  }))
}

export function getDashboardData(tenantId: string): DashboardData {
  const products = PRODUCTS.filter((p) => p.tenantId === tenantId)
  const movements = MOVEMENTS.filter((m) => m.tenantId === tenantId).slice(0, 5)
  const lowItems = products
    .filter((p) => getStockStatus(p.quantity, p.reorderLevel) === 'low')
    .map((p) => ({ productId: p.id, name: p.name, quantity: p.quantity }))
  const outItems = products.filter((p) => getStockStatus(p.quantity, p.reorderLevel) === 'out_of_stock')
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0)
  const inventoryValue = products.reduce((s, p) => s + p.price * p.quantity, 0)

  return {
    tenantId,
    totalProducts: products.length,
    totalUnits,
    lowStockCount: lowItems.length,
    outOfStockCount: outItems.length,
    inventoryValue,
    lowStockItems: lowItems,
    recentMovements: movements,
    trendData: makeTrend(inventoryValue),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers (API layer)
// ─────────────────────────────────────────────────────────────────────────────

const delay = (ms = 400) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function fetchProducts(tenantId: string, opts?: { search?: string; category?: string; status?: string }): Promise<Product[]> {
  await delay()
  let results = PRODUCTS.filter((p) => p.tenantId === tenantId)
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    results = results.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }
  if (opts?.category) results = results.filter((p) => p.category === opts.category)
  if (opts?.status) {
    results = results.filter((p) => getStockStatus(p.quantity, p.reorderLevel) === opts.status)
  }
  return results
}

export async function fetchProduct(tenantId: string, productId: string): Promise<Product | null> {
  await delay(200)
  return PRODUCTS.find((p) => p.tenantId === tenantId && p.id === productId) ?? null
}

export async function adjustStock(
  tenantId: string, productId: string, delta: number, reason: string, note: string,
): Promise<Product> {
  await delay(600)
  const product = PRODUCTS.find((p) => p.tenantId === tenantId && p.id === productId)
  if (!product) throw new Error('Product not found')
  product.quantity = Math.max(0, product.quantity + delta)
  product.updatedAt = new Date().toISOString().split('T')[0]
  MOVEMENTS.unshift({
    id: `mv_${Date.now()}`,
    tenantId,
    productId,
    productName: product.name,
    type: delta > 0 ? 'received' : 'sale',
    quantity: delta,
    reference: `ADJ-${Date.now().toString().slice(-6)}`,
    note: note || reason,
    date: new Date().toISOString(),
  })
  return { ...product }
}

export async function createProduct(tenantId: string, data: Omit<Product, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'imageInitial'>): Promise<Product> {
  await delay(700)
  const newProduct: Product = {
    ...data,
    id: `prod_${Date.now()}`,
    tenantId,
    imageInitial: data.name[0].toUpperCase(),
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop', // Mock placeholder image for demo
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  }
  PRODUCTS.push(newProduct)
  return newProduct
}

export async function deleteProduct(tenantId: string, productId: string): Promise<void> {
  await delay(500)
  const index = PRODUCTS.findIndex((p) => p.tenantId === tenantId && p.id === productId)
  if (index !== -1) {
    PRODUCTS.splice(index, 1)
  }
}

export async function fetchMovements(tenantId: string, opts?: { search?: string; type?: string }): Promise<Movement[]> {
  await delay()
  let results = MOVEMENTS.filter((m) => m.tenantId === tenantId)
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    results = results.filter((m) => m.productName.toLowerCase().includes(q) || m.reference.toLowerCase().includes(q))
  }
  if (opts?.type) results = results.filter((m) => m.type === opts.type)
  return results
}

export async function fetchTransfers(orgId: string, tenantId: string): Promise<Transfer[]> {
  await delay()
  return TRANSFERS.filter((t) => t.orgId === orgId && (t.fromTenantId === tenantId || t.toTenantId === tenantId))
}

export async function createTransfer(data: Omit<Transfer, 'id' | 'createdAt'>): Promise<Transfer> {
  await delay(700)
  const t: Transfer = { ...data, id: `TR-${String(TRANSFERS.length + 1).padStart(3, '0')}`, createdAt: new Date().toISOString() }
  TRANSFERS.push(t)
  return t
}

export async function fetchFiles(tenantId: string): Promise<MockFile[]> {
  await delay()
  return FILES.filter((f) => f.tenantId === tenantId)
}

export async function uploadFile(tenantId: string, file: File): Promise<MockFile> {
  await delay(1200)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const type: FileType = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? 'image' : ext === 'pdf' || ext === 'doc' || ext === 'docx' ? 'document' : 'other'
  const newFile: MockFile = {
    id: `file_${Date.now()}`,
    tenantId,
    name: file.name,
    type,
    size: file.size,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
  }
  FILES.push(newFile)
  return newFile
}

export async function fetchMembers(orgId: string): Promise<Member[]> {
  await delay()
  return MEMBERS.filter((m) => m.orgId === orgId)
}

export async function inviteMember(orgId: string, email: string, role: MemberRole): Promise<Member> {
  await delay(700)
  const newMember: Member = {
    id: `mem_${Date.now()}`,
    orgId,
    name: email.split('@')[0],
    email,
    role,
    status: 'invited',
    mfaEnabled: false,
    joinedAt: new Date().toISOString().split('T')[0],
  }
  MEMBERS.push(newMember)
  return newMember
}

export async function fetchDashboard(tenantId: string): Promise<DashboardData> {
  await delay()
  return getDashboardData(tenantId)
}
