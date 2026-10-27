import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Card,
  CardCondition,
  CollectionRecord,
  ImportLogEntry,
  IncomingCard,
  Settings,
  WishlistItem,
  WishlistPriority,
  CollectionIncoming,
} from '../types'
import { defaultSettings } from '../types'
import { generateId, nowIso, normalizeCode } from '../utils/id'
import { incQuantity, decQuantity, clampNonNegative } from '../utils/quantity'
import { mergeCatalog, mergeCollection, resolveCollectionCardIds, type MergeOptions, type MergeResult, type CollectionMergeOptions, type CollectionMergeResult } from '../utils/importLogic'
import { parseCatalogCsv } from '../utils/importLogic'
import { parseCatalogJson, parseCollectionJson } from '../utils/json'
import { fileToStoredImage } from '../utils/image'
import { mergeWishlistItem } from '../utils/wishlist'
import { parseCommunityTs, transformCommunityCards, COMMUNITY_SETS, communitySetUrl } from '../utils/syncTransform'
import type { SyncSource, SyncStats } from '../types'
import {
  addImportLog,
  bulkPutCards,
  bulkPutCollection,
  bulkPutWishlist,
  deleteCard as repoDeleteCard,
  deleteCollection as repoDeleteCollection,
  deleteImage,
  deleteWishlist,
  getAllCards,
  getAllCollection,
  getAllImportLog,
  getAllWishlist,
  getSettings,
  putCard,
  putCollection,
  putImage,
  putSettings,
  putWishlist,
} from '../database/repositories'
import { clearAllStores } from '../database/db'
import { restoreFromBackup, type RestoreResult } from '../database/backupService'
import { createDemoCards } from '../utils/demoData'

export type NewCard = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>

export interface CatalogImportOutcome {
  parseErrors: string[]
  merge: MergeResult
}

export interface CollectionImportOutcome {
  parseErrors: string[]
  resolveErrors: string[]
  merge: CollectionMergeResult
}

export interface SyncOutcome {
  source: SyncSource
  totalFetched: number
  added: number
  updated: number
  skipped: number
  errors: string[]
  aborted: boolean
}

interface AppContextValue {
  ready: boolean
  catalog: Card[]
  collection: CollectionRecord[]
  wishlist: WishlistItem[]
  settings: Settings
  importLog: ImportLogEntry[]
  collectionMap: Map<string, CollectionRecord>
  wishlistMap: Map<string, WishlistItem>
  reload: () => Promise<void>

  // catalog
  addCard: (data: NewCard) => Promise<Card>
  updateCard: (card: Card) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  attachImage: (cardId: string, file: Blob) => Promise<string>
  removeImage: (cardId: string) => Promise<void>

  // collection
  patchCollection: (cardId: string, patch: Partial<CollectionRecord>) => Promise<void>
  incOwned: (cardId: string, step?: number) => Promise<void>
  decOwned: (cardId: string, step?: number) => Promise<void>
  setOwned: (cardId: string, n: number) => Promise<void>

  // wishlist
  patchWishlist: (cardId: string, patch: Partial<WishlistItem>) => Promise<void>
  setWanted: (cardId: string, n: number) => Promise<void>
  removeWishlist: (cardId: string) => Promise<void>
  markObtained: (cardId: string) => Promise<void>

  // settings
  updateSettings: (patch: Partial<Settings>) => Promise<void>

  // import
  importCatalogFromCsv: (text: string, opts: MergeOptions, fileName?: string) => Promise<CatalogImportOutcome>
  importCatalogFromJson: (text: string, opts: MergeOptions, fileName?: string) => Promise<CatalogImportOutcome>
  importCollectionFromJson: (text: string, opts: CollectionMergeOptions, fileName?: string) => Promise<CollectionImportOutcome>

  // sync
  syncFromGitHub: (
    onProgress: (done: number, total: number, setName: string) => void,
    signal?: AbortSignal
  ) => Promise<SyncOutcome>
  syncFromJsonText: (text: string, fileName?: string) => Promise<CatalogImportOutcome>

  // backup
  restoreBackup: (raw: unknown, mode: 'replace' | 'merge') => Promise<RestoreResult>

  // demo / clear
  loadDemoData: () => Promise<void>
  clearAllData: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp ต้องใช้ภายใน <AppProvider>')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [catalog, setCatalog] = useState<Card[]>([])
  const [collection, setCollection] = useState<CollectionRecord[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [settings, setSettings] = useState<Settings>(defaultSettings())
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([])

  const reload = useCallback(async () => {
    const [c, col, w, s, log] = await Promise.all([
      getAllCards(),
      getAllCollection(),
      getAllWishlist(),
      getSettings(),
      getAllImportLog(),
    ])
    setCatalog(c)
    setCollection(col)
    setWishlist(w)
    setSettings(s ?? defaultSettings())
    setImportLog(log)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await getSettings()
        if (!s) await putSettings(defaultSettings())
        await reload()
      } catch (e) {
        console.error('โหลดข้อมูลไม่สำเร็จ', e)
      } finally {
        setReady(true)
      }
    })()
  }, [reload])

  const collectionMap = useMemo(() => new Map(collection.map((r) => [r.cardId, r])), [collection])
  const wishlistMap = useMemo(() => new Map(wishlist.map((w) => [w.cardId, w])), [wishlist])

  // ---------- Catalog ----------
  const addCard = useCallback(async (data: NewCard) => {
    const card: Card = { ...data, id: generateId(), createdAt: nowIso(), updatedAt: nowIso() }
    await putCard(card)
    setCatalog((prev) => [...prev, card])
    return card
  }, [])

  const updateCard = useCallback(async (card: Card) => {
    const next = { ...card, updatedAt: nowIso() }
    await putCard(next)
    setCatalog((prev) => prev.map((c) => (c.id === next.id ? next : c)))
  }, [])

  const deleteCard = useCallback(async (id: string) => {
    const card = catalog.find((c) => c.id === id)
    if (card?.imageLocalId) await deleteImage(card.imageLocalId)
    await repoDeleteCard(id)
    await repoDeleteCollection(id)
    await deleteWishlist(id)
    setCatalog((prev) => prev.filter((c) => c.id !== id))
    setCollection((prev) => prev.filter((r) => r.cardId !== id))
    setWishlist((prev) => prev.filter((w) => w.cardId !== id))
  }, [catalog])

  const attachImage = useCallback(async (cardId: string, file: Blob) => {
    const img = await fileToStoredImage(file)
    await putImage(img)
    const card = (await getAllCards()).find((c) => c.id === cardId)
    if (card) {
      if (card.imageLocalId) await deleteImage(card.imageLocalId)
      const next = { ...card, imageLocalId: img.id, updatedAt: nowIso() }
      await putCard(next)
      setCatalog((prev) => prev.map((c) => (c.id === cardId ? next : c)))
    }
    return img.id
  }, [])

  const removeImage = useCallback(async (cardId: string) => {
    const card = catalog.find((c) => c.id === cardId)
    if (card?.imageLocalId) {
      await deleteImage(card.imageLocalId)
      const next = { ...card, imageLocalId: undefined, updatedAt: nowIso() }
      await putCard(next)
      setCatalog((prev) => prev.map((c) => (c.id === cardId ? next : c)))
    }
  }, [catalog])

  // ---------- Collection ----------
  const patchCollection = useCallback(
    async (cardId: string, patch: Partial<CollectionRecord>) => {
      const existing = collection.find((r) => r.cardId === cardId)
      const next: CollectionRecord = {
        cardId,
        owned: existing?.owned ?? 0,
        forTrade: existing?.forTrade ?? 0,
        condition: existing?.condition ?? 'Unknown',
        acquiredAt: existing?.acquiredAt,
        purchasePrice: existing?.purchasePrice,
        notes: existing?.notes,
        ...patch,
        updatedAt: nowIso(),
      }
      await putCollection(next)
      setCollection((prev) => {
        const idx = prev.findIndex((r) => r.cardId === cardId)
        if (idx === -1) return [...prev, next]
        const copy = [...prev]
        copy[idx] = next
        return copy
      })
    },
    [collection]
  )

  const incOwned = useCallback(
    async (cardId: string, step = 1) => {
      const cur = collection.find((r) => r.cardId === cardId)?.owned ?? 0
      await patchCollection(cardId, { owned: incQuantity(cur, step) })
    },
    [collection, patchCollection]
  )
  const decOwned = useCallback(
    async (cardId: string, step = 1) => {
      const cur = collection.find((r) => r.cardId === cardId)?.owned ?? 0
      await patchCollection(cardId, { owned: decQuantity(cur, step) })
    },
    [collection, patchCollection]
  )
  const setOwned = useCallback(
    async (cardId: string, n: number) => {
      await patchCollection(cardId, { owned: clampNonNegative(n) })
    },
    [patchCollection]
  )

  // ---------- Wishlist ----------
  const patchWishlist = useCallback(
    async (cardId: string, patch: Partial<WishlistItem>) => {
      const existing = wishlist.find((w) => w.cardId === cardId)
      const next = mergeWishlistItem(existing, cardId, patch)
      await putWishlist(next)
      setWishlist((prev) => {
        const idx = prev.findIndex((w) => w.cardId === cardId)
        if (idx === -1) return [...prev, next]
        const copy = [...prev]
        copy[idx] = next
        return copy
      })
    },
    [wishlist]
  )
  const setWanted = useCallback(
    async (cardId: string, n: number) => {
      const v = clampNonNegative(n)
      await patchWishlist(cardId, { wanted: v })
    },
    [patchWishlist]
  )
  const removeWishlist = useCallback(async (cardId: string) => {
    await deleteWishlist(cardId)
    setWishlist((prev) => prev.filter((w) => w.cardId !== cardId))
  }, [])
  const markObtained = useCallback(
    async (cardId: string) => {
      await patchWishlist(cardId, { obtained: true })
    },
    [patchWishlist]
  )

  // ---------- Settings ----------
  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch, updatedAt: nowIso() }
      await putSettings(next)
      setSettings(next)
    },
    [settings]
  )

  // ---------- Import ----------
  const importCatalogIncoming = useCallback(
    async (incoming: IncomingCard[], opts: MergeOptions, fileName?: string, kind: ImportLogEntry['kind'] = 'catalog-csv') => {
      const result = mergeCatalog(catalog, incoming, opts)
      if (result.toPut.length > 0) await bulkPutCards(result.toPut)
      await addImportLog({
        id: generateId(),
        date: nowIso(),
        kind,
        fileName,
        recordCount: incoming.length,
        added: result.added,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
      })
      await reload()
      return result
    },
    [catalog, reload]
  )

  const importCatalogFromCsv = useCallback(
    async (text: string, opts: MergeOptions, fileName?: string): Promise<CatalogImportOutcome> => {
      const parsed = parseCatalogCsv(text)
      const merge = await importCatalogIncoming(parsed.cards, opts, fileName, 'catalog-csv')
      return { parseErrors: parsed.errors, merge }
    },
    [importCatalogIncoming]
  )

  const importCatalogFromJson = useCallback(
    async (text: string, opts: MergeOptions, fileName?: string): Promise<CatalogImportOutcome> => {
      const parsed = parseCatalogJson(text)
      const merge = await importCatalogIncoming(parsed.data ?? [], opts, fileName, 'catalog-json')
      return { parseErrors: parsed.errors, merge }
    },
    [importCatalogIncoming]
  )

  const importCollectionFromJson = useCallback(
    async (text: string, opts: CollectionMergeOptions, fileName?: string): Promise<CollectionImportOutcome> => {
      const parsed = parseCollectionJson(text)
      const items = parsed.data ?? []
      const { resolved, errors: resolveErrors } = resolveCollectionCardIds(items, catalog)
      const merge = mergeCollection(collection, resolved, opts)
      if (merge.toPut.length > 0) await bulkPutCollection(merge.toPut)
      await addImportLog({
        id: generateId(),
        date: nowIso(),
        kind: 'collection-json',
        fileName,
        recordCount: items.length,
        added: merge.added,
        updated: merge.updated,
        skipped: merge.skipped,
        errors: [...parsed.errors, ...resolveErrors, ...merge.errors],
      })
      await reload()
      return { parseErrors: parsed.errors, resolveErrors, merge }
    },
    [catalog, collection, reload]
  )

  // ---------- Sync ----------
  const syncFromGitHub = useCallback(
    async (
      onProgress: (done: number, total: number, setName: string) => void,
      signal?: AbortSignal
    ): Promise<SyncOutcome> => {
      const allIncoming: IncomingCard[] = []
      const allErrors: string[] = []
      let skippedTransform = 0
      let aborted = false

      for (let i = 0; i < COMMUNITY_SETS.length; i++) {
        if (signal?.aborted) { aborted = true; break }
        const setFile = COMMUNITY_SETS[i]
        const url = communitySetUrl(setFile)
        onProgress(i, COMMUNITY_SETS.length, setFile)
        try {
          const res = await fetch(url, { signal })
          if (!res.ok) {
            allErrors.push(`ดาวน์โหลด ${setFile} ไม่สำเร็จ: HTTP ${res.status}`)
            continue
          }
          const text = await res.text()
          const rawCards = parseCommunityTs(text)
          if (rawCards.length === 0) {
            allErrors.push(`parse ${setFile} ได้ 0 รายการ (รูปแบบอาจเปลี่ยน)`)
            continue
          }
          const { cards, skipped, errors } = transformCommunityCards(rawCards)
          allIncoming.push(...cards)
          skippedTransform += skipped
          allErrors.push(...errors)
        } catch (e) {
          if ((e as Error).name === 'AbortError') { aborted = true; break }
          allErrors.push(`${setFile}: ${(e as Error).message}`)
        }
      }
      onProgress(COMMUNITY_SETS.length, COMMUNITY_SETS.length, 'done')

      // merge into catalog — add new + update metadata, preserve collection data
      const mergeOpts: MergeOptions = { addNew: true, updateMetadata: true }
      const result = mergeCatalog(catalog, allIncoming, mergeOpts)
      if (result.toPut.length > 0) await bulkPutCards(result.toPut)

      const stats: SyncStats = {
        source: 'github-community',
        syncedAt: nowIso(),
        totalFetched: allIncoming.length,
        added: result.added,
        updated: result.updated,
        skipped: result.skipped + skippedTransform,
        errors: allErrors,
      }
      await addImportLog({
        id: generateId(),
        date: nowIso(),
        kind: 'sync-github-community',
        recordCount: allIncoming.length,
        added: result.added,
        updated: result.updated,
        skipped: result.skipped + skippedTransform,
        errors: allErrors,
      })
      await updateSettings({ lastSyncAt: nowIso(), syncSource: 'github-community', syncStats: stats })
      await reload()

      return {
        source: 'github-community',
        totalFetched: allIncoming.length,
        added: result.added,
        updated: result.updated,
        skipped: result.skipped + skippedTransform,
        errors: allErrors,
        aborted,
      }
    },
    [catalog, reload, updateSettings]
  )

  const syncFromJsonText = useCallback(
    async (text: string, fileName?: string): Promise<CatalogImportOutcome> => {
      const result = await importCatalogFromJson(text, { addNew: true, updateMetadata: true }, fileName)
      const stats: SyncStats = {
        source: 'json-file',
        syncedAt: nowIso(),
        totalFetched: result.merge.added + result.merge.updated + result.merge.skipped,
        added: result.merge.added,
        updated: result.merge.updated,
        skipped: result.merge.skipped,
        errors: [...result.parseErrors, ...result.merge.errors],
      }
      await updateSettings({ lastSyncAt: nowIso(), syncSource: 'json-file', syncStats: stats })
      return result
    },
    [importCatalogFromJson, updateSettings]
  )

  // ---------- Backup ----------
  const restoreBackup = useCallback(
    async (raw: unknown, mode: 'replace' | 'merge') => {
      const res = await restoreFromBackup(raw, mode)
      if (res.ok) await reload()
      return res
    },
    [reload]
  )

  // ---------- Demo / clear ----------
  const loadDemoData = useCallback(async () => {
    const demos = createDemoCards()
    // ถ้ายังไม่มีการ์ดตัวอย่าง (ตรวจด้วย code) ถึงจะเพิ่ม
    const existingCodes = new Set(catalog.map((c) => normalizeCode(c.code)))
    const toAdd = demos.filter((d) => !existingCodes.has(normalizeCode(d.code)))
    const cards: Card[] = toAdd.map((d) => ({
      ...d,
      id: generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }))
    if (cards.length > 0) await bulkPutCards(cards)
    await reload()
  }, [catalog, reload])

  const clearAllData = useCallback(async () => {
    await clearAllStores()
    await putSettings(defaultSettings())
    await reload()
  }, [reload])

  const value: AppContextValue = {
    ready,
    catalog,
    collection,
    wishlist,
    settings,
    importLog,
    collectionMap,
    wishlistMap,
    reload,
    addCard,
    updateCard,
    deleteCard,
    attachImage,
    removeImage,
    patchCollection,
    incOwned,
    decOwned,
    setOwned,
    patchWishlist,
    setWanted,
    removeWishlist,
    markObtained,
    updateSettings,
    importCatalogFromCsv,
    importCatalogFromJson,
    importCollectionFromJson,
    syncFromGitHub,
    syncFromJsonText,
    restoreBackup,
    loadDemoData,
    clearAllData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// re-export types ที่ UI อาจใช้
export type { WishlistPriority, CardCondition }
