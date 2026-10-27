import { describe, it, expect } from 'vitest'
import { mergeWishlistItem } from '../src/utils/wishlist'

describe('mergeWishlistItem', () => {
  it('สร้างใหม่ด้วยค่าเริ่มต้น', () => {
    const item = mergeWishlistItem(undefined, 'A', { wanted: 2, priority: 'high' })
    expect(item.cardId).toBe('A')
    expect(item.wanted).toBe(2)
    expect(item.priority).toBe('high')
    expect(item.obtained).toBe(false)
    expect(item.createdAt).toBeTruthy()
  })
  it('อัปเดต existing แต่คงค่าที่ไม่ได้ patch', () => {
    const existing = { cardId: 'A', wanted: 1, priority: 'low' as const, obtained: false, createdAt: 't', updatedAt: 't' }
    const item = mergeWishlistItem(existing, 'A', { wanted: 3 })
    expect(item.wanted).toBe(3)
    expect(item.priority).toBe('low')
    expect(item.cardId).toBe('A')
  })
  it('wanted ไม่ติดลบ', () => {
    const item = mergeWishlistItem(undefined, 'A', { wanted: -5 })
    expect(item.wanted).toBe(0)
  })
  it('ทำเครื่องหมาย obtained ได้', () => {
    const item = mergeWishlistItem(undefined, 'A', { obtained: true })
    expect(item.obtained).toBe(true)
  })
})
