/**
 * syncTransform.ts
 *
 * แปลงข้อมูลจากแหล่งชุมชน (kerlos/battle-of-talinchan-cards, MIT license)
 * ให้เป็น IncomingCard[] ที่แอปใช้ได้
 *
 * ⚠️  ข้อมูลการ์ด (ชื่อ / effect) เป็นลิขสิทธิ์ของบริษัท พสุโลล จำกัด / ไลอ้อน เฮ้าส์ จำกัด
 *     โปรเจกต์ต้นทาง (MIT) ครอบคลุมเฉพาะซอร์สโค้ด ไม่ใช่เนื้อหาการ์ด
 *     นำเข้าเพื่อใช้ส่วนตัวเท่านั้น ห้ามแจกจ่ายหรือเผยแพร่ข้อมูลการ์ด
 */

import type { IncomingCard } from '../types'
import { normalizeCode } from './id'

// raw card shape จาก kerlos repo
export interface RawCommunityCard {
  name: string
  print: string
  type: string
  rare: string
  soi?: number
  cost?: number
  gem?: number
  power?: number
  symbol?: string
  color?: string
  mainEffect?: string
  subtype?: string
  favorText?: string
  dropRate?: string
  ex?: string
  customLimit?: number
}

export interface TransformResult {
  cards: IncomingCard[]
  skipped: number
  errors: string[]
}

const ATTRIBUTION =
  'kerlos/battle-of-talinchan-cards (MIT, fan-made) — ข้อมูลการ์ดเป็นลิขสิทธิ์ของ บริษัท พสุโลล จำกัด / ไลอ้อน เฮ้าส์ จำกัด'
const SOURCE_URL = 'https://github.com/kerlos/battle-of-talinchan-cards'

// ชื่อ set ที่ใช้ใน repo -> ชื่อ set มาตรฐาน
function inferSet(print: string): string {
  const m = print.match(/^([A-Z0-9]+)-\d+/i)
  return m ? m[1].toUpperCase() : ''
}

// สร้าง description สั้น ๆ จาก mainEffect + สถิติ
function buildDescription(raw: RawCommunityCard): string | undefined {
  const parts: string[] = []
  if (raw.mainEffect && raw.mainEffect.trim()) parts.push(raw.mainEffect.trim())
  if (raw.type === 'Avatar' || raw.type === 'Construct') {
    const stats: string[] = []
    if (raw.cost !== undefined) stats.push(`Cost ${raw.cost}`)
    if (raw.gem !== undefined) stats.push(`Gem ${raw.gem}`)
    if (raw.power !== undefined) stats.push(`Power ${raw.power}`)
    if (raw.symbol) stats.push(`Symbol: ${raw.symbol}`)
    if (raw.color) stats.push(`สี: ${raw.color}`)
    if (stats.length) parts.push('[' + stats.join(' / ') + ']')
  }
  if (raw.type === 'Magic' && raw.subtype) {
    parts.push(`[Magic ${raw.subtype}]`)
  }
  if (raw.favorText) parts.push(`"${raw.favorText}"`)
  if (raw.ex) parts.push(`🔒 ${raw.ex}`)
  return parts.length ? parts.join('\n') : undefined
}

/**
 * แปลงอาร์เรย์ raw card objects (parse จาก TypeScript ของ repo) → IncomingCard[]
 * ฟังก์ชัน pure ไม่ fetch เอง ทดสอบได้โดยตรง
 */
export function transformCommunityCards(raw: RawCommunityCard[]): TransformResult {
  const cards: IncomingCard[] = []
  const errors: string[] = []
  let skipped = 0

  for (const r of raw) {
    const print = r.print?.trim()
    const name = r.name?.trim()
    if (!print) {
      errors.push(`ข้ามการ์ดที่ไม่มี print code: ${name ?? '?'}`)
      skipped++
      continue
    }
    if (!name) {
      errors.push(`ข้ามการ์ดที่ไม่มีชื่อ: print=${print}`)
      skipped++
      continue
    }
    if (!normalizeCode(print)) {
      errors.push(`print code ไม่ถูกต้อง: ${print}`)
      skipped++
      continue
    }

    const card: IncomingCard = {
      code: print,
      nameTh: name,
      set: inferSet(print) || undefined,
      type: r.type || undefined,
      rarity: r.rare || undefined,
      variant: r.rare || undefined, // rare เป็น variant ในแหล่งนี้ (เช่น SCR/CBR)
      description: buildDescription(r),
      sourceUrl: SOURCE_URL,
      attribution: ATTRIBUTION,
      lastVerified: new Date().toISOString().slice(0, 10),
      verified: false, // fan-made, ไม่ใช่แหล่งทางการ
    }
    cards.push(card)
  }

  return { cards, skipped, errors }
}

/**
 * parse TypeScript source text ของ kerlos repo (เช่น bt01.ts)
 * ดึง object literals ออกมาโดยใช้ regex อย่างระมัดระวัง
 *
 * NOTE: วิธีนี้ทนทานเพียงพอสำหรับรูปแบบที่คงเดิมในไฟล์ต้นทาง
 *       ถ้า repo เปลี่ยนรูปแบบอย่างมากอาจ parse ไม่ได้ — ฟังก์ชันจะ return []
 */
export function parseCommunityTs(source: string): RawCommunityCard[] {
  const cards: RawCommunityCard[] = []
  // หา block ระหว่าง [  ...  ] ของ CARDS_* array
  const arrMatch = source.match(/=\s*\[([\s\S]*)\]/)
  if (!arrMatch) return []

  // split ที่ { เพื่อแยก object แต่ละตัว
  const raw = arrMatch[1]
  // เอา object literal แต่ละก้อน (หา { ... } ด้วย depth-counting)
  const objTexts = extractObjects(raw)

  for (const obj of objTexts) {
    try {
      const card = parseObjLiteral(obj)
      if (card && card.print && card.name) cards.push(card)
    } catch {
      // ข้ามถ้า parse ไม่ได้
    }
  }
  return cards
}

/** ดึง top-level object literals { … } จาก string */
function extractObjects(text: string): string[] {
  const result: string[] = []
  let depth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i
      depth++
    } else if (text[i] === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        result.push(text.slice(start + 1, i))
        start = -1
      }
    }
  }
  return result
}

/** parse key: value pairs จาก TypeScript object literal text */
function parseObjLiteral(text: string): RawCommunityCard | null {
  const obj: Record<string, unknown> = {}

  // string fields (single-line template literals and quoted strings)
  // handles: name: "value" | name: 'value' | name: `value`
  const strRe = /(\w+)\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/g
  let m: RegExpExecArray | null
  while ((m = strRe.exec(text)) !== null) {
    const key = m[1]
    const val = (m[2] ?? m[3] ?? m[4] ?? '').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'")
    obj[key] = val
  }

  // multi-line template literals: name: `...\n...`
  const tmplRe = /(\w+)\s*:\s*`([\s\S]*?)`/g
  while ((m = tmplRe.exec(text)) !== null) {
    const key = m[1]
    if (!(key in obj)) obj[key] = m[2]
  }

  // number fields
  const numRe = /(\w+)\s*:\s*(-?\d+(?:\.\d+)?),/g
  while ((m = numRe.exec(text)) !== null) {
    const key = m[1]
    if (!(key in obj)) obj[key] = Number(m[2])
  }

  if (!obj.print || !obj.name) return null
  return obj as unknown as RawCommunityCard
}

// ชื่อไฟล์ set ทั้งหมดที่รู้จักใน kerlos repo (ใช้ตอน generate URL)
export const COMMUNITY_SETS = [
  'bt01','bt02','bt03','bt04','bt05','bt06','bt07','bt08','bt09','bt10','bt11',
  'cc01','cc02',
  'ody1','pre0','prmo',
  'sd01','sd02','sd03','sd04','sd05','sd06','sd07','sd08',
  'sl01','sl02',
  'kd00','kd01','kd02','kd03','kd04',
  'fpro',
]

export const COMMUNITY_BASE_URL =
  'https://raw.githubusercontent.com/kerlos/battle-of-talinchan-cards/main/src/cards'

export function communitySetUrl(setFile: string): string {
  return `${COMMUNITY_BASE_URL}/${setFile}.ts`
}
