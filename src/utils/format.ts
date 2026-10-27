import {
  CONDITION_LABELS_TH,
  PRIORITY_LABELS_TH,
  type CardCondition,
  type WishlistPriority,
} from '../types'

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatNumber(n: number): string {
  return n.toLocaleString('th-TH')
}

export function conditionLabel(c: CardCondition): string {
  return CONDITION_LABELS_TH[c] ?? c
}

export function priorityLabel(p: WishlistPriority): string {
  return PRIORITY_LABELS_TH[p] ?? p
}

export function rarityLabel(r?: string): string {
  return r && r.trim() !== '' ? r : '—'
}

export function setText(value?: string, fallback = '—'): string {
  return value && value.trim() !== '' ? value : fallback
}
