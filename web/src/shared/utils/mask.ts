export function maskSupplierCost(cost: number, revealed: boolean): string {
  if (revealed) {
    return `₹${cost.toLocaleString('en-IN')}`
  }
  return '••••••'
}
