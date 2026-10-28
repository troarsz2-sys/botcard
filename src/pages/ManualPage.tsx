import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp, type NewCard } from '../state/AppContext'
import { Icon } from '../components/Icon'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/Feedback'
import { distinctStrings } from '../utils/list'
import { normalizeCode } from '../utils/id'

const EMPTY: NewCard = {
  code: '',
  nameTh: '',
  nameEn: '',
  set: '',
  type: '',
  rarity: '',
  variant: '',
  imageUrl: '',
  sourceUrl: '',
  attribution: '',
  description: '',
  lastVerified: '',
  verified: false,
}

export function ManualPage() {
  const { catalog, settings, addCard, updateCard, deleteCard, attachImage, updateSettings } = useApp()
  const [params, setParams] = useSearchParams()
  const editId = params.get('id') ?? ''
  const editing = editId ? catalog.find((c) => c.id === editId) : undefined

  const [form, setForm] = useState<NewCard>(EMPTY)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const sets = useMemo(() => distinctStrings([...catalog.map((c) => c.set), ...settings.knownSets]), [catalog, settings])
  const rarities = useMemo(() => distinctStrings([...catalog.map((c) => c.rarity), ...settings.knownRarities]), [catalog, settings])
  const types = useMemo(() => distinctStrings([...catalog.map((c) => c.type), ...settings.knownTypes]), [catalog, settings])

  useEffect(() => {
    if (editing) {
      const { id, createdAt, updatedAt, imageLocalId, ...rest } = editing
      void id; void createdAt; void updatedAt; void imageLocalId
      setForm({ ...EMPTY, ...rest })
    } else {
      setForm(EMPTY)
    }
    setError('')
    setSaved('')
  }, [editId]) // eslint-disable-line react-hooks/exhaustive-deps

  const [search, setSearch] = useState('')
  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...catalog]
      .filter((c) => !q || `${c.nameTh} ${c.nameEn ?? ''} ${c.code}`.toLowerCase().includes(q))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [catalog, search])

  function set<K extends keyof NewCard>(key: K, value: NewCard[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSave() {
    setError('')
    setSaved('')
    const rawCode = form.code.trim()
    const nameTh = form.nameTh.trim()
    const rarity = form.rarity?.trim() ?? ''

    if (!rawCode) return setError('ต้องกรอกรหัสการ์ด (code)')
    if (!nameTh) return setError('ต้องกรอกชื่อไทย (nameTh)')

    // ถ้ากรอก rarity และ code ยังไม่มี rarity ต่อท้าย ให้ auto-append
    // เช่น BT10-043 + UR → BT10-043-UR (เหมือนที่ sync ดึงมา)
    const code = rarity && !rawCode.toUpperCase().endsWith(`-${rarity.toUpperCase()}`)
      ? `${rawCode}-${rarity}`
      : rawCode

    // ตรวจซ้ำ code
    const dup = catalog.find((c) => normalizeCode(c.code) === normalizeCode(code) && c.id !== editId)
    if (dup) return setError(`รหัส "${code}" มีอยู่แล้ว (${dup.nameTh}) กรุณาใช้รหัสอื่นหรือแก้ไขการ์ดนั้น`)

    // บันทึกค่าใหม่เข้า known lists ของ settings
    const knownSets = form.set && !settings.knownSets.includes(form.set) ? [...settings.knownSets, form.set] : settings.knownSets
    const knownRarities = form.rarity && !settings.knownRarities.includes(form.rarity) ? [...settings.knownRarities, form.rarity] : settings.knownRarities
    const knownTypes = form.type && !settings.knownTypes.includes(form.type) ? [...settings.knownTypes, form.type] : settings.knownTypes
    if (knownSets !== settings.knownSets || knownRarities !== settings.knownRarities || knownTypes !== settings.knownTypes) {
      await updateSettings({ knownSets, knownRarities, knownTypes })
    }

    try {
      let id = editId
      const payload: NewCard = {
        ...form,
        code,
        nameTh,
        nameEn: form.nameEn?.trim() || undefined,
        set: form.set?.trim() || undefined,
        type: form.type?.trim() || undefined,
        rarity: form.rarity?.trim() || undefined,
        variant: form.variant?.trim() || undefined,
        imageUrl: form.imageUrl?.trim() || undefined,
        sourceUrl: form.sourceUrl?.trim() || undefined,
        attribution: form.attribution?.trim() || undefined,
        description: form.description?.trim() || undefined,
        lastVerified: form.lastVerified || undefined,
      }
      if (editing && editId) {
        await updateCard({ ...editing, ...payload, id: editId })
        setSaved('บันทึกการแก้ไขแล้ว')
      } else {
        const created = await addCard(payload)
        id = created.id
        setSaved(`เพิ่ม "${created.nameTh}" แล้ว`)
      }
      if (file && id) {
        await attachImage(id, file)
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
      }
      if (!editing) setForm(EMPTY)
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + (e as Error).message)
    }
  }

  function newCard() {
    setParams({})
    setForm(EMPTY)
  }

  const deleteTarget = confirmId ? catalog.find((c) => c.id === confirmId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">จัดการการ์ด (กรอก/แก้ไขเอง)</h1>
        {editId && <button className="btn-secondary" onClick={newCard}><Icon name="plus" size={16} /> เพิ่มการ์ดใหม่</button>}
      </div>

      <div className="card-surface p-4">
        <h2 className="mb-3 font-medium">{editId ? `แก้ไขการ์ด: ${editing?.nameTh ?? ''}` : 'เพิ่มการ์ดใหม่'}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">รหัสการ์ด (code) *</label>
            <input className="input" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="เช่น BT01-001" />
            {/* แสดงรหัสจริงที่จะบันทึก เมื่อมี rarity */}
            {form.code && form.rarity && !form.code.trim().toUpperCase().endsWith(`-${form.rarity.trim().toUpperCase()}`) && (
              <p className="mt-1 text-xs text-amber-400">
                รหัสที่จะบันทึก: <b>{form.code.trim()}-{form.rarity.trim()}</b> (เพิ่ม rarity ให้อัตโนมัติ)
              </p>
            )}
          </div>
          <div>
            <label className="label">ชื่อไทย *</label>
            <input className="input" value={form.nameTh} onChange={(e) => set('nameTh', e.target.value)} />
          </div>
          <div>
            <label className="label">ชื่ออังกฤษ</label>
            <input className="input" value={form.nameEn ?? ''} onChange={(e) => set('nameEn', e.target.value)} />
          </div>
          <div>
            <label className="label">เซ็ต</label>
            <input className="input" list="set-list" value={form.set ?? ''} onChange={(e) => set('set', e.target.value)} placeholder="พิมพ์เพื่อเพิ่มเซ็ตใหม่ได้" />
            <datalist id="set-list">{sets.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="label">ประเภท</label>
            <input className="input" list="type-list" value={form.type ?? ''} onChange={(e) => set('type', e.target.value)} />
            <datalist id="type-list">{types.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div>
            <label className="label">ความหายาก</label>
            <input className="input" list="rarity-list" value={form.rarity ?? ''} onChange={(e) => set('rarity', e.target.value)} placeholder="พิมพ์เพื่อเพิ่มค่าใหม่ได้" />
            <datalist id="rarity-list">{rarities.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
          <div>
            <label className="label">รุ่นพิมพ์/variant</label>
            <input className="input" value={form.variant ?? ''} onChange={(e) => set('variant', e.target.value)} />
          </div>
          <div>
            <label className="label">วันที่ตรวจสอบ</label>
            <input type="date" className="input" value={form.lastVerified ?? ''} onChange={(e) => set('lastVerified', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">URL รูปการ์ด (ถ้าได้รับอนุญาต)</label>
            <input className="input" value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="label">URL แหล่งที่มา</label>
            <input className="input" value={form.sourceUrl ?? ''} onChange={(e) => set('sourceUrl', e.target.value)} />
          </div>
          <div>
            <label className="label">แหล่งที่มา/อ้างอิง</label>
            <input className="input" value={form.attribution ?? ''} onChange={(e) => set('attribution', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">คำอธิบาย</label>
            <textarea className="input" rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} />
              ระบุว่าเป็นข้อมูลที่ตรวจสอบแล้ว (ถ้าไม่เลือกจะถือว่ากรอกเอง/ยังไม่ยืนยัน)
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="label">แนบรูปเอง (เก็บในเบราว์เซอร์)</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        {saved && <div className="mt-3 text-sm text-emerald-400">{saved}</div>}
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={onSave}><Icon name="save" size={16} /> บันทึก</button>
          {editing && (
            <button className="btn-danger" onClick={() => setConfirmId(editId)}><Icon name="trash" size={16} /> ลบการ์ดนี้</button>
          )}
        </div>
      </div>

      <div className="card-surface p-4">
        <h2 className="mb-3 font-medium">การ์ดทั้งหมด ({catalog.length})</h2>
        <div className="relative mb-3">
          <span className="pointer-events-none absolute left-2 top-2.5 text-slate-500"><Icon name="search" size={18} /></span>
          <input className="input pl-9" placeholder="ค้นหาการ์ด" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {list.length === 0 ? (
          <EmptyState title="ไม่พบการ์ด" icon="catalog" />
        ) : (
          <ul className="max-h-96 divide-y divide-slate-800 overflow-auto">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-200">{c.nameTh} <span className="text-slate-500">({c.code})</span></div>
                  <div className="truncate text-xs text-slate-500">{c.set ?? '—'} · {c.rarity ?? '—'} {c.verified ? '' : '· ยังไม่ยืนยัน'}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="btn-secondary" onClick={() => setParams({ id: c.id })} aria-label="แก้ไข"><Icon name="edit" size={16} /></button>
                  <button className="btn-danger" onClick={() => setConfirmId(c.id)} aria-label="ลบ"><Icon name="trash" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        title="ลบการ์ดนี้?"
        danger
        message={deleteTarget ? `จะลบ "${deleteTarget.nameTh}" (${deleteTarget.code}) และข้อมูลคอลเลกชัน/wishlist ที่เกี่ยวข้อง ไม่สามารถยกเลิกได้` : ''}
        confirmText="ลบ"
        onConfirm={async () => { if (confirmId) { await deleteCard(confirmId); setConfirmId(null); if (confirmId === editId) newCard() } }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
