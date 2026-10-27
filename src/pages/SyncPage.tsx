import { useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import type { SyncOutcome } from '../state/AppContext'
import { Icon } from '../components/Icon'
import { formatDate } from '../utils/format'
import { COMMUNITY_SETS } from '../utils/syncTransform'

type Tab = 'github' | 'file'

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}

export function SyncPage() {
  const { settings, catalog, syncFromGitHub, syncFromJsonText } = useApp()
  const [tab, setTab] = useState<Tab>('github')

  // --- GitHub sync state ---
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: COMMUNITY_SETS.length, current: '' })
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null)
  const [ghError, setGhError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // --- File import state ---
  const [fileText, setFileText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileResult, setFileResult] = useState('')
  const [fileError, setFileError] = useState('')
  const [fileBusy, setFileBusy] = useState(false)

  async function startGitHubSync() {
    setOutcome(null)
    setGhError('')
    setRunning(true)
    setProgress({ done: 0, total: COMMUNITY_SETS.length, current: '' })
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const result = await syncFromGitHub(
        (done, total, setName) => setProgress({ done, total, current: setName }),
        ctrl.signal
      )
      setOutcome(result)
    } catch (e) {
      setGhError('เกิดข้อผิดพลาดที่ไม่คาดคิด: ' + (e as Error).message)
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }

  function cancelSync() {
    abortRef.current?.abort()
  }

  async function onFileChange(file: File) {
    setFileText('')
    setFileName('')
    setFileResult('')
    setFileError('')
    try {
      setFileText(await readFileText(file))
      setFileName(file.name)
    } catch (e) {
      setFileError('อ่านไฟล์ไม่ได้: ' + (e as Error).message)
    }
  }

  async function doFileSync() {
    if (!fileText) return
    setFileBusy(true)
    setFileResult('')
    setFileError('')
    try {
      const r = await syncFromJsonText(fileText, fileName)
      const errs = [...r.parseErrors, ...r.merge.errors]
      setFileResult(
        `นำเข้าสำเร็จ — เพิ่ม ${r.merge.added} · อัปเดต ${r.merge.updated} · ข้าม ${r.merge.skipped}` +
        (errs.length ? ` · ${errs.length} คำเตือน` : '')
      )
    } catch (e) {
      setFileError('นำเข้าไม่สำเร็จ: ' + (e as Error).message)
    } finally {
      setFileBusy(false)
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ซิงก์ข้อมูลการ์ด</h1>

      {/* Summary stats */}
      <div className="card-surface grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 text-center">
        <Stat label="การ์ดในแคตตาล็อก" value={catalog.length} />
        <Stat label="ซิงก์ล่าสุด" value={settings.lastSyncAt ? formatDate(settings.lastSyncAt) : '—'} />
        <Stat label="แหล่งล่าสุด" value={
          settings.syncSource === 'github-community' ? 'GitHub ชุมชน' :
          settings.syncSource === 'json-file' ? 'ไฟล์ JSON' : '—'
        } />
        <Stat label="เพิ่มครั้งสุดท้าย" value={settings.syncStats?.added ?? '—'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <button className={tab === 'github' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('github')}>
          <Icon name="refresh" size={16} /> GitHub ชุมชน
        </button>
        <button className={tab === 'file' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('file')}>
          <Icon name="upload" size={16} /> ไฟล์ JSON
        </button>
      </div>

      {tab === 'github' && (
        <div className="card-surface p-4 space-y-4">
          <h2 className="font-medium">ดึงข้อมูลจาก GitHub ชุมชน</h2>

          {/* Disclaimer */}
          <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-200 space-y-1">
            <p className="font-medium">⚠️ ข้อมูลจากแหล่งชุมชน (Fan-made) — อ่านก่อนใช้</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              <li>แหล่งข้อมูล: <a href="https://github.com/kerlos/battle-of-talinchan-cards" target="_blank" rel="noreferrer" className="underline">kerlos/battle-of-talinchan-cards</a> (MIT license)</li>
              <li>ซอร์สโค้ดของโปรเจกต์นั้นอยู่ภายใต้ MIT แต่ข้อมูลการ์ด (ชื่อ/effect) เป็นลิขสิทธิ์ของ บริษัท พสุโลล จำกัด / ไลอ้อน เฮ้าส์ จำกัด</li>
              <li>ใช้เพื่อ<b>การสะสมส่วนตัว</b>เท่านั้น ห้ามแจกจ่ายหรือนำไปเผยแพร่</li>
              <li>ไม่มีรูปการ์ดในแหล่งนี้ — ต้องแนบรูปเองหากต้องการ</li>
              <li>ข้อมูลเป็นผลงานชุมชน ไม่ใช่ข้อมูลทางการ ตรวจสอบความถูกต้องเองก่อนเชื่อ</li>
              <li>ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อดาวน์โหลด</li>
            </ul>
          </div>

          <div className="text-sm text-slate-400">
            ดาวน์โหลดไฟล์ข้อมูลการ์ดจาก GitHub ({COMMUNITY_SETS.length} ชุด) แปลง และนำเข้าแคตตาล็อกโดยอัตโนมัติ
            ข้อมูลส่วนตัวของคุณ (จำนวนที่มี / โน้ต / ราคา) จะ<b>ไม่ถูกลบหรือเขียนทับ</b>
          </div>

          {/* Progress */}
          {(running || outcome) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{running ? `กำลังดาวน์โหลด: ${progress.current}` : 'เสร็จแล้ว'}</span>
                <span>{progress.done}/{progress.total} ({pct}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-brand-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Result */}
          {outcome && (
            <div className={`rounded-lg border p-3 text-sm space-y-2 ${outcome.aborted ? 'border-amber-700 text-amber-200' : outcome.errors.length > 0 ? 'border-amber-700 text-amber-200' : 'border-emerald-700 text-emerald-200'}`}>
              <p className="font-medium">
                {outcome.aborted ? '⚠️ ยกเลิก' : '✓ เสร็จสิ้น'} —
                ดึง {outcome.totalFetched} · เพิ่ม {outcome.added} · อัปเดต {outcome.updated} · ข้าม {outcome.skipped}
              </p>
              {outcome.errors.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs">{outcome.errors.length} คำเตือน/ข้อผิดพลาด (คลิกดู)</summary>
                  <ul className="mt-1 max-h-40 overflow-auto list-disc pl-5 text-xs space-y-0.5">
                    {outcome.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          {ghError && <p className="text-sm text-red-400">{ghError}</p>}

          <div className="flex gap-2">
            <button className="btn-primary" onClick={startGitHubSync} disabled={running}>
              <Icon name="download" size={16} />
              {running ? 'กำลังดึงข้อมูล…' : outcome ? 'ดึงข้อมูลอีกครั้ง' : 'ดึงข้อมูลการ์ด'}
            </button>
            {running && (
              <button className="btn-secondary" onClick={cancelSync}>
                <Icon name="x" size={16} /> ยกเลิก
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'file' && (
        <div className="card-surface p-4 space-y-4">
          <h2 className="font-medium">นำเข้าจากไฟล์ JSON ที่เตรียมไว้</h2>
          <div className="text-sm text-slate-400 space-y-1">
            <p>
              ใช้ไฟล์ JSON ที่สร้างจาก Node.js script
              <code className="ml-1 rounded bg-slate-800 px-1 py-0.5 text-xs">npm run fetch-catalog</code>
              หรือไฟล์ catalog JSON ที่ export จากแอปนี้
            </p>
            <p>รูปแบบรองรับ: อาร์เรย์ของการ์ด <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">{'[ {...}, … ]'}</code> หรือ <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">{'{ catalog: [...] }'}</code></p>
          </div>

          <div className="space-y-3">
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); e.target.value = '' }}
              className="text-sm text-slate-300"
            />
            {fileName && <p className="text-xs text-slate-500">ไฟล์: {fileName}</p>}

            {fileText && (
              <p className="text-sm text-slate-300">
                โหลดแล้ว ({(fileText.length / 1024).toFixed(1)} KB)
              </p>
            )}

            {fileResult && <p className="text-sm text-emerald-400">{fileResult}</p>}
            {fileError && <p className="text-sm text-red-400">{fileError}</p>}

            <button
              className="btn-primary"
              disabled={!fileText || fileBusy}
              onClick={doFileSync}
            >
              <Icon name="upload" size={16} />
              {fileBusy ? 'กำลังนำเข้า…' : 'นำเข้าและอัปเดตแคตตาล็อก'}
            </button>
          </div>
        </div>
      )}

      {/* How to get data with the Node.js script */}
      <div className="card-surface p-4 space-y-3">
        <h2 className="font-medium flex items-center gap-2">
          <Icon name="book" size={18} /> วิธีสร้างไฟล์แคตตาล็อกด้วย Node.js script
        </h2>
        <p className="text-sm text-slate-400">
          ถ้าต้องการสร้างไฟล์ JSON แบบออฟไลน์หรือในกรณีที่ปุ่ม "ดึงข้อมูลการ์ด" ด้านบนใช้ไม่ได้
          (เช่น CORS หรือเครือข่ายปิดกั้น) ให้รันสคริปต์นี้ในเครื่องแทน:
        </p>
        <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
          <p className="text-slate-500"># เปิด PowerShell ในโฟลเดอร์โปรเจกต์ แล้วรัน:</p>
          <p>node scripts/fetch-bot-catalog.mjs</p>
          <p className="text-slate-500"># ไฟล์ bot-catalog.json จะถูกสร้างในโฟลเดอร์โปรเจกต์</p>
          <p className="text-slate-500"># จากนั้นนำเข้าไฟล์นั้นที่แท็บ "ไฟล์ JSON" ด้านบน</p>
        </div>
        <p className="text-xs text-slate-500">
          สคริปต์ดาวน์โหลดข้อมูลจาก GitHub ชุมชน (kerlos/battle-of-talinchan-cards, MIT)
          ข้อมูลการ์ดเป็นลิขสิทธิ์ของเจ้าของเกม ใช้ส่วนตัวเท่านั้น
        </p>
      </div>

      {/* Last sync detail */}
      {settings.syncStats && (
        <div className="card-surface p-4">
          <h2 className="mb-2 font-medium">สถิติการซิงก์ล่าสุด</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <Field label="แหล่ง" value={settings.syncStats.source === 'github-community' ? 'GitHub ชุมชน' : 'ไฟล์ JSON'} />
            <Field label="เวลา" value={formatDate(settings.syncStats.syncedAt)} />
            <Field label="ดึงมาได้" value={String(settings.syncStats.totalFetched)} />
            <Field label="เพิ่ม" value={String(settings.syncStats.added)} />
            <Field label="อัปเดต" value={String(settings.syncStats.updated)} />
            <Field label="ข้าม" value={String(settings.syncStats.skipped)} />
          </dl>
          {settings.syncStats.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-amber-400">
                {settings.syncStats.errors.length} ข้อผิดพลาด (คลิกดู)
              </summary>
              <ul className="mt-1 max-h-32 overflow-auto list-disc pl-5 text-xs text-slate-400 space-y-0.5">
                {settings.syncStats.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-100">{value}</div>
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
