import { describe, it, expect } from 'vitest'
import { parseCatalogJson, parseCollectionJson } from '../src/utils/json'

describe('parseCatalogJson', () => {
  it('อาร์เรย์การ์ด', () => {
    const r = parseCatalogJson('[{"code":"BT01-001","nameTh":"A"}]')
    expect(r.ok).toBe(true)
    expect(r.data?.length).toBe(1)
  })
  it('รองรับ { catalog: [...] }', () => {
    const r = parseCatalogJson('{"catalog":[{"code":"X","nameTh":"Y"}]}')
    expect(r.data?.[0].code).toBe('X')
  })
  it('invalid JSON -> errors', () => {
    const r = parseCatalogJson('not json')
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })
  it('ขาดฟิลด์บังคับ -> error', () => {
    const r = parseCatalogJson('[{"code":"X"}]')
    expect(r.errors.length).toBeGreaterThan(0)
  })
})

describe('parseCollectionJson', () => {
  it('อาร์เรย์ และ { collection: [...] }', () => {
    expect(parseCollectionJson('[{"code":"BT01-001","owned":2}]').data?.length).toBe(1)
    expect(parseCollectionJson('{"collection":[{"cardId":"A","owned":1}]}').data?.[0].cardId).toBe('A')
  })
  it('ต้องมี cardId หรือ code', () => {
    const r = parseCollectionJson('[{"owned":1}]')
    expect(r.errors.length).toBeGreaterThan(0)
  })
  it('ไม่ใช่ JSON', () => {
    expect(parseCollectionJson('{bad').ok).toBe(false)
  })
  it('จำกัดค่า condition ที่รู้จัก', () => {
    const r = parseCollectionJson('[{"code":"X","owned":1,"condition":"สภาพมด假"}]')
    expect(r.data?.[0].condition).toBeUndefined()
  })
})
