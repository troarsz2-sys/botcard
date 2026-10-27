import type { CardCondition, CollectionIncoming, IncomingCard } from '../types'
import { clampNonNegative } from './quantity'

export interface ValidationResult<T> {
  ok: boolean
  errors: string[]
  data?: T
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function str(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (v == null) return undefined
  return String(v)
}
function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return undefined
}
function bool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (['true', '1', 'yes', 'y', 'ใช่'].includes(s)) return true
    if (['false', '0', 'no', 'n', 'ไม่'].includes(s)) return false
  }
  return undefined
}

const VALID_CONDITIONS: CardCondition[] = [
  'Mint',
  'Near Mint',
  'Excellent',
  'Good',
  'Played',
  'Damaged',
  'Unknown',
]

// นำเข้าแคตตาล็อกจาก JSON (อาร์เรย์ของการ์ด หรือ { catalog: [...] })
export function parseCatalogJson(text: string): ValidationResult<IncomingCard[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return { ok: false, errors: ['JSON ไม่ถูกต้อง: ' + (e as Error).message] }
  }
  let arr: unknown[]
  if (Array.isArray(parsed)) arr = parsed
  else if (isObj(parsed) && Array.isArray(parsed.catalog)) arr = parsed.catalog as unknown[]
  else return { ok: false, errors: ['JSON ต้องเป็นอาร์เรย์ของการ์ด หรือ { catalog: [...] }'] }

  const cards: IncomingCard[] = []
  const errors: string[] = []
  arr.forEach((item, i) => {
    if (!isObj(item)) {
      errors.push(`รายการที่ ${i + 1} ไม่ใช่ object`)
      return
    }
    const code = str(item.code ?? item.cardCode ?? item.card_code)?.trim()
    const nameTh = str(item.nameTh ?? item.name_th ?? item.nameThai ?? item.name)?.trim()
    if (!code) {
      errors.push(`รายการที่ ${i + 1}: ไม่มี code`)
      return
    }
    if (!nameTh) {
      errors.push(`รายการที่ ${i + 1}: ไม่มี nameTh`)
      return
    }
    const card: IncomingCard = { code, nameTh }
    const nameEn = str(item.nameEn ?? item.name_en ?? item.english)
    if (nameEn) card.nameEn = nameEn
    const set = str(item.set ?? item.setCode ?? item.set_code)
    if (set) card.set = set
    const type = str(item.type ?? item.cardType ?? item.card_type)
    if (type) card.type = type
    const rarity = str(item.rarity)
    if (rarity) card.rarity = rarity
    const variant = str(item.variant ?? item.printing)
    if (variant) card.variant = variant
    const imageUrl = str(item.imageUrl ?? item.image_url ?? item.image)
    if (imageUrl) card.imageUrl = imageUrl
    const sourceUrl = str(item.sourceUrl ?? item.source_url ?? item.source)
    if (sourceUrl) card.sourceUrl = sourceUrl
    const attribution = str(item.attribution ?? item.credit)
    if (attribution) card.attribution = attribution
    const description = str(item.description ?? item.desc)
    if (description) card.description = description
    const lastVerified = str(item.lastVerified ?? item.last_verified)
    if (lastVerified) card.lastVerified = lastVerified
    const verified = bool(item.verified ?? item.isVerified)
    if (verified !== undefined) card.verified = verified
    const id = str(item.id ?? item.internalId ?? item.internal_id)
    if (id) card.id = id
    cards.push(card)
  })
  return { ok: cards.length > 0, errors, data: cards }
}

// นำเข้าข้อมูลคอลเลกชันส่วนตัวจาก JSON (อาร์เรย์ หรือ { collection: [...] })
export function parseCollectionJson(text: string): ValidationResult<CollectionIncoming[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return { ok: false, errors: ['JSON ไม่ถูกต้อง: ' + (e as Error).message] }
  }
  let arr: unknown[]
  if (Array.isArray(parsed)) arr = parsed
  else if (isObj(parsed) && Array.isArray(parsed.collection)) arr = parsed.collection as unknown[]
  else return { ok: false, errors: ['JSON ต้องเป็นอาร์เรย์ หรือ { collection: [...] }'] }

  const items: CollectionIncoming[] = []
  const errors: string[] = []
  arr.forEach((item, i) => {
    if (!isObj(item)) {
      errors.push(`รายการที่ ${i + 1} ไม่ใช่ object`)
      return
    }
    const cardId = str(item.cardId ?? item.card_id)
    const code = str(item.code ?? item.cardCode ?? item.card_code)
    if (!cardId && !code) {
      errors.push(`รายการที่ ${i + 1}: ต้องมี cardId หรือ code`)
      return
    }
    const rec: CollectionIncoming = {}
    if (cardId) rec.cardId = cardId
    if (code) rec.code = code
    const owned = num(item.owned ?? item.quantity ?? item.qty)
    if (owned !== undefined) rec.owned = clampNonNegative(owned)
    const forTrade = num(item.forTrade ?? item.for_trade ?? item.trade)
    if (forTrade !== undefined) rec.forTrade = clampNonNegative(forTrade)
    const condition = str(item.condition)
    if (condition && VALID_CONDITIONS.includes(condition as CardCondition))
      rec.condition = condition as CardCondition
    const acquiredAt = str(item.acquiredAt ?? item.acquired_at ?? item.acquired)
    if (acquiredAt) rec.acquiredAt = acquiredAt
    const purchasePrice = num(item.purchasePrice ?? item.purchase_price ?? item.price)
    if (purchasePrice !== undefined) rec.purchasePrice = purchasePrice
    const notes = str(item.notes ?? item.note)
    if (notes) rec.notes = notes
    items.push(rec)
  })
  return { ok: items.length > 0, errors, data: items }
}
