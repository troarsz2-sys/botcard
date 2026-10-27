import { describe, it, expect } from 'vitest'
import { incQuantity, decQuantity, clampNonNegative } from '../src/utils/quantity'

describe('quantity', () => {
  it('เพิ่มจำนวน', () => {
    expect(incQuantity(0)).toBe(1)
    expect(incQuantity(3, 2)).toBe(5)
    expect(incQuantity(-1)).toBe(1)
  })
  it('ลดจำนวน และไม่ติดลบ', () => {
    expect(decQuantity(1)).toBe(0)
    expect(decQuantity(0)).toBe(0)
    expect(decQuantity(5, 3)).toBe(2)
    expect(decQuantity(2, 5)).toBe(0)
  })
  it('clamp ไม่ติดลบ และปัดเศษ', () => {
    expect(clampNonNegative(-5)).toBe(0)
    expect(clampNonNegative(3.9)).toBe(3)
    expect(clampNonNegative(NaN)).toBe(0)
    expect(clampNonNegative(null)).toBe(0)
  })
})
