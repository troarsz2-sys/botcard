import type {
  AppBackup,
  BackupImage,
  Card,
  CollectionRecord,
  ImportLogEntry,
  Settings,
  WishlistItem,
} from '../types'
import { APP_VERSION, BACKUP_FORMAT, CURRENT_SCHEMA_VERSION, defaultSettings } from '../types'

export interface BackupData {
  catalog: Card[]
  collection: CollectionRecord[]
  wishlist: WishlistItem[]
  settings: Settings | null
  importLog: ImportLogEntry[]
  images: BackupImage[]
}

export function createBackupFromData(data: BackupData): AppBackup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    catalog: data.catalog,
    collection: data.collection,
    wishlist: data.wishlist,
    settings: data.settings,
    importLog: data.importLog,
    images: data.images,
  }
}

export interface BackupValidation {
  ok: boolean
  errors: string[]
  backup?: AppBackup
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isArrayOf(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

export function validateBackup(obj: unknown): BackupValidation {
  const errors: string[] = []
  if (!isObj(obj)) return { ok: false, errors: ['แบ็กอัปไม่ใช่ object'] }
  if (obj.format !== BACKUP_FORMAT)
    errors.push(`format ไม่ถูกต้อง (ต้องเป็น "${BACKUP_FORMAT}")`)
  if (typeof obj.schemaVersion !== 'number') errors.push('schemaVersion ไม่ใช่ตัวเลข')
  if (!isArrayOf(obj.catalog)) errors.push('catalog ไม่ใช่อาร์เรย์')
  if (!isArrayOf(obj.collection)) errors.push('collection ไม่ใช่อาร์เรย์')
  if (!isArrayOf(obj.wishlist)) errors.push('wishlist ไม่ใช่อาร์เรย์')
  if (!isArrayOf(obj.images)) errors.push('images ไม่ใช่อาร์เรย์')
  if (!isArrayOf(obj.importLog)) errors.push('importLog ไม่ใช่อาร์เรย์')
  if (obj.settings !== null && obj.settings !== undefined && !isObj(obj.settings))
    errors.push('settings ต้องเป็น object หรือ null')

  if (isArrayOf(obj.catalog)) {
    ;(obj.catalog as unknown[]).forEach((c, i) => {
      if (!isObj(c) || typeof (c as Record<string, unknown>).id !== 'string')
        errors.push(`catalog[${i}] ต้องมี id (string)`)
      if (isObj(c) && typeof (c as Record<string, unknown>).code !== 'string')
        errors.push(`catalog[${i}] ต้องมี code (string)`)
    })
  }
  if (isArrayOf(obj.collection)) {
    ;(obj.collection as unknown[]).forEach((c, i) => {
      if (!isObj(c) || typeof (c as Record<string, unknown>).cardId !== 'string')
        errors.push(`collection[${i}] ต้องมี cardId (string)`)
    })
  }
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, errors: [], backup: obj as unknown as AppBackup }
}

export type RestoreMode = 'replace' | 'merge'

export interface RestorePlan {
  mode: RestoreMode
  catalog: Card[]
  collection: CollectionRecord[]
  wishlist: WishlistItem[]
  settings: Settings
  importLog: ImportLogEntry[]
  images: BackupImage[]
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((x) => [x.id, x]))
  for (const x of incoming) map.set(x.id, x) // ข้อมูลนำเข้าชนะตอน id ซ้ำ
  return [...map.values()]
}
function mergeByKey<T extends { cardId: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((x) => [x.cardId, x]))
  for (const x of incoming) map.set(x.cardId, x)
  return [...map.values()]
}

export function applyBackup(
  existing: BackupData,
  backup: AppBackup,
  mode: RestoreMode
): RestorePlan {
  if (mode === 'replace') {
    return {
      mode,
      catalog: backup.catalog,
      collection: backup.collection,
      wishlist: backup.wishlist,
      settings: backup.settings ?? defaultSettings(),
      importLog: backup.importLog,
      images: backup.images,
    }
  }
  return {
    mode,
    catalog: mergeById(existing.catalog, backup.catalog),
    collection: mergeByKey(existing.collection, backup.collection),
    wishlist: mergeByKey(existing.wishlist, backup.wishlist),
    settings: backup.settings ?? existing.settings ?? defaultSettings(),
    importLog: mergeById(existing.importLog, backup.importLog),
    images: mergeById(existing.images, backup.images),
  }
}
