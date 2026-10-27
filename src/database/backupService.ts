import type { AppBackup, StoredImage } from '../types'
import { defaultSettings } from '../types'
import { applyBackup, validateBackup, type RestoreMode } from '../utils/backup'
import { dataUrlToBlob } from '../utils/image'
import { generateId, nowIso } from '../utils/id'
import { clearAllStores } from './db'
import {
  addImportLog,
  bulkPutCards,
  bulkPutCollection,
  bulkPutImages,
  bulkPutWishlist,
  getAllCards,
  getAllCollection,
  getAllImages,
  getAllImportLog,
  getAllWishlist,
  getSettings,
  putSettings,
} from './repositories'

export interface RestoreResult {
  ok: boolean
  errors: string[]
  mode: RestoreMode
  catalogCount: number
}

// นำแบ็กอัปเข้าฐานข้อมูลจริง
export async function restoreFromBackup(
  backupRaw: unknown,
  mode: RestoreMode
): Promise<RestoreResult> {
  const v = validateBackup(backupRaw)
  if (!v.ok || !v.backup) {
    return { ok: false, errors: v.errors, mode, catalogCount: 0 }
  }
  const backup = v.backup as AppBackup

  if (mode === 'replace') {
    await clearAllStores()
  }
  // สำหรับ merge: ใช้ put ทับตาม id/cardId (ข้อมูลนำเข้าชนะ) ส่วนที่มีอยู่เดิมและไม่อยู่ในแบ็กอัปจะคงไว้
  await Promise.all([
    bulkPutCards(backup.catalog),
    bulkPutCollection(backup.collection),
    bulkPutWishlist(backup.wishlist),
  ])
  const storedImages: StoredImage[] = []
  for (const bi of backup.images) {
    try {
      storedImages.push({ id: bi.id, blob: dataUrlToBlob(bi.data), mime: bi.mime, createdAt: nowIso() })
    } catch {
      // ข้ามรูปที่เสีย
    }
  }
  await bulkPutImages(storedImages)
  await putSettings(backup.settings ?? (await getSettings()) ?? defaultSettings())

  await addImportLog({
    id: generateId(),
    date: nowIso(),
    kind: 'backup-restore',
    recordCount: backup.catalog.length,
    added: backup.catalog.length,
    updated: 0,
    skipped: 0,
    errors: [],
  })

  return { ok: true, errors: [], mode, catalogCount: backup.catalog.length }
}
