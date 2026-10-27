import { describe, it, expect } from 'vitest'
import { parseCsv, serializeCsv } from '../src/utils/csv'

describe('parseCsv', () => {
  it('แยกคอลัมน์ด้วยคอมมา', () => {
    expect(parseCsv('a,b,c')).toEqual([['a', 'b', 'c']])
  })
  it('หลายบรรทัด', () => {
    expect(parseCsv('a,b\n1,2\n3,4')).toEqual([['a', 'b'], ['1', '2'], ['3', '4']])
  })
  it('รองรับคอมมาในฟิลด์ที่ครอบด้วยคำพูด', () => {
    expect(parseCsv('"x,y",z')).toEqual([['x,y', 'z']])
  })
  it('รองรับเครื่องหมายคำพูดซ้อน', () => {
    expect(parseCsv('"he said ""hi""",z')).toEqual([['he said "hi"', 'z']])
  })
  it('รองรับขึ้นบรรทัดในฟิลด์ที่ครอบด้วยคำพูด', () => {
    expect(parseCsv('"line1\nline2",b')).toEqual([['line1\nline2', 'b']])
  })
  it('จัดการ CRLF', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })
  it('สตริงว่างให้ผลลัพธ์ว่าง', () => {
    expect(parseCsv('')).toEqual([])
  })
})

describe('serializeCsv', () => {
  it('escape คอมมา คำพูด ขึ้นบรรทัด', () => {
    const s = serializeCsv([['a,b', '"q"', 'line\nbreak']])
    expect(s).toContain('"a,b"')
    expect(s).toContain('"""q"""')
    expect(s).toContain('"line\nbreak"')
  })
  it('round-trip', () => {
    const rows = [['a', 'b,c', 'd"e'], ['1', '2', '3']]
    expect(parseCsv(serializeCsv(rows))).toEqual(rows)
  })
})
