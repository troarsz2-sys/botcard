import type { Card } from '../types'
import { normalizeCode } from './id'

export function findExistingByCode(catalog: Card[], code: string): Card | undefined {
  const n = normalizeCode(code)
  return catalog.find((c) => normalizeCode(c.code) === n)
}

export function findExistingById(catalog: Card[], id: string): Card | undefined {
  return catalog.find((c) => c.id === id)
}

// หาซ้ำภายในชุดข้อมูลที่จะนำเข้า (ตาม id และตาม code)
export function detectDuplicates(
  cards: { id?: string; code?: string }[]
): { duplicateIds: string[]; duplicateCodes: string[] } {
  const idCount = new Map<string, number>()
  const codeCount = new Map<string, number>()
  for (const c of cards) {
    if (c.id) idCount.set(c.id, (idCount.get(c.id) ?? 0) + 1)
    const n = normalizeCode(c.code)
    if (n) codeCount.set(n, (codeCount.get(n) ?? 0) + 1)
  }
  return {
    duplicateIds: [...idCount.entries()].filter(([, v]) => v > 1).map(([k]) => k),
    duplicateCodes: [...codeCount.entries()].filter(([, v]) => v > 1).map(([k]) => k),
  }
}
