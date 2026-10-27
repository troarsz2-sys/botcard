import { describe, it, expect } from 'vitest'
import { parseCatalogCsv, mergeCatalog, mergeCollection, resolveCollectionCardIds } from '../src/utils/importLogic'
import type { Card, CollectionRecord } from '../src/types'

const c = (id: string, code: string): Card => ({
  id,
  code,
  nameTh: code,
  verified: false,
  createdAt: 't',
  updatedAt: 't',
})

describe('parseCatalogCsv', () => {
  it('หัวตาราง + ข้อมูล', () => {
    const p = parseCatalogCsv('code,nameTh\nBT01-001,นนทก\nBT01-002,อสุรา')
    expect(p.cards.length).toBe(2)
    expect(p.cards[0].code).toBe('BT01-001')
  })
  it('ตรวจฟิลด์บังคับ และรายงานข้อผิดพลาด', () => {
    const p = parseCatalogCsv('code,nameTh\nBT01-001,\n,ชื่อไม่มีรหัส')
    expect(p.cards.length).toBe(0)
    expect(p.errors.length).toBe(2)
  })
  it('positional เมื่อไม่มีหัวตาราง', () => {
    const p = parseCatalogCsv('BT01-001,นนทก')
    expect(p.cards[0].code).toBe('BT01-001')
    expect(p.cards[0].nameTh).toBe('นนทก')
  })
  it('รองรับชื่อหัวตารางภาษาไทย', () => {
    const p = parseCatalogCsv('รหัสการ์ด,ชื่อไทย\nBT01-001,นนทก')
    expect(p.cards[0].code).toBe('BT01-001')
  })
})

describe('mergeCatalog', () => {
  it('เพิ่มการ์ดใหม่', () => {
    const r = mergeCatalog([], [{ code: 'BT01-001', nameTh: 'A' }], { addNew: true, updateMetadata: false })
    expect(r.added).toBe(1)
    expect(r.toPut[0].id).toBeTruthy()
  })
  it('อัปเดต metadata แต่คง id เดิม (รักษาข้อมูลคอลเลกชัน)', () => {
    const existing = [c('OLD', 'BT01-001')]
    const incoming = [{ id: 'NEW', code: 'BT01-001', nameTh: 'อัปเดต' }]
    const r = mergeCatalog(existing, incoming, { addNew: true, updateMetadata: true })
    expect(r.updated).toBe(1)
    expect(r.toPut[0].id).toBe('OLD') // คง id เดิม -> collection ยังโยงได้อยู่
    expect(r.toPut[0].nameTh).toBe('อัปเดต')
  })
  it('ไม่อัปเดตถ้ายังไม่เลือก updateMetadata', () => {
    const existing = [c('1', 'BT01-001')]
    const r = mergeCatalog(existing, [{ code: 'BT01-001', nameTh: 'อัปเดต' }], { addNew: true, updateMetadata: false })
    expect(r.skipped).toBe(1)
    expect(r.toPut.length).toBe(0)
  })
  it('ไม่เพิ่มถ้าปิด addNew', () => {
    const r = mergeCatalog([], [{ code: 'BT01-001', nameTh: 'A' }], { addNew: false, updateMetadata: false })
    expect(r.added).toBe(0)
    expect(r.skipped).toBe(1)
  })
  it('ไม่ลบระเบียนเดิม', () => {
    const existing = [c('1', 'BT01-001'), c('2', 'BT01-002')]
    const r = mergeCatalog(existing, [{ code: 'BT01-001', nameTh: 'อัปเดต' }], { addNew: true, updateMetadata: true })
    expect(r.toPut.length).toBe(1) // ไม่มีการ re-put ของเดิมที่ไม่เกี่ยวข้อง
    // แคตตาล็อกเดิมยังคงอยู่ (จำลองว่า repo ยังมี 2 รายการ)
    expect(existing.length).toBe(2)
  })
})

describe('mergeCollection', () => {
  const existing: CollectionRecord[] = [
    { cardId: 'A', owned: 2, forTrade: 0, condition: 'Good', notes: 'keep', updatedAt: 't' },
  ]
  it('overwrite=false ไม่แตะของเดิม', () => {
    const r = mergeCollection(
      existing,
      [{ cardId: 'A', owned: 5, forTrade: 0, condition: 'Mint', updatedAt: 't' }],
      { overwrite: false }
    )
    expect(r.skipped).toBe(1)
    expect(r.toPut.length).toBe(0)
  })
  it('overwrite=true อัปเดตแต่คง notes ถ้าขาเข้าไม่มี', () => {
    const r = mergeCollection(
      existing,
      [{ cardId: 'A', owned: 5, forTrade: 0, condition: 'Mint', updatedAt: 't' }],
      { overwrite: true }
    )
    expect(r.updated).toBe(1)
    expect(r.toPut[0].owned).toBe(5)
    expect(r.toPut[0].notes).toBe('keep')
  })
  it('เพิ่มรายการใหม่', () => {
    const r = mergeCollection(
      existing,
      [{ cardId: 'B', owned: 1, forTrade: 0, condition: 'Near Mint', updatedAt: 't' }],
      { overwrite: false }
    )
    expect(r.added).toBe(1)
  })
})

describe('resolveCollectionCardIds', () => {
  it('หา cardId ด้วย code', () => {
    const catalog = [c('A', 'BT01-001')]
    const { resolved, errors } = resolveCollectionCardIds([{ code: 'bt01-001', owned: 1 }], catalog)
    expect(resolved[0].cardId).toBe('A')
    expect(errors.length).toBe(0)
  })
  it('แจ้งเตือนเมื่อไม่พบการ์ด', () => {
    const { errors } = resolveCollectionCardIds([{ code: 'NOPE', owned: 1 }], [])
    expect(errors.length).toBe(1)
  })
})
