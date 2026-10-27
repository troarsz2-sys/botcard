import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { Icon } from '../components/Icon'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { downloadTextFile } from '../utils/download'
import { exportCatalogCsv, exportCatalogJson, exportCollectionCsv, createFullBackup } from '../database/exportService'
import { validateBackup, type RestoreMode } from '../utils/backup'
import { formatDate, formatNumber } from '../utils/format'

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}

export function ExportPage() {
  const { catalog, collection, restoreBackup, reload, updateSettings, settings } = useApp()
  const [message, setMessage] = useState('')
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge')
  const [pendingRaw, setPendingRaw] = useState<unknown>(null)
  const [pendingName, setPendingName] = useState('')
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [busy, setBusy] = useState(false)

  function stamp(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  }

  async function doExport(kind: 'csv' | 'catjson' | 'colcsv' | 'backup') {
    setMessage('')
    try {
      if (kind === 'csv') downloadTextFile(`bot-catalog-${stamp()}.csv`, exportCatalogCsv(catalog), 'text/csv;charset=utf-8')
      else if (kind === 'catjson') downloadTextFile(`bot-catalog-${stamp()}.json`, exportCatalogJson(catalog), 'application/json;charset=utf-8')
      else if (kind === 'colcsv') downloadTextFile(`bot-collection-${stamp()}.csv`, exportCollectionCsv(catalog, collection), 'text/csv;charset=utf-8')
      else {
        const backup = await createFullBackup()
        downloadTextFile(`bot-backup-${stamp()}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8')
        await updateSettings({ lastBackupAt: new Date().toISOString() })
        setMessage('สร้างแบ็กอัปเสร็จแล้ว')
      }
    } catch (e) {
      setMessage('เกิดข้อผิดพลาด: ' + (e as Error).message)
    }
  }

  async function onRestoreFile(file: File) {
    setMessage('')
    try {
      const raw = JSON.parse(await readFile(file))
      const v = validateBackup(raw)
      if (!v.ok) {
        setMessage('ไฟล์ไม่ใช่แบ็กอัปที่ใช้ได้: ' + v.errors.slice(0, 5).join(' / '))
        return
      }
      setPendingRaw(raw)
      setPendingName(file.name)
      setMessage(`ตรวจสอบผ่าน เลือกโหมดแล้วกด "กู้คืน" (แคตตาล็อก ${formatNumber((raw as { catalog: unknown[] }).catalog.length)} รายการ)`)
    } catch (e) {
      setMessage('อ่านไฟล์ไม่ได้: ' + (e as Error).message)
    }
  }

  async function applyRestore() {
    if (!pendingRaw) return
    setBusy(true)
    setMessage('')
    try {
      const res = await restoreBackup(pendingRaw, restoreMode)
      if (res.ok) {
        setMessage(`กู้คืนสำเร็จ (${restoreMode === 'replace' ? 'แทนที่ทั้งหมด' : 'รวมข้อมูล'}) แคตตาล็อก ${formatNumber(res.catalogCount)} รายการ`)
        setPendingRaw(null)
        setPendingName('')
        await reload()
      } else {
        setMessage('กู้คืนไม่สำเร็จ: ' + res.errors.slice(0, 5).join(' / '))
      }
    } catch (e) {
      setMessage('กู้คืนไม่สำเร็จ: ' + (e as Error).message)
    } finally {
      setBusy(false)
      setConfirmReplace(false)
    }
  }

  function startRestore() {
    if (restoreMode === 'replace') setConfirmReplace(true)
    else applyRestore()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ส่งออก / สำรองข้อมูล</h1>
      <p className="text-sm text-slate-400">
        แบ็กอัปเต็มรูปแบบจะรวมแคตตาล็อก คอลเลกชัน wishlist การตั้งค่า ประวัติการนำเข้า
        และ <b>รูปที่แนบเอง</b> (ฝังเป็น base64) ทำให้กู้คืนได้ครบ
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card-surface p-4">
          <h2 className="mb-2 font-medium">ส่งออกแคตตาล็อก</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => doExport('csv')}><Icon name="download" size={16} /> CSV</button>
            <button className="btn-secondary" onClick={() => doExport('catjson')}><Icon name="download" size={16} /> JSON</button>
          </div>
        </div>
        <div className="card-surface p-4">
          <h2 className="mb-2 font-medium">ส่งออกคอลเลกชัน</h2>
          <button className="btn-secondary" onClick={() => doExport('colcsv')}><Icon name="download" size={16} /> CSV (พร้อมรหัส/ชื่อ)</button>
        </div>
      </div>

      <div className="card-surface p-4">
        <h2 className="mb-2 font-medium">สำรองข้อมูลเต็มรูปแบบ (JSON)</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => doExport('backup')}><Icon name="save" size={16} /> สร้างไฟล์สำรอง</button>
          {settings.lastBackupAt && <span className="text-xs text-slate-500">สำรองล่าสุด: {formatDate(settings.lastBackupAt)}</span>}
        </div>
      </div>

      <div className="card-surface p-4">
        <h2 className="mb-2 font-medium">กู้คืนจากไฟล์สำรอง</h2>
        <div className="space-y-3">
          <input type="file" accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) onRestoreFile(f); e.target.value = '' }} />
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span>โหมด:</span>
            <label className="flex items-center gap-1">
              <input type="radio" checked={restoreMode === 'merge'} onChange={() => setRestoreMode('merge')} /> รวมข้อมูล (ข้อมูลนำเข้าชนะตอนซ้ำ)
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={restoreMode === 'replace'} onChange={() => setRestoreMode('replace')} /> แทนที่ทั้งหมด
            </label>
          </div>
          {pendingName && <div className="text-sm text-slate-400">ไฟล์: {pendingName}</div>}
          {message && <div className="text-sm text-slate-300">{message}</div>}
          <button className="btn-primary" disabled={!pendingRaw || busy} onClick={startRestore}>
            <Icon name="upload" size={16} /> กู้คืน
          </button>
          <p className="text-xs text-slate-500">
            โหมด "แทนที่ทั้งหมด" จะล้างข้อมูลปัจจุบันก่อนเขียนใหม่ ใช้ด้วยความระมัดระวัง
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        title="ยืนยันการแทนที่ข้อมูลทั้งหมด"
        danger
        message={'โหมดนี้จะล้างแคตตาล็อก คอลเลกชัน wishlist การตั้งค่า และรูปทั้งหมดของเบราว์เซอร์เครื่องนี้ แล้วเขียนจากไฟล์สำรองแทน ไม่สามารถยกเลิกได้\n\nแนะนำให้สำรองข้อมูลปัจจุบันก่อนด้วย'}
        confirmText="ยืนยัน แทนที่ทั้งหมด"
        onConfirm={applyRestore}
        onCancel={() => setConfirmReplace(false)}
      />
    </div>
  )
}
