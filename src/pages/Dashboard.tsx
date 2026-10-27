import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { computeCompletion } from '../utils/completion'
import { StatCard } from '../components/StatCard'
import { EmptyState, Loading } from '../components/Feedback'
import { formatDate, formatNumber } from '../utils/format'

export function Dashboard() {
  const { ready, catalog, collection, wishlist } = useApp()
  if (!ready) return <Loading />

  const s = computeCompletion(catalog, collection)
  const wishlistCount = wishlist.filter((w) => w.wanted > 0 && !w.obtained).length
  const tradeCount = collection.filter((r) => r.forTrade > 0).length
  const recent = [...collection].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)
  const cardById = new Map(catalog.map((c) => [c.id, c]))
  const allVerified = catalog.length > 0 && catalog.every((c) => c.verified)

  if (catalog.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีการ์ดในแคตตาล็อก"
        message="เริ่มจากนำเข้าไฟล์ CSV/JSON, กรอกการ์ดเองที่หน้าจัดการการ์ด, หรือโหลดข้อมูลตัวอย่างที่หน้าตั้งค่า"
        icon="catalog"
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">แดชบอร์ด</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="การ์ดที่มี (unique)" value={formatNumber(s.ownedUnique)} icon="checkCircle" accent="green" />
        <StatCard label="จำนวนการ์ดทั้งหมดที่มี" value={formatNumber(s.totalOwned)} icon="catalog" />
        <StatCard
          label="การ์ดที่รู้ทั้งหมด"
          value={formatNumber(s.totalKnown)}
          icon="book"
          hint={allVerified ? 'ทุกรายการยืนยันแล้ว' : 'บางรายการยังไม่ยืนยัน'}
        />
        <StatCard label="ความครบ" value={`${s.percent}%`} icon="progress" accent="blue" />
        <StatCard label="การ์ดที่ขาด" value={formatNumber(s.missing)} icon="alert" />
        <StatCard
          label="การ์ดซ้ำ (unique)"
          value={formatNumber(s.duplicateCards)}
          icon="star"
          accent="amber"
          hint={`สำเนาเกิน ${s.duplicateCopies} ใบ`}
        />
        <StatCard label="การ์ดที่อยากได้" value={formatNumber(wishlistCount)} icon="heart" accent="pink" />
        <StatCard label="การ์ดพร้อมแลก" value={formatNumber(tradeCount)} icon="refresh" />
      </div>

      {s.totalKnown > 0 && (
        <div className="card-surface p-4">
          <div className="mb-1 flex justify-between text-sm text-slate-400">
            <span>ความครบโดยรวม</span>
            <span>{s.percent}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={s.percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-3 rounded-full bg-brand-600" style={{ width: `${s.percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            อ้างอิงกับแคตตาล็อก {s.totalKnown} รายการ ถ้าแคตตาล็อกยังไม่ครบ เปอร์เซ็นต์นี้ไม่ใช่ตัวเลขทางการ
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-medium">รายการที่อัปเดตล่าสุด</h2>
        {recent.length === 0 ? (
          <EmptyState title="ยังไม่มีรายการคอลเลกชัน" message="กดเข้าการ์ดในแคตตาล็อกแล้วเพิ่มจำนวนที่มี" icon="info" />
        ) : (
          <ul className="card-surface divide-y divide-slate-800">
            {recent.map((r) => {
              const card = cardById.get(r.cardId)
              return (
                <li key={r.cardId} className="flex items-center justify-between p-3">
                  <Link to={`/card/${r.cardId}`} className="hover:text-brand-400">
                    {card ? `${card.nameTh} (${card.code})` : 'การ์ดที่ถูกลบไปแล้ว'}
                  </Link>
                  <span className="text-xs text-slate-500">มี {r.owned} · {formatDate(r.updatedAt)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
