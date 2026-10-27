import { useEffect, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Icon } from '../components/Icon'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function SettingsPage() {
  const { catalog, settings, loadDemoData, deleteCard, clearAllData, updateSettings } = useApp()
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [newSet, setNewSet] = useState('')
  const [newRarity, setNewRarity] = useState('')
  const [newType, setNewType] = useState('')

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((e) => setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
    }
  }, [])

  const demoCount = catalog.filter((c) => c.set === 'DEMO').length

  function mb(bytes: number): string {
    if (!bytes) return '0'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  function addKnown(kind: 'set' | 'rarity' | 'type', value: string) {
    const v = value.trim()
    if (!v) return
    if (kind === 'set' && !settings.knownSets.includes(v)) updateSettings({ knownSets: [...settings.knownSets, v] })
    if (kind === 'rarity' && !settings.knownRarities.includes(v)) updateSettings({ knownRarities: [...settings.knownRarities, v] })
    if (kind === 'type' && !settings.knownTypes.includes(v)) updateSettings({ knownTypes: [...settings.knownTypes, v] })
  }

  async function deleteDemo() {
    const demos = catalog.filter((c) => c.set === 'DEMO')
    for (const d of demos) await deleteCard(d.id)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ตั้งค่า</h1>

      <div className="card-surface p-4">
        <h2 className="mb-2 font-medium">การจัดเก็บข้อมูล</h2>
        <p className="text-sm text-slate-400">
          ข้อมูลทั้งหมดเก็บใน IndexedDB ของเบราว์เซอร์เครื่องนี้ ไม่ได้ส่งออกไปไหน
          การล้างข้อมูลเบราว์เซอร์/อุปกรณ์อื่นจะไม่กระทบข้อมูลที่นี่ และข้อมูลที่นี่ก็ไม่ไปปรากฏที่อื่น
        </p>
        {est && (
          <p className="mt-2 text-sm text-slate-300">ใช้พื้นที่ {mb(est.usage)} {est.quota ? `/ ${mb(est.quota)}` : ''}</p>
        )}
      </div>

      <div className="card-surface p-4">
        <h2 className="mb-2 font-medium">ข้อมูลตัวอย่าง (DEMO)</h2>
        <p className="text-sm text-slate-400">
          การ์ดตัวอย่างมี set = DEMO และชื่อขึ้นต้นด้วย "(ตัวอย่าง)" ไม่ใช่การ์ดจริง ใช้ทดลองแล้วลบได้
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => loadDemoData()}><Icon name="plus" size={16} /> โหลดข้อมูลตัวอย่าง</button>
          <button className="btn-secondary" onClick={deleteDemo} disabled={demoCount === 0}>
            <Icon name="trash" size={16} /> ลบข้อมูลตัวอย่าง ({demoCount})
          </button>
        </div>
      </div>

      <div className="card-surface p-4">
        <h2 className="mb-2 font-medium">ค่าที่ใช้บ่อย (เซ็ต / ความหายาก / ประเภท)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">เซ็ต</label>
            <div className="mb-2 flex gap-1">
              <input className="input" value={newSet} onChange={(e) => setNewSet(e.target.value)} placeholder="เพิ่มเซ็ตใหม่" />
              <button className="btn-secondary" onClick={() => { addKnown('set', newSet); setNewSet('') }}>เพิ่ม</button>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {settings.knownSets.map((s) => <span key={s} className="badge bg-slate-800 text-slate-300">{s}</span>)}
            </div>
          </div>
          <div>
            <label className="label">ความหายาก</label>
            <div className="mb-2 flex gap-1">
              <input className="input" value={newRarity} onChange={(e) => setNewRarity(e.target.value)} placeholder="เพิ่มค่าใหม่" />
              <button className="btn-secondary" onClick={() => { addKnown('rarity', newRarity); setNewRarity('') }}>เพิ่ม</button>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {settings.knownRarities.map((r) => <span key={r} className="badge bg-slate-800 text-slate-300">{r}</span>)}
            </div>
          </div>
          <div>
            <label className="label">ประเภท</label>
            <div className="mb-2 flex gap-1">
              <input className="input" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="เพิ่มประเภทใหม่" />
              <button className="btn-secondary" onClick={() => { addKnown('type', newType); setNewType('') }}>เพิ่ม</button>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {settings.knownTypes.map((t) => <span key={t} className="badge bg-slate-800 text-slate-300">{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="card-surface border-red-800/60 p-4">
        <h2 className="mb-2 font-medium text-red-300">โซนอันตราย</h2>
        <p className="text-sm text-slate-400">ล้างข้อมูลทั้งหมดในเบราว์เซอร์เครื่องนี้ (แคตตาล็อก คอลเลกชัน wishlist รูป การตั้งค่า) ไม่สามารถยกเลิกได้ แนะนำให้สำรองข้อมูลก่อน</p>
        <button className="btn-danger mt-3" onClick={() => setConfirmClear(true)}><Icon name="trash" size={16} /> ล้างข้อมูลทั้งหมด</button>
      </div>

      <div className="card-surface p-4 text-sm text-slate-400">
        <h2 className="mb-2 font-medium text-slate-200">เกี่ยวกับแอป</h2>
        <p>แอปจัดการคลังการ์ด Battle of Talingchan สำหรับใช้ส่วนตัว ฟรี ทำงานในเครื่องเป็นหลัก (local-first)</p>
        <p className="mt-1">หากนำไป deploy บน GitHub Pages ใครเข้าถึง URL ได้ก็เปิดแอปได้ แต่ข้อมูลคลังการ์ดของแต่ละคนยังเก็บแยกในเบราว์เซอร์ของตน ไม่ใช่เว็บส่วนตัวแบบมีล็อกอิน หากต้องการให้เป็นส่วนตัวจริง ๆ ให้เปิดใช้ในเครื่องเท่านั้น หรือทำระบบล็อกอินแยกต่างหาก</p>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="ล้างข้อมูลทั้งหมด?"
        danger
        message="จะลบข้อมูลทุกอย่างในเบราว์เซอร์เครื่องนี้ ไม่สามารถยกเลิกได้ ควรสำรองข้อมูลก่อน"
        confirmText="ยืนยัน ล้างทั้งหมด"
        onConfirm={async () => { await clearAllData(); setConfirmClear(false) }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
