import { describe, it, expect } from 'vitest'
import { detectDuplicates, findExistingByCode } from '../src/utils/dedup'
import type { Card } from '../src/types'

const c = (id: string, code: string): Card => ({
  id,
  code,
  nameTh: id,
  verified: false,
  createdAt: '',
  updatedAt: '',
})

describe('detectDuplicates', () => {
  it('หาซ้ำ code แบบ case-insensitive', () => {
    const cards = [c('1', 'BT01-001'), c('2', 'bt01-001'), c('3', 'BT02-001')]
    const d = detectDuplicates(cards)
    expect(d.duplicateCodes).toContain('BT01-001')
    expect(d.duplicateIds).toEqual([])
  })
  it('หาซ้ำ id', () => {
    const cards = [c('1', 'BT01-001'), c('1', 'BT01-002')]
    const d = detectDuplicates(cards)
    expect(d.duplicateIds).toContain('1')
  })
})

describe('findExistingByCode', () => {
  it('เทียบ code แบบ case-insensitive', () => {
    const catalog = [c('1', 'BT01-001')]
    expect(findExistingByCode(catalog, 'bt01-001')?.id).toBe('1')
    expect(findExistingByCode(catalog, 'BT01-999')).toBeUndefined()
  })
})
