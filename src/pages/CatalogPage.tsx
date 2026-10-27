import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { CardTile } from '../components/CardTile'
import { EmptyState, Loading } from '../components/Feedback'
import { Pagination } from '../components/Pagination'
import { Icon } from '../components/Icon'
import { distinctStrings, rarityRank } from '../utils/list'

type StatusFilter = 'all' | 'owned' | 'missing' | 'duplicate' | 'wanted'
type SortBy = 'name' | 'code' | 'rarity' | 'owned'

const PAGE_SIZE = 60

export function CatalogPage() {
  const { ready, catalog, collectionMap, wishlistMap, settings } = useApp()
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [page, setPage] = useState(1)

  const sets = useMemo(
    () => distinctStrings([...catalog.map((c) => c.set), ...settings.knownSets]),
    [catalog, settings]
  )
  const rarities = useMemo(
    () => distinctStrings([...catalog.map((c) => c.rarity), ...settings.knownRarities]),
    [catalog, settings]
  )
  const types = useMemo(
    () => distinctStrings([...catalog.map((c) => c.type), ...settings.knownTypes]),
    [catalog, settings]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = catalog.filter((c) => {
      if (setFilter && (c.set ?? '') !== setFilter) return false
      if (rarityFilter && (c.rarity ?? '') !== rarityFilter) return false
      if (typeFilter && (c.type ?? '') !== typeFilter) return false
      if (q) {
        const hay = `${c.nameTh} ${c.nameEn ?? ''} ${c.code}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      const owned = collectionMap.get(c.id)?.owned ?? 0
      const wanted = wishlistMap.get(c.id)
      if (status === 'owned' && owned <= 0) return false
      if (status === 'missing' && owned > 0) return false
      if (status === 'duplicate' && owned <= 1) return false
      if (status === 'wanted' && !(wanted && wanted.wanted > 0 && !wanted.obtained)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.nameTh.localeCompare(b.nameTh, 'th')
      if (sortBy === 'code') return a.code.localeCompare(b.code)
      if (sortBy === 'rarity') return rarityRank(a.rarity) - rarityRank(b.rarity)
      // owned desc
      return (collectionMap.get(b.id)?.owned ?? 0) - (collectionMap.get(a.id)?.owned ?? 0)
    })
    return list
  }, [catalog, query, setFilter, rarityFilter, typeFilter, status, sortBy, collectionMap, wishlistMap])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (!ready) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">แคตตาล็อกการ์ด</h1>

      <div className="card-surface p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute left-2 top-2.5 text-slate-500">
              <Icon name="search" size={18} />
            </span>
            <input
              className="input pl-9"
              placeholder="ค้นชื่อไทย / อังกฤษ / รหัสการ์ด"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              aria-label="ค้นหา"
            />
          </div>
          <select className="input w-auto" value={setFilter} onChange={(e) => { setSetFilter(e.target.value); setPage(1) }} aria-label="กรองตามเซ็ต">
            <option value="">เซ็ต: ทั้งหมด</option>
            {sets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input w-auto" value={rarityFilter} onChange={(e) => { setRarityFilter(e.target.value); setPage(1) }} aria-label="กรองตามความหายาก">
            <option value="">หายาก: ทั้งหมด</option>
            {rarities.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input w-auto" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} aria-label="กรองตามประเภท">
            <option value="">ประเภท: ทั้งหมด</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1) }} aria-label="กรองตามสถานะ">
            <option value="all">สถานะ: ทั้งหมด</option>
            <option value="owned">มีแล้ว</option>
            <option value="missing">ยังไม่มี</option>
            <option value="duplicate">มีซ้ำ</option>
            <option value="wanted">อยากได้</option>
          </select>
          <select className="input w-auto" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} aria-label="เรียงตาม">
            <option value="name">เรียง: ชื่อ</option>
            <option value="code">เรียง: รหัส</option>
            <option value="rarity">เรียง: ความหายาก</option>
            <option value="owned">เรียง: จำนวนที่มี</option>
          </select>
        </div>
      </div>

      {catalog.length === 0 ? (
        <EmptyState title="ยังไม่มีการ์ด" message="นำเข้าไฟล์หรือกรอกการ์ดเองก่อน" icon="catalog" />
      ) : pageItems.length === 0 ? (
        <EmptyState title="ไม่พบการ์ดที่ตรงเงื่อนไข" message="ลองเปลี่ยนคำค้นหรือตัวกรอง" icon="search" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pageItems.map((c) => <CardTile key={c.id} card={c} />)}
          </div>
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
