#!/usr/bin/env node
/**
 * scripts/fetch-bot-catalog.mjs
 *
 * สคริปต์ Node.js ดาวน์โหลดข้อมูลการ์ดจาก kerlos/battle-of-talinchan-cards (MIT)
 * แล้วแปลงเป็น bot-catalog.json ที่นำเข้าแอปได้
 *
 * ใช้งาน:
 *   node scripts/fetch-bot-catalog.mjs
 *   node scripts/fetch-bot-catalog.mjs --out my-catalog.json
 *   node scripts/fetch-bot-catalog.mjs --sets bt01,bt02
 *
 * ⚠️  ซอร์สโค้ดของโปรเจกต์ต้นทาง (MIT) แต่ข้อมูลการ์ดเป็นลิขสิทธิ์ของ
 *     บริษัท พสุโลล จำกัด / ไลอ้อน เฮ้าส์ จำกัด
 *     ใช้เพื่อการสะสมส่วนตัวเท่านั้น
 */

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ---- configuration ----
const BASE_URL = 'https://raw.githubusercontent.com/kerlos/battle-of-talinchan-cards/main/src/cards'
const ATTRIBUTION = 'kerlos/battle-of-talinchan-cards (MIT, fan-made) — ข้อมูลการ์ดเป็นลิขสิทธิ์ของ บริษัท พสุโลล จำกัด / ไลอ้อน เฮ้าส์ จำกัด'
const SOURCE_URL = 'https://github.com/kerlos/battle-of-talinchan-cards'
const ALL_SETS = [
  'bt01','bt02','bt03','bt04','bt05','bt06','bt07','bt08','bt09','bt10','bt11',
  'cc01','cc02',
  'ody1','pre0','prmo',
  'sd01','sd02','sd03','sd04','sd05','sd06','sd07','sd08',
  'sl01','sl02',
  'kd00','kd01','kd02','kd03','kd04',
  'fpro',
]
const DELAY_MS = 300  // respectful delay between requests

// ---- CLI args ----
const args = process.argv.slice(2)
let outFile = join(ROOT, 'bot-catalog.json')
let targetSets = ALL_SETS

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out' && args[i + 1]) outFile = args[++i]
  if (args[i] === '--sets' && args[i + 1]) targetSets = args[++i].split(',').map(s => s.trim().toLowerCase())
}

// ---- helpers ----
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/** Extract { … } objects from array text */
function extractObjects(text) {
  const result = []
  let depth = 0, start = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++ }
    else if (text[i] === '}') {
      depth--
      if (depth === 0 && start !== -1) { result.push(text.slice(start + 1, i)); start = -1 }
    }
  }
  return result
}

/** Parse a TypeScript object literal into a plain object */
function parseObjLiteral(text) {
  const obj = {}
  // string fields
  const strRe = /(\w+)\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/g
  let m
  while ((m = strRe.exec(text)) !== null) {
    const key = m[1]
    const val = (m[2] ?? m[3] ?? m[4] ?? '').replace(/\\n/g, '\n').replace(/\\"/g, '"')
    obj[key] = val
  }
  // multiline template literals
  const tmplRe = /(\w+)\s*:\s*`([\s\S]*?)`/g
  while ((m = tmplRe.exec(text)) !== null) {
    if (!(m[1] in obj)) obj[m[1]] = m[2]
  }
  // numbers
  const numRe = /(\w+)\s*:\s*(-?\d+(?:\.\d+)?),/g
  while ((m = numRe.exec(text)) !== null) {
    if (!(m[1] in obj)) obj[m[1]] = Number(m[2])
  }
  return obj
}

/** Parse the TypeScript source of a set file */
function parseSetTs(source) {
  const cards = []
  const arrMatch = source.match(/=\s*\[([\s\S]*)\]/)
  if (!arrMatch) return cards
  const objs = extractObjects(arrMatch[1])
  for (const o of objs) {
    try {
      const c = parseObjLiteral(o)
      if (c.print && c.name) cards.push(c)
    } catch { /* skip */ }
  }
  return cards
}

/** Infer set code from print (e.g. "BT01-001" → "BT01") */
function inferSet(print) {
  const m = print.match(/^([A-Z0-9]+)-\d+/i)
  return m ? m[1].toUpperCase() : ''
}

/** Build description text from raw card data */
function buildDescription(r) {
  const parts = []
  if (r.mainEffect?.trim()) parts.push(r.mainEffect.trim())
  if (r.type === 'Avatar' || r.type === 'Construct') {
    const stats = []
    if (r.cost !== undefined) stats.push(`Cost ${r.cost}`)
    if (r.gem !== undefined) stats.push(`Gem ${r.gem}`)
    if (r.power !== undefined) stats.push(`Power ${r.power}`)
    if (r.symbol) stats.push(`Symbol: ${r.symbol}`)
    if (r.color) stats.push(`สี: ${r.color}`)
    if (stats.length) parts.push('[' + stats.join(' / ') + ']')
  }
  if (r.type === 'Magic' && r.subtype) parts.push(`[Magic ${r.subtype}]`)
  if (r.favorText) parts.push(`"${r.favorText}"`)
  if (r.ex) parts.push(`🔒 ${r.ex}`)
  return parts.join('\n') || undefined
}

/** Convert a raw card to app IncomingCard format */
function toIncomingCard(r) {
  return {
    code: r.print,
    nameTh: r.name,
    set: inferSet(r.print) || undefined,
    type: r.type || undefined,
    rarity: r.rare || undefined,
    variant: r.rare || undefined,
    description: buildDescription(r),
    sourceUrl: SOURCE_URL,
    attribution: ATTRIBUTION,
    lastVerified: new Date().toISOString().slice(0, 10),
    verified: false,
  }
}

// ---- main ----
async function main() {
  console.log('=== BOT Card Catalog Fetch Script ===')
  console.log(`แหล่งข้อมูล: ${SOURCE_URL}`)
  console.log(`ไฟล์ output: ${outFile}`)
  console.log(`จำนวนชุด: ${targetSets.length}\n`)
  console.log('⚠️  ข้อมูลการ์ดเป็นลิขสิทธิ์ของ บริษัท พสุโลล จำกัด / ไลอ้อน เฮ้าส์ จำกัด')
  console.log('    ใช้เพื่อการสะสมส่วนตัวเท่านั้น\n')

  const allCards = []
  const errors = []
  let totalSkipped = 0

  for (let i = 0; i < targetSets.length; i++) {
    const setFile = targetSets[i]
    const url = `${BASE_URL}/${setFile}.ts`
    process.stdout.write(`[${i + 1}/${targetSets.length}] ${setFile}… `)

    try {
      const res = await fetch(url)
      if (!res.ok) {
        const msg = `HTTP ${res.status}`
        errors.push(`${setFile}: ${msg}`)
        console.log(`❌ ${msg}`)
        continue
      }
      const text = await res.text()
      const rawCards = parseSetTs(text)
      if (rawCards.length === 0) {
        errors.push(`${setFile}: parse ได้ 0 รายการ`)
        console.log('⚠️  parse ได้ 0 รายการ')
        continue
      }
      const cards = rawCards
        .filter(r => r.print && r.name)
        .map(toIncomingCard)
      allCards.push(...cards)
      const skipped = rawCards.length - cards.length
      totalSkipped += skipped
      console.log(`✓ ${cards.length} รายการ${skipped > 0 ? ` (ข้าม ${skipped})` : ''}`)
    } catch (e) {
      errors.push(`${setFile}: ${e.message}`)
      console.log(`❌ ${e.message}`)
    }

    if (i < targetSets.length - 1) await sleep(DELAY_MS)
  }

  console.log(`\n── สรุป ──`)
  console.log(`รายการที่ดึงได้: ${allCards.length}`)
  console.log(`ข้ามเพราะข้อมูลไม่ครบ: ${totalSkipped}`)
  console.log(`ข้อผิดพลาด: ${errors.length}`)
  if (errors.length > 0) {
    console.log('รายการข้อผิดพลาด:')
    errors.forEach(e => console.log('  ✗', e))
  }

  if (allCards.length === 0) {
    console.error('\n❌ ไม่ได้ข้อมูลเลย ไม่สร้างไฟล์')
    process.exit(1)
  }

  writeFileSync(outFile, JSON.stringify(allCards, null, 2), 'utf-8')
  console.log(`\n✅ บันทึก ${allCards.length} รายการ → ${outFile}`)
  console.log('\nวิธีนำเข้าแอป:')
  console.log('  1. เปิดแอป → หน้า "ซิงก์ข้อมูลการ์ด" → แท็บ "ไฟล์ JSON"')
  console.log('  2. เลือกไฟล์ bot-catalog.json ที่เพิ่งสร้าง')
  console.log('  3. กด "นำเข้าและอัปเดตแคตตาล็อก"')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
