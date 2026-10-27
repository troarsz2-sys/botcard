import type { WishlistItem } from '../types'
import { clampNonNegative } from './quantity'
import { nowIso } from './id'

// รวม patch เข้า wishlist item (pure) ใช้ทั้งใน UI และทดสอบได้
export function mergeWishlistItem(
  existing: WishlistItem | undefined,
  cardId: string,
  patch: Partial<WishlistItem>
): WishlistItem {
  const now = nowIso()
  const base: WishlistItem = existing ?? {
    cardId,
    wanted: 1,
    priority: 'medium',
    notes: undefined,
    obtained: false,
    createdAt: now,
    updatedAt: now,
  }
  const next: WishlistItem = {
    ...base,
    ...patch,
    cardId: base.cardId,
    updatedAt: now,
  }
  if (patch.wanted !== undefined) next.wanted = clampNonNegative(patch.wanted)
  return next
}
