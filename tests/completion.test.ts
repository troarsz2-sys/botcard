import { describe, it, expect } from 'vitest'
import {
  computeCompletion,
  perSetCompletion,
  missingCards,
  duplicateList,
  tradeList,
  wantedList,
} from '../src/utils/completion'
import type { Card, CollectionRecord, WishlistItem } from '../src/types'

function card(id: string, set?: string, rarity?: string): Card {
  return { id, code: id, nameTh: id, set, rarity, verified: false, createdAt: '', updatedAt: '' }
}
function rec(cardId: string, owned: number, forTrade = 0): CollectionRecord {
  return { cardId, owned, forTrade, condition: 'Unknown', updatedAt: '' }
}
function wish(cardId: string, wanted: number, obtained = false): WishlistItem {
  return { cardId, wanted, priority: 'medium', obtained, createdAt: '', updatedAt: '' }
}

describe('computeCompletion', () => {
  const catalog = [card('A', 'BT01', 'SR'), card('B', 'BT01', 'C'), card('C', 'BT02', 'R')]

  it('นับ unique ไม่นับซ้ำซ้อน', () => {
    const s = computeCompletion(catalog, [rec('A', 2), rec('B', 1)])
    expect(s.ownedUnique).toBe(2)
    expect(s.totalOwned).toBe(3)
    expect(s.totalKnown).toBe(3)
    expect(s.missing).toBe(1)
    expect(s.duplicateCards).toBe(1)
    expect(s.duplicateCopies).toBe(1)
    expect(s.percent).toBe(66.7)
  })

  it('หารด้วยศูนย์ได้ 0 (ไม่ error)', () => {
    const s = computeCompletion([], [])
    expect(s.percent).toBe(0)
    expect(s.totalKnown).toBe(0)
    expect(s.missing).toBe(0)
  })

  it('กรองตามเซ็ต', () => {
    const s = computeCompletion(catalog, [rec('A', 1)], { set: 'BT01' })
    expect(s.totalKnown).toBe(2)
    expect(s.ownedUnique).toBe(1)
    expect(s.percent).toBe(50)
  })

  it('กรองตามความหายาก', () => {
    const s = computeCompletion(catalog, [rec('A', 1)], { rarity: 'SR' })
    expect(s.totalKnown).toBe(1)
    expect(s.percent).toBe(100)
  })
})

describe('perSetCompletion', () => {
  it('แยกตามเซ็ต', () => {
    const catalog = [card('A', 'BT01'), card('B', 'BT01'), card('C', 'BT02')]
    const ps = perSetCompletion(catalog, [rec('A', 1)])
    const bt01 = ps.find((p) => p.set === 'BT01')!
    expect(bt01.totalKnown).toBe(2)
    expect(bt01.ownedUnique).toBe(1)
    expect(bt01.percent).toBe(50)
    const bt02 = ps.find((p) => p.set === 'BT02')!
    expect(bt02.percent).toBe(0)
  })
})

describe('lists', () => {
  const catalog = [card('A', 'BT01', 'SR'), card('B', 'BT01', 'C'), card('C', 'BT02', 'R')]

  it('missing นับการ์ดที่มี 0', () => {
    expect(missingCards(catalog, [rec('A', 1)]).map((c) => c.id)).toEqual(['B', 'C'])
  })
  it('duplicate นับการ์ดที่มีมากกว่า 1', () => {
    expect(duplicateList(catalog, [rec('A', 2)]).map((d) => d.card.id)).toEqual(['A'])
  })
  it('trade นับการ์ดที่พร้อมแลก', () => {
    expect(tradeList(catalog, [rec('A', 2, 1)]).map((t) => t.card.id)).toEqual(['A'])
  })
  it('wanted ไม่รวมที่ obtained แล้ว', () => {
    const wl = [wish('A', 1), wish('B', 1, true)]
    expect(wantedList(catalog, wl).map((w) => w.card.id)).toEqual(['A'])
  })
})
