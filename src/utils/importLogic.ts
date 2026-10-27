import type { Card, CardCondition, CollectionRecord, IncomingCard } from '../types'
import { parseCsv } from './csv'
import { generateId, nowIso, normalizeCode } from './id'
import { clampNonNegative } from './quantity'

// ---------- CSV mapping ----------

export const FIELD_ALIASES: Record<string, string[]> = {
  id: ['id', 'internalid', 'internal_id', 'รหัสภายใน'],
  code: ['code', 'cardcode', 'card_code', 'รหัสการ์ด', 'รหัส', 'print', 'printcode', 'print_code'],
  nameTh: ['nameth', 'name_th', 'thainame', 'name_thai', 'ชื่อไทย', 'ชื่อการ์ด', 'ชื่อ', 'name'],
  nameEn: ['nameen', 'name_en', 'englishname', 'english', 'ชื่ออังกฤษ', 'nameeng'],
  set: ['set', 'cardset', 'setcode', 'set_code', 'เซ็ต', 'ชุด'],
  type: ['type', 'cardtype', 'card_type', 'ประเภท'],
  rarity: ['rarity', 'ความหายาก', 'หายาก'],
  variant: ['variant', 'printing', 'print_variant', 'รุ่นพิมพ์', 'พิมพ์'],
  imageUrl: ['imageurl', 'image_url', 'urlรูป', 'รูป', 'image', 'artwork', 'artworkurl'],
  sourceUrl: ['sourceurl', 'source_url', 'source', 'originalurl', 'original_url', 'urlแหล่งมา', 'แหล่งที่มา'],
  attribution: ['attribution', 'อ้างอิง', 'เครดิต', 'credit'],
  description: ['description', 'desc', 'คำอธิบาย', 'รายละเอียด', 'detail'],
  lastVerified: ['lastverified', 'last_verified', 'วันที่ตรวจสอบ', 'verifieddate'],
  verified: ['verified', 'ยืนยันแล้ว', 'isverified', 'is_verified'],
}

const DEFAULT_ORDER: (keyof Card)[] = [
  'code',
  'nameTh',
  'nameEn',
  'set',
  'type',
  'rarity',
  'variant',
  'imageUrl',
  'sourceUrl',
  'attribution',
  'description',
  'lastVerified',
]

function normHeader(h: string): string {
  return (h ?? '').trim().toLowerCase()
}

export function inferFieldMap(header: string[]): (keyof Card | null)[] {
  const used = new Set<string>()
  return header.map((h) => {
    const n = normHeader(h)
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (used.has(field)) continue
      if (aliases.some((a) => normHeader(a) === n)) {
        used.add(field)
        return field as keyof Card
      }
    }
    return null
  })
}

function parseCell(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const v = value.trim()
  return v === '' ? undefined : v
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  const s = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'ใช่'].includes(s)) return true
  if (['false', '0', 'no', 'n', 'ไม่'].includes(s)) return false
  return undefined
}

export function rowsToCards(
  rows: string[][],
  fieldMap: (keyof Card | null)[]
): { cards: IncomingCard[]; errors: string[] } {
  const cards: IncomingCard[] = []
  const errors: string[] = []
  rows.forEach((row, idx) => {
    const obj: Partial<Card> = {}
    fieldMap.forEach((field, col) => {
      if (!field) return
      const raw = row[col]
      if (field === 'verified') {
        const b = parseBool(raw)
        if (b !== undefined) obj.verified = b
        return
      }
      const value = parseCell(raw)
      if (value !== undefined) (obj as Record<string, unknown>)[field] = value
    })
    const code = obj.code?.trim()
    const nameTh = obj.nameTh?.trim()
    if (!code) {
      errors.push(`แถวที่ ${idx + 2}: ไม่มีรหัสการ์ด (code)`)
      return
    }
    if (!nameTh) {
      errors.push(`แถวที่ ${idx + 2}: ไม่มีชื่อไทย (nameTh)`)
      return
    }
    cards.push({ ...obj, code, nameTh } as IncomingCard)
  })
  return { cards, errors }
}

export interface CatalogCsvParse {
  header: string[]
  fieldMap: (keyof Card | null)[]
  rows: string[][]
  cards: IncomingCard[]
  errors: string[]
}

export function parseCatalogCsv(text: string): CatalogCsvParse {
  const all = parseCsv(text)
  if (all.length === 0) {
    return { header: [], fieldMap: [], rows: [], cards: [], errors: ['ไฟล์ CSV ว่างเปล่า'] }
  }
  const firstRow = all[0]
  const looksLikeHeader = firstRow.some((h) => {
    const n = normHeader(h)
    return Object.values(FIELD_ALIASES).some((aliases) =>
      aliases.some((a) => normHeader(a) === n)
    )
  })
  let header: string[]
  let dataRows: string[][]
  let fieldMap: (keyof Card | null)[]
  if (looksLikeHeader) {
    header = firstRow
    dataRows = all.slice(1)
    fieldMap = inferFieldMap(header)
  } else {
    header = DEFAULT_ORDER.map((f) => f)
    dataRows = all
    fieldMap = DEFAULT_ORDER.slice(0, firstRow.length) as (keyof Card | null)[]
    while (fieldMap.length < firstRow.length) fieldMap.push(null)
  }
  const { cards, errors } = rowsToCards(dataRows, fieldMap)
  return { header, fieldMap, rows: dataRows, cards, errors }
}

// ---------- Catalog merge ----------

export interface MergeOptions {
  addNew: boolean
  updateMetadata: boolean
}

export type MergeAction = 'added' | 'updated' | 'skipped' | 'error'

export interface MergeResult {
  toPut: Card[]
  added: number
  updated: number
  skipped: number
  errors: string[]
  actions: MergeAction[]
}

// รวมการ์ดที่นำเข้าเข้ากับแคตตาล็อกเดิม
// - เทียบซ้ำด้วย id (ถ้ามี) แล้วเทียบด้วย code (ตัวพิมพ์เดียวกันถือเป็นการ์ดเดียวกัน)
// - อัปเดต metadata ได้ถ้าเลือก updateMetadata โดยคง id เดิมไว้ (ข้อมูลคอลเลกชันจึงไม่หลุด)
// - ไม่ลบระเบียนเดิม
export function mergeCatalog(
  existing: Card[],
  incoming: IncomingCard[],
  opts: MergeOptions
): MergeResult {
  const byId = new Map(existing.map((c) => [c.id, c]))
  const byCode = new Map<string, Card>()
  for (const c of existing) {
    const k = normalizeCode(c.code)
    if (k && !byCode.has(k)) byCode.set(k, c)
  }
  const toPut: Card[] = []
  let added = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []
  const actions: MergeAction[] = []

  for (const inc of incoming) {
    const codeNorm = normalizeCode(inc.code)
    if (!codeNorm) {
      errors.push('การ์ดไม่มีรหัส (code) ถูกข้าม')
      actions.push('error')
      continue
    }
    let ex: Card | undefined
    if (inc.id) ex = byId.get(inc.id)
    if (!ex) ex = byCode.get(codeNorm)
    const now = nowIso()

    if (!ex) {
      if (!opts.addNew) {
        skipped++
        actions.push('skipped')
        continue
      }
      const id = inc.id && !byId.has(inc.id) ? inc.id : generateId()
      const card: Card = {
        id,
        code: inc.code.trim(),
        nameTh: inc.nameTh,
        nameEn: inc.nameEn,
        set: inc.set,
        type: inc.type,
        rarity: inc.rarity,
        variant: inc.variant,
        imageUrl: inc.imageUrl,
        imageLocalId: inc.imageLocalId,
        sourceUrl: inc.sourceUrl,
        attribution: inc.attribution,
        description: inc.description,
        lastVerified: inc.lastVerified,
        verified: inc.verified ?? false,
        createdAt: inc.createdAt ?? now,
        updatedAt: now,
      }
      byId.set(id, card)
      byCode.set(codeNorm, card)
      toPut.push(card)
      added++
      actions.push('added')
      continue
    }

    if (!opts.updateMetadata) {
      skipped++
      actions.push('skipped')
      continue
    }
    // อัปเดต metadata แต่คง id เดิม (collection ที่อ้าง id นี้ยังใช้ได้อยู่)
    const updatedCard: Card = {
      ...ex,
      code: inc.code.trim(),
      nameTh: inc.nameTh,
      nameEn: inc.nameEn ?? ex.nameEn,
      set: inc.set ?? ex.set,
      type: inc.type ?? ex.type,
      rarity: inc.rarity ?? ex.rarity,
      variant: inc.variant ?? ex.variant,
      imageUrl: inc.imageUrl ?? ex.imageUrl,
      imageLocalId: ex.imageLocalId, // ไม่เขียนทับรูปที่แนบเอง
      sourceUrl: inc.sourceUrl ?? ex.sourceUrl,
      attribution: inc.attribution ?? ex.attribution,
      description: inc.description ?? ex.description,
      lastVerified: inc.lastVerified ?? ex.lastVerified,
      verified: inc.verified ?? ex.verified,
      createdAt: ex.createdAt,
      updatedAt: now,
    }
    byId.set(ex.id, updatedCard)
    byCode.set(codeNorm, updatedCard)
    toPut.push(updatedCard)
    updated++
    actions.push('updated')
  }
  return { toPut, added, updated, skipped, errors, actions }
}

// ---------- Collection import ----------

export interface CollectionMergeOptions {
  overwrite: boolean
}

export interface CollectionMergeResult {
  toPut: CollectionRecord[]
  added: number
  updated: number
  skipped: number
  errors: string[]
}

// resolve รายการที่มี code/cardId ให้เป็น cardId ที่อยู่ในแคตตาล็อกจริง
export function resolveCollectionCardIds(
  items: { cardId?: string; code?: string; owned?: number; forTrade?: number; condition?: CardCondition; acquiredAt?: string; purchasePrice?: number; notes?: string }[],
  catalog: Card[]
): { resolved: CollectionRecord[]; errors: string[] } {
  const byId = new Map(catalog.map((c) => [c.id, c]))
  const byCode = new Map<string, Card>()
  for (const c of catalog) {
    const k = normalizeCode(c.code)
    if (k && !byCode.has(k)) byCode.set(k, c)
  }
  const resolved: CollectionRecord[] = []
  const errors: string[] = []
  for (const it of items) {
    let cardId = it.cardId
    if (!cardId && it.code) {
      const c = byCode.get(normalizeCode(it.code))
      cardId = c?.id
    }
    if (!cardId) {
      errors.push(`ไม่พบการ์ดสำหรับ cardId/code: ${it.cardId ?? it.code ?? '?'}`)
      continue
    }
    if (!byId.has(cardId)) {
      errors.push(`ไม่พบการ์ดในแคตตาล็อกสำหรับ cardId: ${cardId}`)
      continue
    }
    resolved.push({
      cardId,
      owned: clampNonNegative(it.owned ?? 0),
      forTrade: clampNonNegative(it.forTrade ?? 0),
      condition: it.condition ?? 'Unknown',
      acquiredAt: it.acquiredAt,
      purchasePrice: it.purchasePrice,
      notes: it.notes,
      updatedAt: nowIso(),
    })
  }
  return { resolved, errors }
}

// รวมคอลเลกชันที่นำเข้าเข้ากับของเดิม
// overwrite=false -> เพิ่มเฉพาะรายการใหม่ (ไม่เขียนทับของเดิม)
// overwrite=true  -> อัปเดตรายการที่มีอยู่ด้วยค่าจากข้อมูลนำเข้า (ยังคงฟิลด์เดิมไว้ถ้าข้อมูลนำเข้าไม่มี)
export function mergeCollection(
  existing: CollectionRecord[],
  incoming: CollectionRecord[],
  opts: CollectionMergeOptions
): CollectionMergeResult {
  const map = new Map(existing.map((r) => [r.cardId, r]))
  const toPut: CollectionRecord[] = []
  let added = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []
  for (const inc of incoming) {
    if (!inc.cardId) {
      errors.push('รายการคอลเลกชันไม่มี cardId ถูกข้าม')
      continue
    }
    const ex = map.get(inc.cardId)
    const now = nowIso()
    if (!ex) {
      toPut.push({
        cardId: inc.cardId,
        owned: clampNonNegative(inc.owned),
        forTrade: clampNonNegative(inc.forTrade),
        condition: inc.condition ?? 'Unknown',
        acquiredAt: inc.acquiredAt,
        purchasePrice: inc.purchasePrice,
        notes: inc.notes,
        updatedAt: now,
      })
      added++
    } else {
      if (!opts.overwrite) {
        skipped++
        continue
      }
      toPut.push({
        cardId: ex.cardId,
        owned: clampNonNegative(inc.owned),
        forTrade: clampNonNegative(inc.forTrade),
        condition: inc.condition ?? ex.condition,
        acquiredAt: inc.acquiredAt ?? ex.acquiredAt,
        purchasePrice: inc.purchasePrice ?? ex.purchasePrice,
        notes: inc.notes ?? ex.notes,
        updatedAt: now,
      })
      updated++
    }
  }
  return { toPut, added, updated, skipped, errors }
}
