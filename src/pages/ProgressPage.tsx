import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { computeCompletion, missingCards, duplicateList, tradeList, wantedList, perSetCompletion } from '../utils/completion'
import { EmptyState, Loading } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { distinctStrings } from '../utils/list'
import { formatNumber } from '../utils/format'

export function ProgressPage() {
  const { ready, catalog, collection, wishlist, incOwned, decOwned, setOwned } = useApp()
  const [setFilter, setSetFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')

  const sets = useMemo(() => distinctStrings(catalog.map((c) => c.set)), [catalog])
  const rarities = useMemo(() => distinctStrings(catalog.map((c) => c.rarity)), [catalog])

  const scope = useMemo(
    () => ({ set: setFilter || undefined, rarity: rarityFilter || undefined }),
    [setFilter, rarityFilter]
  )

  const overall = useMemo(() => computeCompletion(catalog, collection, scope), [catalog, collection, scope])
  const perSet = useMemo(() => perSetCompletion(catalog, collection), [catalog, collection])
  const missing = useMemo(() => missingCards(catalog, collection, scope), [catalog, collection, scope])
  const dupes = useMemo(() => duplicateList(catalog, collection, scope), [catalog, collection, scope])
  const trades = useMemo(() => tradeList(catalog, collection, scope), [catalog, collection, scope])
  const wanted = useMemo(() => wantedList(catalog, wishlist, scope), [catalog, wishlist, scope])

  if (!ready) return <Loading />
  if (catalog.length === 0) return <EmptyState title="ยังไม่มีการ์ดในแคตตาล็อก" icon="progress" />

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">ความคืบหน้าคลังการ์ด</h1>

      <div className="card-surface flex flex-wrap gap-2 p-3">
        <select className="input w-auto" value={setFilter} onChange={(e) => setSetFilter(e.target.value)} aria-label="กรองเซ็ต">
          <option value="">เซ็ต: ทั้งหมด</option>
          {sets.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} aria-label="กรองหายาก">
          <option value="">หายาก: ทั้งหมด</option>
          {rarities.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card-surface p-4">
        <div className="mb-1 flex justify-between text-sm text-slate-400">
          <span>ความครบในขอบเขตที่เลือก</span>
          <span>{overall.percent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-3 rounded-full bg-brand-600" style={{ width: `${overall.percent}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300 sm:grid-cols-4">
          <span>มี (unique): <b className="text-slate-100">{formatNumber(overall.ownedUnique)}</b></span>
          <span>รู้ทั้งหมด: <b className="text-slate-100">{formatNumber(overall.totalKnown)}</b></span>
          <span>ขาด: <b className="text-slate-100">{formatNumber(overall.missing)}</b></span>
          <span>มีซ้ำ: <b className="text-slate-100">{formatNumber(overall.duplicateCards)}</b></span>
        </div>
        {overall.totalKnown === 0 && <p className="mt-2 text-xs text-slate-500">ไม่มีการ์ดในขอบเขตนี้</p>}
      </div>

      <Section title="ความครบแยกตามเซ็ต">
        {perSet.length === 0 ? <p className="text-sm text-slate-500">ไม่มีข้อมูล</p> : (
          <ul className="space-y-2">
            {perSet.map((s) => (
              <li key={s.set || '—'}>
                <div className="flex justify-between text-sm text-slate-300">
                  <span>{s.set || 'ไม่ระบุเซ็ต'}</span>
                  <span>{s.ownedUnique}/{s.totalKnown} ({s.percent}%)</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-sky-600" style={{ width: `${s.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`การ์ดที่ขาด (${missing.length})`} icon="alert">
        {missing.length === 0 ? <p className="text-sm text-emerald-400">ครบทุกใบในขอบเขตนี้แล้ว!</p> : (
          <ul className="divide-y divide-slate-800">
            {missing.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-2">
                <Link to={`/card/${c.id}`} className="hover:text-brand-400">{c.nameTh} ({c.code})</Link>
                <button className="btn-secondary" onClick={() => setOwned(c.id, 1)} aria-label="บันทึกว่ามีแล้ว">
                  <Icon name="check" size={16} /> มีแล้ว
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`การ์ดซ้ำ (${dupes.length})`} icon="star">
        {dupes.length === 0 ? <p className="text-sm text-slate-500">ไม่มีการ์ดซ้ำ</p> : (
          <ul className="divide-y divide-slate-800">
            {dupes.map(({ card, owned }) => (
              <li key={card.id} className="flex items-center justify-between p-2">
                <Link to={`/card/${card.id}`} className="hover:text-brand-400">{card.nameTh} ({card.code})</Link>
                <div className="flex items-center gap-1">
                  <button className="btn-secondary" onClick={() => decOwned(card.id)} aria-label="ลดจำนวน"><Icon name="minus" size={16} /></button>
                  <span className="w-10 text-center text-sm">{owned}</span>
                  <button className="btn-secondary" onClick={() => incOwned(card.id)} aria-label="เพิ่มจำนวน"><Icon name="plus" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`การ์ดพร้อมแลก (${trades.length})`} icon="refresh">
        {trades.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีการ์ดสำหรับแลก</p> : (
          <ul className="divide-y divide-slate-800">
            {trades.map(({ card, forTrade }) => (
              <li key={card.id} className="flex items-center justify-between p-2">
                <Link to={`/card/${card.id}`} className="hover:text-brand-400">{card.nameTh} ({card.code})</Link>
                <span className="text-sm text-slate-300">พร้อมแลก {forTrade}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`การ์ดที่อยากได้ (${wanted.length})`} icon="heart">
        {wanted.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีการ์ดที่อยากได้</p> : (
          <ul className="divide-y divide-slate-800">
            {wanted.map(({ card, wanted: w, priority }) => (
              <li key={card.id} className="flex items-center justify-between p-2">
                <Link to={`/card/${card.id}`} className="hover:text-brand-400">{card.nameTh} ({card.code})</Link>
                <span className="text-sm text-slate-300">อยากได้ {w} · {priority}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: 'alert' | 'star' | 'refresh' | 'heart' }) {
  return (
    <div className="card-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 font-medium">
        {icon && <Icon name={icon} size={18} />}
        {title}
      </h2>
      {children}
    </div>
  )
}
