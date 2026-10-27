import type { Card, CollectionRecord, WishlistItem } from '../types'

export interface CompletionSummary {
  totalKnown: number
  ownedUnique: number
  totalOwned: number
  missing: number
  duplicateCards: number
  duplicateCopies: number
  percent: number
}

export interface ScopeFilter {
  set?: string
  rarity?: string
}

export function buildCollectionMap(records: CollectionRecord[]): Map<string, CollectionRecord> {
  const m = new Map<string, CollectionRecord>()
  for (const r of records) m.set(r.cardId, r)
  return m
}

function inScope(card: Card, scope?: ScopeFilter): boolean {
  if (!scope) return true
  if (scope.set !== undefined && (card.set ?? '') !== scope.set) return false
  if (scope.rarity !== undefined && (card.rarity ?? '') !== scope.rarity) return false
  return true
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// สูตร: การ์ดที่มี (unique) / การ์ดทั้งหมดที่รู้ (unique) × 100 นับเฉพาะ unique ไม่นับซ้ำซ้อน
export function computeCompletion(
  catalog: Card[],
  collection: CollectionRecord[],
  scope?: ScopeFilter
): CompletionSummary {
  const map = buildCollectionMap(collection)
  let totalKnown = 0
  let ownedUnique = 0
  let totalOwned = 0
  let duplicateCards = 0
  let duplicateCopies = 0
  for (const card of catalog) {
    if (!inScope(card, scope)) continue
    totalKnown++
    const owned = map.get(card.id)?.owned ?? 0
    if (owned > 0) {
      ownedUnique++
      totalOwned += owned
      if (owned > 1) {
        duplicateCards++
        duplicateCopies += owned - 1
      }
    }
  }
  const percent = totalKnown === 0 ? 0 : round1((ownedUnique / totalKnown) * 100)
  return {
    totalKnown,
    ownedUnique,
    totalOwned,
    missing: totalKnown - ownedUnique,
    duplicateCards,
    duplicateCopies,
    percent,
  }
}

export interface SetCompletion {
  set: string
  totalKnown: number
  ownedUnique: number
  percent: number
}

export function perSetCompletion(catalog: Card[], collection: CollectionRecord[]): SetCompletion[] {
  const map = buildCollectionMap(collection)
  const sets = new Map<string, { totalKnown: number; ownedUnique: number }>()
  for (const card of catalog) {
    const s = card.set ?? ''
    const entry = sets.get(s) ?? { totalKnown: 0, ownedUnique: 0 }
    entry.totalKnown++
    if ((map.get(card.id)?.owned ?? 0) > 0) entry.ownedUnique++
    sets.set(s, entry)
  }
  return [...sets.entries()]
    .map(([set, v]) => ({
      set,
      totalKnown: v.totalKnown,
      ownedUnique: v.ownedUnique,
      percent: v.totalKnown === 0 ? 0 : round1((v.ownedUnique / v.totalKnown) * 100),
    }))
    .sort((a, b) => a.set.localeCompare(b.set))
}

export type CardStatus = 'owned' | 'missing' | 'duplicate'

export function cardStatus(owned: number): CardStatus {
  if (owned >= 2) return 'duplicate'
  if (owned === 1) return 'owned'
  return 'missing'
}

export function missingCards(
  catalog: Card[],
  collection: CollectionRecord[],
  scope?: ScopeFilter
): Card[] {
  const map = buildCollectionMap(collection)
  return catalog.filter((c) => inScope(c, scope) && (map.get(c.id)?.owned ?? 0) === 0)
}

export function duplicateList(
  catalog: Card[],
  collection: CollectionRecord[],
  scope?: ScopeFilter
): { card: Card; owned: number }[] {
  const map = buildCollectionMap(collection)
  const out: { card: Card; owned: number }[] = []
  for (const c of catalog) {
    if (!inScope(c, scope)) continue
    const owned = map.get(c.id)?.owned ?? 0
    if (owned > 1) out.push({ card: c, owned })
  }
  return out
}

export function tradeList(
  catalog: Card[],
  collection: CollectionRecord[],
  scope?: ScopeFilter
): { card: Card; forTrade: number }[] {
  const map = buildCollectionMap(collection)
  const out: { card: Card; forTrade: number }[] = []
  for (const c of catalog) {
    if (!inScope(c, scope)) continue
    const t = map.get(c.id)?.forTrade ?? 0
    if (t > 0) out.push({ card: c, forTrade: t })
  }
  return out
}

export function wantedList(
  catalog: Card[],
  wishlist: WishlistItem[],
  scope?: ScopeFilter
): { card: Card; wanted: number; priority: WishlistItem['priority'] }[] {
  const wmap = new Map<string, WishlistItem>()
  for (const w of wishlist) wmap.set(w.cardId, w)
  const out: { card: Card; wanted: number; priority: WishlistItem['priority'] }[] = []
  for (const c of catalog) {
    if (!inScope(c, scope)) continue
    const w = wmap.get(c.id)
    if (w && w.wanted > 0 && !w.obtained) out.push({ card: c, wanted: w.wanted, priority: w.priority })
  }
  return out
}
