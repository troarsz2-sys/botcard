import { Link } from 'react-router-dom'
import type { Card } from '../types'
import { useApp } from '../state/AppContext'
import { cardStatus } from '../utils/completion'
import { CardImage } from './CardImage'
import { Icon } from './Icon'

export function CardTile({ card }: { card: Card }) {
  const { collectionMap, wishlistMap, incOwned, decOwned } = useApp()
  const owned = collectionMap.get(card.id)?.owned ?? 0
  const wanted = wishlistMap.get(card.id)
  const status = cardStatus(owned)

  return (
    <div className="card-surface group overflow-hidden transition hover:ring-2 hover:ring-brand-500">
      {/* คลิกรูป/ชื่อ → หน้ารายละเอียด */}
      <Link to={`/card/${card.id}`} className="block focus:outline-none">
        <div className="relative">
          <CardImage card={card} className="aspect-[3/4] w-full object-cover" />
          {card.verified && (
            <span className="absolute left-1 top-1 badge bg-emerald-700/90 text-white">ยืนยันแล้ว</span>
          )}
          {!card.verified && (
            <span className="absolute left-1 top-1 badge bg-slate-700/90 text-slate-200">ยังไม่ยืนยัน</span>
          )}
          {status === 'owned' && (
            <span className="absolute right-1 top-1 badge bg-emerald-600 text-white">มี</span>
          )}
          {status === 'duplicate' && (
            <span className="absolute right-1 top-1 badge bg-amber-600 text-white">มีซ้ำ ×{owned}</span>
          )}
          {status === 'missing' && wanted && wanted.wanted > 0 && !wanted.obtained && (
            <span className="absolute right-1 top-1 badge bg-pink-600 text-white">อยากได้</span>
          )}
        </div>
        <div className="px-2 pt-2">
          <div className="truncate font-medium text-slate-100">{card.nameTh}</div>
          <div className="truncate text-xs text-slate-400">
            {card.code}
            {card.set ? ` · ${card.set}` : ''}
          </div>
          <div className="mt-1">
            <span className="badge bg-slate-800 text-slate-300">{card.rarity ?? '—'}</span>
          </div>
        </div>
      </Link>

      {/* ปุ่ม +/- ด้านล่าง — ไม่ต้องเข้าหน้ารายละเอียด */}
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <button
          className="btn-secondary h-8 w-8 p-0"
          onClick={(e) => { e.preventDefault(); decOwned(card.id) }}
          aria-label="ลดจำนวน"
          disabled={owned <= 0}
        >
          <Icon name="minus" size={14} />
        </button>
        <span className="text-sm font-medium text-slate-100">มี {owned}</span>
        <button
          className="btn-secondary h-8 w-8 p-0"
          onClick={(e) => { e.preventDefault(); incOwned(card.id) }}
          aria-label="เพิ่มจำนวน"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  )
}
