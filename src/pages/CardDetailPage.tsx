import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { CardImage } from '../components/CardImage'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, Loading } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { CONDITION_LABELS_TH, PRIORITY_LABELS_TH, type CardCondition, type WishlistPriority } from '../types'
import { conditionLabel, formatDate, rarityLabel, setText } from '../utils/format'

function toLocalDateInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const app = useApp()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imgInput, setImgInput] = useState<HTMLInputElement | null>(null)

  if (!app.ready) return <Loading />
  const card = app.catalog.find((c) => c.id === id)
  if (!card) return <EmptyState title="ไม่พบการ์ดนี้" message="อาจถูกลบไปแล้ว" icon="alert" />

  const rec = app.collectionMap.get(card.id)
  const owned = rec?.owned ?? 0
  const forTrade = rec?.forTrade ?? 0
  const wish = app.wishlistMap.get(card.id)
  const hasCollectionOrWishlist = owned > 0 || forTrade > 0 || !!rec?.notes || !!wish

  return (
    <div className="space-y-6">
      <Link to="/catalog" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-400">
        <Icon name="arrowLeft" size={16} /> กลับหน้าแคตตาล็อก
      </Link>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <div className="card-surface overflow-hidden">
            <CardImage card={card} className="aspect-[3/4] w-full object-cover" />
          </div>
          <div className="flex gap-2">
            <input
              ref={setImgInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) await app.attachImage(card.id, f)
                e.target.value = ''
              }}
            />
            <button className="btn-secondary flex-1" onClick={() => imgInput?.click()}>
              <Icon name="image" size={16} /> {card.imageLocalId ? 'เปลี่ยนรูป' : 'แนบรูป'}
            </button>
            {card.imageLocalId && (
              <button className="btn-danger" onClick={() => app.removeImage(card.id)} aria-label="ลบรูป">
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold">{card.nameTh}</h1>
                {card.nameEn && <div className="text-sm text-slate-400">{card.nameEn}</div>}
              </div>
              <div className="flex gap-1">
                <Link to={`/manual?id=${card.id}`} className="btn-secondary"><Icon name="edit" size={16} /> แก้ไขข้อมูลการ์ด</Link>
                <button className="btn-danger" onClick={() => setConfirmDelete(true)} aria-label="ลบการ์ด"><Icon name="trash" size={16} /></button>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <Field label="รหัสการ์ด" value={card.code} />
              <Field label="เซ็ต" value={setText(card.set)} />
              <Field label="ความหายาก" value={rarityLabel(card.rarity)} />
              <Field label="ประเภท" value={setText(card.type)} />
              <Field label="รุ่นพิมพ์/variant" value={setText(card.variant)} />
              <Field label="สถานะ" value={card.verified ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'} />
              <Field label="วันที่ตรวจสอบ" value={formatDate(card.lastVerified)} />
              <Field label="สร้างเมื่อ" value={formatDate(card.createdAt)} />
              <Field label="อัปเดตเมื่อ" value={formatDate(card.updatedAt)} />
            </dl>
            {card.description && <p className="mt-3 text-sm text-slate-300">{card.description}</p>}
            {(card.sourceUrl || card.attribution) && (
              <div className="mt-3 space-y-1 text-sm">
                {card.attribution && <div className="text-slate-400">แหล่งที่มา: {card.attribution}</div>}
                {card.sourceUrl && (
                  <a href={card.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-400 hover:underline">
                    <Icon name="link" size={14} /> ดูแหล่งที่มาดั้งเดิม
                  </a>
                )}
              </div>
            )}
          </div>

          {/* คอลเลกชัน */}
          <div className="card-surface p-4">
            <h2 className="mb-3 font-medium">คอลเลกชันของฉัน</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">จำนวนที่มี</label>
                <div className="flex items-center gap-1">
                  <button className="btn-secondary" onClick={() => app.decOwned(card.id)} aria-label="ลด"><Icon name="minus" size={16} /></button>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={owned}
                    onChange={(e) => app.setOwned(card.id, Number(e.target.value))}
                  />
                  <button className="btn-secondary" onClick={() => app.incOwned(card.id)} aria-label="เพิ่ม"><Icon name="plus" size={16} /></button>
                </div>
              </div>
              <div>
                <label className="label">พร้อมแลก</label>
                <div className="flex items-center gap-1">
                  <button className="btn-secondary" onClick={() => app.patchCollection(card.id, { forTrade: Math.max(0, forTrade - 1) })} aria-label="ลด"><Icon name="minus" size={16} /></button>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={forTrade}
                    onChange={(e) => app.patchCollection(card.id, { forTrade: Math.max(0, Number(e.target.value)) })}
                  />
                  <button className="btn-secondary" onClick={() => app.patchCollection(card.id, { forTrade: forTrade + 1 })} aria-label="เพิ่ม"><Icon name="plus" size={16} /></button>
                </div>
              </div>
              <div>
                <label className="label">สภาพ</label>
                <select className="input" value={rec?.condition ?? 'Unknown'} onChange={(e) => app.patchCollection(card.id, { condition: e.target.value as CardCondition })}>
                  {(Object.keys(CONDITION_LABELS_TH) as CardCondition[]).map((c) => <option key={c} value={c}>{conditionLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">วันที่ได้มา</label>
                <input type="date" className="input" value={toLocalDateInput(rec?.acquiredAt)} onChange={(e) => app.patchCollection(card.id, { acquiredAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
              </div>
              <div>
                <label className="label">ราคาที่ซื้อ (บาท)</label>
                <input type="number" min={0} step="0.01" className="input" defaultValue={rec?.purchasePrice ?? ''} onBlur={(e) => app.patchCollection(card.id, { purchasePrice: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">โน้ตส่วนตัว</label>
                <textarea className="input" rows={2} defaultValue={rec?.notes ?? ''} onBlur={(e) => { if (e.target.value !== (rec?.notes ?? '')) app.patchCollection(card.id, { notes: e.target.value }) }} />
              </div>
            </div>
          </div>

          {/* Wishlist */}
          <div className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">การ์ดที่อยากได้</h2>
              {wish && <button className="btn-danger" onClick={() => app.removeWishlist(card.id)}>ลบออกจาก wishlist</button>}
            </div>
            {!wish ? (
              <button className="btn-primary" onClick={() => app.setWanted(card.id, 1)}><Icon name="heart" size={16} /> เพิ่มใน wishlist</button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">จำนวนที่อยากได้</label>
                  <div className="flex items-center gap-1">
                    <button className="btn-secondary" onClick={() => app.setWanted(card.id, Math.max(0, wish.wanted - 1))} aria-label="ลด"><Icon name="minus" size={16} /></button>
                    <input type="number" min={0} className="input" value={wish.wanted} onChange={(e) => app.setWanted(card.id, Number(e.target.value))} />
                    <button className="btn-secondary" onClick={() => app.setWanted(card.id, wish.wanted + 1)} aria-label="เพิ่ม"><Icon name="plus" size={16} /></button>
                  </div>
                </div>
                <div>
                  <label className="label">ความสำคัญ</label>
                  <select className="input" value={wish.priority} onChange={(e) => app.patchWishlist(card.id, { priority: e.target.value as WishlistPriority })}>
                    {(['high', 'medium', 'low'] as WishlistPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABELS_TH[p]}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={wish.obtained} onChange={(e) => app.patchWishlist(card.id, { obtained: e.target.checked })} />
                    ได้แล้ว
                  </label>
                  {!wish.obtained && <button className="btn-secondary" onClick={() => app.markObtained(card.id)}><Icon name="check" size={16} /> ทำเครื่องหมายว่าได้แล้ว</button>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">โน้ต wishlist</label>
                  <textarea className="input" rows={1} defaultValue={wish.notes ?? ''} onBlur={(e) => { if (e.target.value !== (wish.notes ?? '')) app.patchWishlist(card.id, { notes: e.target.value }) }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="ลบการ์ดนี้?"
        danger
        message={`จะลบ "${card.nameTh}" (${card.code}) ออกจากแคตตาล็อก${hasCollectionOrWishlist ? ' และจะลบข้อมูลคอลเลกชัน/wishlist ที่เกี่ยวข้องด้วย' : ''} ไม่สามารถยกเลิกได้`}
        confirmText="ลบ"
        onConfirm={async () => { await app.deleteCard(card.id); setConfirmDelete(false); window.location.hash = '#/catalog' }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  )
}
