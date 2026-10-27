import type { AppBackup, BackupImage, Card, CollectionRecord } from '../types'
import { serializeCsv } from '../utils/csv'
import { createBackupFromData } from '../utils/backup'
import { blobToDataUrl } from '../utils/image'
import {
  getAllCards,
  getAllCollection,
  getAllImages,
  getAllImportLog,
  getAllWishlist,
  getSettings,
} from './repositories'

export function catalogCsvHeader(): string[] {
  return [
    'id',
    'code',
    'nameTh',
    'nameEn',
    'set',
    'type',
    'rarity',
    'variant',
    'imageUrl',
    'sourceUrl',
    'attribution',
    'description',
    'lastVerified',
    'verified',
    'createdAt',
    'updatedAt',
  ]
}

function cardToCsvRow(c: Card): (string | number | boolean)[] {
  return [
    c.id,
    c.code,
    c.nameTh,
    c.nameEn ?? '',
    c.set ?? '',
    c.type ?? '',
    c.rarity ?? '',
    c.variant ?? '',
    c.imageUrl ?? '',
    c.sourceUrl ?? '',
    c.attribution ?? '',
    c.description ?? '',
    c.lastVerified ?? '',
    c.verified,
    c.createdAt,
    c.updatedAt,
  ]
}

export function exportCatalogCsv(catalog: Card[]): string {
  return serializeCsv([catalogCsvHeader(), ...catalog.map(cardToCsvRow)])
}

export function exportCatalogJson(catalog: Card[]): string {
  return JSON.stringify(catalog, null, 2)
}

export function collectionCsvHeader(): string[] {
  return [
    'cardId',
    'code',
    'nameTh',
    'owned',
    'forTrade',
    'condition',
    'acquiredAt',
    'purchasePrice',
    'notes',
    'updatedAt',
  ]
}

export function exportCollectionCsv(
  catalog: Card[],
  collection: CollectionRecord[]
): string {
  const byId = new Map(catalog.map((c) => [c.id, c]))
  const rows = [
    collectionCsvHeader(),
    ...collection.map((r) => {
      const card = byId.get(r.cardId)
      return [
        r.cardId,
        card?.code ?? '',
        card?.nameTh ?? '',
        r.owned,
        r.forTrade,
        r.condition,
        r.acquiredAt ?? '',
        r.purchasePrice ?? '',
        r.notes ?? '',
        r.updatedAt,
      ]
    }),
  ]
  return serializeCsv(rows)
}

export async function createFullBackup(): Promise<AppBackup> {
  const [catalog, collection, wishlist, importLog, settings, images] = await Promise.all([
    getAllCards(),
    getAllCollection(),
    getAllWishlist(),
    getAllImportLog(),
    getSettings(),
    getAllImages(),
  ])
  const backupImages: BackupImage[] = []
  for (const img of images) {
    backupImages.push({ id: img.id, mime: img.mime, data: await blobToDataUrl(img.blob) })
  }
  return createBackupFromData({
    catalog,
    collection,
    wishlist,
    settings: settings ?? null,
    importLog,
    images: backupImages,
  })
}
