import { describe, it, expect } from 'vitest'
import { createBackupFromData, validateBackup, applyBackup } from '../src/utils/backup'
import type { Card, CollectionRecord, Settings, WishlistItem, ImportLogEntry, BackupImage } from '../src/types'
import { BACKUP_FORMAT, CURRENT_SCHEMA_VERSION, defaultSettings } from '../src/types'

const card = (id: string, code: string): Card => ({
  id,
  code,
  nameTh: id,
  verified: false,
  createdAt: '',
  updatedAt: '',
})

const baseData = (catalog: Card[]) => ({
  catalog,
  collection: [] as CollectionRecord[],
  wishlist: [] as WishlistItem[],
  settings: defaultSettings() as Settings | null,
  importLog: [] as ImportLogEntry[],
  images: [] as BackupImage[],
})

describe('createBackupFromData', () => {
  it('สร้างแบ็กอัปถูกรูปแบบ', () => {
    const b = createBackupFromData(baseData([card('1', 'A')]))
    expect(b.format).toBe(BACKUP_FORMAT)
    expect(b.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(b.catalog.length).toBe(1)
  })
})

describe('validateBackup', () => {
  const valid = createBackupFromData(baseData([card('1', 'A')]))

  it('ผ่านเมื่อถูกต้อง', () => {
    const v = validateBackup(JSON.parse(JSON.stringify(valid)))
    expect(v.ok).toBe(true)
  })
  it('ปฏิเสธเมื่อ format ผิด', () => {
    const v = validateBackup({ format: 'wrong', schemaVersion: 1, catalog: [], collection: [], wishlist: [], importLog: [], images: [] })
    expect(v.ok).toBe(false)
  })
  it('ปฏิเสธเมื่อ catalog ไม่ใช่ array', () => {
    const v = validateBackup({ ...JSON.parse(JSON.stringify(valid)), catalog: 'x' })
    expect(v.ok).toBe(false)
  })
  it('ปฏิเสธเมื่อรายการ catalog ไม่มี id/code', () => {
    const v = validateBackup({ ...JSON.parse(JSON.stringify(valid)), catalog: [{ nameTh: 'x' }] })
    expect(v.ok).toBe(false)
  })
  it('ปฏิเสธเมื่อ collection รายการไม่มี cardId', () => {
    const v = validateBackup({ ...JSON.parse(JSON.stringify(valid)), collection: [{ owned: 1 }] })
    expect(v.ok).toBe(false)
  })
})

describe('applyBackup', () => {
  const existing = baseData([card('E1', 'E1')])
  const backup = createBackupFromData({
    catalog: [card('B1', 'B1')],
    collection: [{ cardId: 'B1', owned: 1, forTrade: 0, condition: 'Mint', updatedAt: '' }],
    wishlist: [],
    settings: defaultSettings(),
    importLog: [],
    images: [],
  })

  it('replace ใช้ข้อมูลจาก backup ทั้งหมด', () => {
    const plan = applyBackup(existing, backup, 'replace')
    expect(plan.catalog.map((c) => c.id)).toEqual(['B1'])
  })
  it('merge รวม id ที่มีอยู่เดิม', () => {
    const plan = applyBackup(existing, backup, 'merge')
    const ids = plan.catalog.map((c) => c.id)
    expect(ids).toContain('E1')
    expect(ids).toContain('B1')
  })
  it('merge ข้อมูลนำเข้าชนะตอน id ซ้ำ', () => {
    const backup2 = createBackupFromData(baseData([card('E1', 'CHANGED')]))
    const plan = applyBackup(existing, backup2, 'merge')
    expect(plan.catalog.find((c) => c.id === 'E1')?.code).toBe('CHANGED')
  })
})
