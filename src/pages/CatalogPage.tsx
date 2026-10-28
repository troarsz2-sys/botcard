import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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

  // เก็บ filter ใน URL เพื่อให้คงอยู่เมื่อกด Back
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const setFilter = params.get('set') ?? ''
  const rarityFilter = params.get('rarity') ?? ''
  const typeFilter = params.get('type') ?? ''
  const status = (params.get('status') ?? 'all') as StatusFilter
  const sortBy = (params.get('sort') ?? 'name') as SortBy
  const page = Number(params.get('page') ?? '1')

  function setParam(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === 'all' || value === 'name') next.delete(key)
      else next.set(key, value)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

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
      return (collectionMap.get(b.id)?.owned ?? 0) - (collectionMap.get(a.id)?.owned ?? 0)
    })
    return list
  }, [catalog, query, setFilter, rarityFilter, typeFilter, status, sortBy, collectionMap, wishlistMap])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // แสดง active filters
  const activeCount = [setFilter, rarityFilter, typeFilter, status !== 'all' ? status : ''].filter(Boolean).length

  if (!ready) return <Loading />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">แคตตาล็อกการ์ด</h1>
        <span className="text-sm text-slate-400">{filtered.length} รายการ</span>
      </div>

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
              onChange={(e) => setParam('q', e.target.value)}
              aria-label="ค้นหา"
            />
          </div>
          <select className="input w-auto" value={setFilter} onChange={(e) => setParam('set', e.target.value)} aria-label="กรองตามเซ็ต">
            <option value="">เซ็ต: ทั้งหมด</option>
            {sets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input w-auto" value={rarityFilter} onChange={(e) => setParam('rarity', e.target.value)} aria-label="กรองตามความหายาก">
            <option value="">หายาก: ทั้งหมด</option>
            {rarities.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input w-auto" value={typeFilter} onChange={(e) => setParam('type', e.target.value)} aria-label="กรองตามประเภท">
            <option value="">ประเภท: ทั้งหมด</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input w-auto" value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="กรองตามสถานะ">
            <option value="all">สถานะ: ทั้งหมด</option>
            <option value="owned">มีแล้ว</option>
            <option value="missing">ยังไม่มี</option>
            <option value="duplicate">มีซ้ำ</option>
            <option value="wanted">อยากได้</option>
          </select>
          <select className="input w-auto" value={sortBy} onChange={(e) => setParam('sort', e.target.value)} aria-label="เรียงตาม">
            <option value="name">เรียง: ชื่อ</option>
            <option value="code">เรียง: รหัส</option>
            <option value="rarity">เรียง: ความหายาก</option>
            <option value="owned">เรียง: จำนวนที่มี</option>
          </select>
          {activeCount > 0 && (
            <button
              className="btn-ghost text-xs text-amber-400"
              onClick={() => setParams({})}
              aria-label="ล้างตัวกรอง"
            >
              <Icon name="x" size={14} /> ล้างตัวกรอง ({activeCount})
            </button>
          )}
        </div>
      </div>

      {catalog.length === 0 ? (
        <EmptyState title="ยังไม่มีการ์ด" message="ไปหน้าซิงก์ข้อมูลการ์ดเพื่อดาวน์โหลดข้อมูล หรือนำเข้าไฟล์ CSV/JSON" icon="catalog" />
      ) : pageItems.length === 0 ? (
        <EmptyState title="ไม่พบการ์ดที่ตรงเงื่อนไข" message="ลองเปลี่ยนคำค้นหรือตัวกรอง" icon="search" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pageItems.map((c) => <CardTile key={c.id} card={c} />)}
          </div>
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={(p) => setParam('page', String(p))}
          />
        </>
      )}
    </div>
  )
}
