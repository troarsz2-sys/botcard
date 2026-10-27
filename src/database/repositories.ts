import { getDB } from './db'
import type {
  Card,
  CollectionRecord,
  ImportLogEntry,
  Settings,
  StoredImage,
  WishlistItem,
} from '../types'

// ---------- Catalog ----------
export async function getAllCards(): Promise<Card[]> {
  const db = await getDB()
  return db.getAll('catalog')
}

export async function getCard(id: string): Promise<Card | undefined> {
  const db = await getDB()
  return db.get('catalog', id)
}

export async function getCardByCode(code: string): Promise<Card | undefined> {
  const db = await getDB()
  return db.getFromIndex('catalog', 'by-code', code)
}

export async function putCard(card: Card): Promise<void> {
  const db = await getDB()
  await db.put('catalog', card)
}

export async function bulkPutCards(cards: Card[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('catalog', 'readwrite')
  await Promise.all(cards.map((c) => tx.store.put(c)))
  await tx.done
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('catalog', id)
}

export async function countCards(): Promise<number> {
  const db = await getDB()
  return db.count('catalog')
}

// ---------- Collection ----------
export async function getAllCollection(): Promise<CollectionRecord[]> {
  const db = await getDB()
  return db.getAll('collection')
}

export async function getCollection(cardId: string): Promise<CollectionRecord | undefined> {
  const db = await getDB()
  return db.get('collection', cardId)
}

export async function putCollection(rec: CollectionRecord): Promise<void> {
  const db = await getDB()
  await db.put('collection', rec)
}

export async function deleteCollection(cardId: string): Promise<void> {
  const db = await getDB()
  await db.delete('collection', cardId)
}

export async function bulkPutCollection(records: CollectionRecord[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('collection', 'readwrite')
  await Promise.all(records.map((r) => tx.store.put(r)))
  await tx.done
}

// ---------- Wishlist ----------
export async function getAllWishlist(): Promise<WishlistItem[]> {
  const db = await getDB()
  return db.getAll('wishlist')
}

export async function getWishlist(cardId: string): Promise<WishlistItem | undefined> {
  const db = await getDB()
  return db.get('wishlist', cardId)
}

export async function putWishlist(item: WishlistItem): Promise<void> {
  const db = await getDB()
  await db.put('wishlist', item)
}

export async function deleteWishlist(cardId: string): Promise<void> {
  const db = await getDB()
  await db.delete('wishlist', cardId)
}

export async function bulkPutWishlist(items: WishlistItem[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('wishlist', 'readwrite')
  await Promise.all(items.map((i) => tx.store.put(i)))
  await tx.done
}

// ---------- Settings ----------
export async function getSettings(): Promise<Settings | undefined> {
  const db = await getDB()
  return db.get('settings', 'app')
}

export async function putSettings(settings: Settings): Promise<void> {
  const db = await getDB()
  await db.put('settings', settings)
}

// ---------- Import log ----------
export async function getAllImportLog(): Promise<ImportLogEntry[]> {
  const db = await getDB()
  return db.getAll('importLog')
}

export async function addImportLog(entry: ImportLogEntry): Promise<void> {
  const db = await getDB()
  await db.put('importLog', entry)
}

export async function clearImportLog(): Promise<void> {
  const db = await getDB()
  await db.clear('importLog')
}

// ---------- Images ----------
export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDB()
  return db.get('images', id)
}

export async function putImage(image: StoredImage): Promise<void> {
  const db = await getDB()
  await db.put('images', image)
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('images', id)
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await getDB()
  return db.getAll('images')
}

export async function bulkPutImages(images: StoredImage[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('images', 'readwrite')
  await Promise.all(images.map((i) => tx.store.put(i)))
  await tx.done
}
