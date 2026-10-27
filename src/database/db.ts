import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Card,
  CollectionRecord,
  ImportLogEntry,
  Settings,
  StoredImage,
  WishlistItem,
} from '../types'

// นิยาม schema ของ IndexedDB สำหรับให้ idb ตรวจ type ได้
export interface BotDBSchema extends DBSchema {
  catalog: {
    key: string
    value: Card
    indexes: { 'by-code': string }
  }
  collection: { key: string; value: CollectionRecord }
  wishlist: { key: string; value: WishlistItem }
  settings: { key: string; value: Settings }
  importLog: { key: string; value: ImportLogEntry }
  images: { key: string; value: StoredImage }
}

export const DB_NAME = 'bot-cards-db'
export const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<BotDBSchema>> | null = null

export function getDB(): Promise<IDBPDatabase<BotDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<BotDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const catalog = db.createObjectStore('catalog', { keyPath: 'id' })
        catalog.createIndex('by-code', 'code')
        db.createObjectStore('collection', { keyPath: 'cardId' })
        db.createObjectStore('wishlist', { keyPath: 'cardId' })
        db.createObjectStore('settings', { keyPath: 'id' })
        db.createObjectStore('importLog', { keyPath: 'id' })
        db.createObjectStore('images', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// ล้างข้อมูลทุก store (ใช้ตอน restore แบบ "แทนที่ทั้งหมด")
export async function clearAllStores(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    ['catalog', 'collection', 'wishlist', 'settings', 'importLog', 'images'],
    'readwrite'
  )
  await Promise.all([
    tx.objectStore('catalog').clear(),
    tx.objectStore('collection').clear(),
    tx.objectStore('wishlist').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('importLog').clear(),
    tx.objectStore('images').clear(),
  ])
  await tx.done
}
