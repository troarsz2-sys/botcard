// ประเภทข้อมูลทั้งหมดของแอป
// แยก catalog (ข้อมูลการ์ด) ออกจาก collection (ข้อมูลส่วนตัวของเจ้าของ) เพื่อไม่ให้การอัปเดตแคตตาล็อก
// ทำลายข้อมูลจำนวนที่มี/โน้ตส่วนตัว

// สภาพการ์ด
export type CardCondition =
  | 'Mint'
  | 'Near Mint'
  | 'Excellent'
  | 'Good'
  | 'Played'
  | 'Damaged'
  | 'Unknown'

// ความสำคัญของการ์ดที่อยากได้ (wishlist)
export type WishlistPriority = 'low' | 'medium' | 'high'

// ประเภทการนำเข้า
export type ImportKind =
  | 'catalog-csv'
  | 'catalog-json'
  | 'collection-json'
  | 'backup-restore'
  | 'sync-github-community'
  | 'sync-json-file'

// ค่าป้ายหมวดหมู่ที่พบจากแหล่งข้อมูลชุมชน (ใช้เป็นคำแนะนำเท่านั้น ไม่ใช่เนื้อหาการ์ด)
export const SUGGESTED_SETS = [
  'BT01', 'BT02', 'BT03', 'BT04', 'BT05', 'BT06', 'BT07', 'BT08',
  'SD01', 'SD02', 'SD03', 'SD04', 'SD05', 'SD06', 'SD07',
  'CC01', 'CC02', 'ODY1', 'PRE0', 'PRMO', 'SL01',
]
export const SUGGESTED_RARITIES = ['C', 'R', 'SR', 'UR', 'PR', 'CBR', 'SCR', 'USEC']
export const SUGGESTED_TYPES = ['Avatar', 'Magic', 'Life', 'Construct']

// เวอร์ชัน schema ของฐานข้อมูล/แบ็กอัป
export const CURRENT_SCHEMA_VERSION = 1
export const APP_VERSION = '1.0.0'
export const BACKUP_FORMAT = 'bot-cards-backup'

// ระเบียนแคตตาล็อกการ์ด
export interface Card {
  id: string // รหัสภายในที่ไม่ซ้ำ
  code: string // รหัสการ์ดทางการ (เช่น BT01-001) ใช้ตรวจซ้ำ
  nameTh: string // ชื่อไทย
  nameEn?: string // ชื่ออังกฤษ (ถ้ามี)
  set?: string // เซ็ต/ชุด
  type?: string // ประเภทการ์ด
  rarity?: string // ความหายาก
  variant?: string // รุ่นพิมพ์/variant
  imageUrl?: string // URL รูปการ์ด (ถ้าได้รับอนุญาต)
  imageLocalId?: string // รหัสรูปที่แนบเอง (เก็บเป็น Blob ในฐานข้อมูล)
  sourceUrl?: string // URL แหล่งที่มาดั้งเดิม
  attribution?: string // การอ้างอิงแหล่งที่มา
  description?: string // คำอธิบายการ์ด
  lastVerified?: string // วันที่ตรวจสอบล่าสุด (ISO)
  verified: boolean // แยกว่าเป็นข้อมูลที่ตรวจสอบแล้วหรือกรอกเอง/ยังไม่ยืนยัน
  createdAt: string
  updatedAt: string
}

// ข้อมูลส่วนตัวของเจ้าของต่อหนึ่งการ์ด (คีย์ด้วย cardId)
export interface CollectionRecord {
  cardId: string
  owned: number // จำนวนที่มี
  forTrade: number // จำนวนที่พร้อมแลก
  condition: CardCondition
  acquiredAt?: string // วันที่ได้มา (ISO)
  purchasePrice?: number // ราคาที่ซื้อ (ไม่บังคับ)
  notes?: string // โน้ตส่วนตัว
  updatedAt: string
}

// รายการการ์ดที่อยากได้ (wishlist) ต่อหนึ่งการ์ด (คีย์ด้วย cardId)
export interface WishlistItem {
  cardId: string
  wanted: number // จำนวนที่อยากได้
  priority: WishlistPriority
  notes?: string
  obtained: boolean // ทำเครื่องหมายว่าได้แล้ว
  createdAt: string
  updatedAt: string
}

// รูปภาพที่เก็บในฐานข้อมูล
export interface StoredImage {
  id: string
  blob: Blob
  mime: string
  createdAt: string
}

// รูปในรูปแบบแบ็กอัป (base64 data URL)
export interface BackupImage {
  id: string
  mime: string
  data: string // data URL
}

// ตั้งค่าแอป (singleton id = 'app')
export interface Settings {
  id: 'app'
  schemaVersion: number
  knownSets: string[]
  knownRarities: string[]
  knownTypes: string[]
  lastBackupAt?: string
  // ซิงก์
  lastSyncAt?: string
  syncSource?: SyncSource
  syncStats?: SyncStats
  createdAt: string
  updatedAt: string
}

// แหล่งที่มาสำหรับซิงก์
export type SyncSource = 'github-community' | 'json-file'

// สถิติการซิงก์ล่าสุด
export interface SyncStats {
  source: SyncSource
  syncedAt: string
  totalFetched: number
  added: number
  updated: number
  skipped: number
  errors: string[]
}

// ประวัติการนำเข้า
export interface ImportLogEntry {
  id: string
  date: string
  kind: ImportKind
  fileName?: string
  recordCount: number
  added: number
  updated: number
  skipped: number
  errors: string[]
}

// แบ็กอัปเต็มรูปแบบ
export interface AppBackup {
  format: typeof BACKUP_FORMAT
  schemaVersion: number
  appVersion: string
  createdAt: string
  catalog: Card[]
  collection: CollectionRecord[]
  wishlist: WishlistItem[]
  settings: Settings | null
  importLog: ImportLogEntry[]
  images: BackupImage[]
}

// ป้ายกำกับภาษาไทย
export const CONDITION_LABELS_TH: Record<CardCondition, string> = {
  Mint: 'สภาพสมบูรณ์ (Mint)',
  'Near Mint': 'ใกล้สมบูรณ์ (Near Mint)',
  Excellent: 'ดีมาก (Excellent)',
  Good: 'ดี (Good)',
  Played: 'เล่นแล้ว (Played)',
  Damaged: 'ชำรุด (Damaged)',
  Unknown: 'ไม่ทราบสภาพ (Unknown)',
}

export const PRIORITY_LABELS_TH: Record<WishlistPriority, string> = {
  low: 'ต่ำ',
  medium: 'กลาง',
  high: 'สูง',
}

export function defaultSettings(): Settings {
  const now = new Date().toISOString()
  return {
    id: 'app',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    knownSets: [...SUGGESTED_SETS],
    knownRarities: [...SUGGESTED_RARITIES],
    knownTypes: [...SUGGESTED_TYPES],
    createdAt: now,
    updatedAt: now,
  }
}

// รูปแบบข้อมูลตอนนำเข้า (ยังไม่ resolve)
export type IncomingCard = Partial<Card> & { code: string; nameTh: string }

export interface CollectionIncoming {
  cardId?: string
  code?: string
  owned?: number
  forTrade?: number
  condition?: CardCondition
  acquiredAt?: string
  purchasePrice?: number
  notes?: string
}
