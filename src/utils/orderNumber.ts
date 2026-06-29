/**
 * Generate the next sequence number for an order/quotation, avoiding collisions
 * when records have been deleted.
 *
 * @param existingNumbers  Array of existing order numbers (e.g. "VTA-2026-0012")
 * @param prefix           Prefix to look for (e.g. "VTA-2026-")
 * @param pad              Zero-pad length (default 4)
 * @returns The next number string, e.g. "VTA-2026-0013"
 */
export function nextOrderNumber(existingNumbers: string[], prefix: string, pad = 4): string {
  let maxSeq = 0
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`)
  for (const num of existingNumbers) {
    const m = num?.match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > maxSeq) maxSeq = n
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(pad, '0')}`
}
