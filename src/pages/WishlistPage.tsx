import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { EmptyState, Loading } from '../components/Feedback'
import { CardImage } from '../components/CardImage'
import { Icon } from '../components/Icon'
import { distinctStrings } from '../utils/list'
import { PRIORITY_LABELS_TH, type WishlistPriority } from '../types'

export function WishlistPage() {
  const { ready, catalog, wishlist, wishlistMap, incOwned, setWanted, patchWishlist, removeWishlist, markObtained } = useApp()
  const [setFilter, setSetFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [showObtained, setShowObtained] = useState(false)

  const sets = useMemo(() => distinctStrings(catalog.map((c) => c.set)), [catalog])
  const rarities = useMemo(() => distinctStrings(catalog.map((c) => c.rarity)), [catalog])
  const cardById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog])

  const rows = useMemo(() => {
    return wishlist
      .filter((w) => (showObtained ? true : !w.obtained))
      .map((w) => ({ w, card: cardById.get(w.cardId) }))
      .filter(({ card }) => {
        if (!card) return false
        if (setFilter && (card.set ?? '') !== setFilter) return false
        if (rarityFilter && (card.rarity ?? '') !== rarityFilter) return false
        return true
      })
      .sort((a, b) => (a.card?.nameTh ?? '').localeCompare(b.card?.nameTh ?? '', 'th'))
  }, [wishlist, cardById, setFilter, rarityFilter, showObtained])

  if (!ready) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">การ์ดที่อยากได้ (Wishlist)</h1>

      <div className="card-surface flex flex-wrap items-center gap-2 p-3">
        <select className="input w-auto" value={setFilter} onChange={(e) => setSetFilter(e.target.value)} aria-label="กรองเซ็ต">
          <option value="">เซ็ต: ทั้งหมด</option>
          {sets.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} aria-label="กรองหายาก">
          <option value="">หายาก: ทั้งหมด</option>
          {rarities.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={showObtained} onChange={(e) => setShowObtained(e.target.checked)} />
          รวมที่ได้แล้ว
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="ยังไม่มีการ์ดที่อยากได้" message="เปิดการ์ดในแคตตาล็อกแล้วตั้งค่า 'อยากได้'" icon="heart" />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ w, card }) => (
            <li key={w.cardId} className="card-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <Link to={`/card/${w.cardId}`} className="h-16 w-12 shrink-0 overflow-hidden rounded">
                {card && <CardImage card={card} className="h-16 w-12 object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/card/${w.cardId}`} className="block truncate font-medium hover:text-brand-400">
                  {card ? `${card.nameTh} (${card.code})` : 'การ์ดที่ถูกลบ'}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  <span>อยากได้</span>
                  <div className="flex items-center gap-1">
                    <button className="btn-secondary" onClick={() => setWanted(w.cardId, Math.max(0, w.wanted - 1))} aria-label="ลด"><Icon name="minus" size={14} /></button>
                    <span className="w-8 text-center">{w.wanted}</span>
                    <button className="btn-secondary" onClick={() => setWanted(w.cardId, w.wanted + 1)} aria-label="เพิ่ม"><Icon name="plus" size={14} /></button>
                  </div>
                  <select className="input w-auto py-1 text-xs" value={w.priority} onChange={(e) => patchWishlist(w.cardId, { priority: e.target.value as WishlistPriority })} aria-label="ความสำคัญ">
                    {(['high', 'medium', 'low'] as WishlistPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABELS_TH[p]}</option>)}
                  </select>
                  {w.obtained && <span className="badge bg-emerald-700 text-white">ได้แล้ว</span>}
                </div>
                <textarea
                  className="input mt-2 text-sm"
                  rows={1}
                  placeholder="โน้ตส่วนตัว"
                  defaultValue={w.notes ?? ''}
                  onBlur={(e) => { if (e.target.value !== (w.notes ?? '')) patchWishlist(w.cardId, { notes: e.target.value }) }}
                />
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => incOwned(w.cardId)} title="เพิ่มจำนวนที่มี">
                  <Icon name="plus" size={16} /> มีแล้ว
                </button>
                <button className="btn-secondary" onClick={() => markObtained(w.cardId)} disabled={w.obtained}>
                  <Icon name="check" size={16} /> ได้แล้ว
                </button>
                <button className="btn-danger" onClick={() => removeWishlist(w.cardId)} aria-label="ลบออกจาก wishlist">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
