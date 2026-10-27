import { useState } from 'react'
import { useApp, type CatalogImportOutcome, type CollectionImportOutcome } from '../state/AppContext'
import type { MergeOptions, CollectionMergeOptions } from '../utils/importLogic'
import { parseCatalogCsv } from '../utils/importLogic'
import { parseCatalogJson, parseCollectionJson } from '../utils/json'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/Feedback'
import { formatDate } from '../utils/format'

type Tab = 'catalog-csv' | 'catalog-json' | 'collection-json'

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}

export function ImportPage() {
  const { importCatalogFromCsv, importCatalogFromJson, importCollectionFromJson, importLog } = useApp()
  const [tab, setTab] = useState<Tab>('catalog-csv')
  const [fileName, setFileName] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [opts, setOpts] = useState({ addNew: true, updateMetadata: false, overwrite: false })
  const [result, setResult] = useState<string>('')

  function reset() {
    setFileName('')
    setText('')
    setError('')
    setResult('')
  }

  async function onFile(file: File) {
    reset()
    try {
      const t = await readFile(file)
      setText(t)
      setFileName(file.name)
    } catch (e) {
      setError('อ่านไฟล์ไม่ได้: ' + (e as Error).message)
    }
  }

  // preview (parse only)
  const preview = (() => {
    if (!text) return null
    if (tab === 'catalog-csv') {
      const p = parseCatalogCsv(text)
      return { count: p.cards.length, errors: p.errors, sample: p.cards.slice(0, 5).map((c) => `${c.code} — ${c.nameTh}`) }
    }
    if (tab === 'catalog-json') {
      const p = parseCatalogJson(text)
      return { count: p.data?.length ?? 0, errors: p.errors, sample: (p.data ?? []).slice(0, 5).map((c) => `${c.code} — ${c.nameTh}`) }
    }
    const p = parseCollectionJson(text)
    return { count: p.data?.length ?? 0, errors: p.errors, sample: (p.data ?? []).slice(0, 5).map((c) => `${c.cardId ?? c.code ?? '?'}`) }
  })()

  async function doImport() {
    setError('')
    setResult('')
    try {
      let msg = ''
      if (tab === 'catalog-csv') {
        const o: MergeOptions = { addNew: opts.addNew, updateMetadata: opts.updateMetadata }
        const r: CatalogImportOutcome = await importCatalogFromCsv(text, o, fileName)
        msg = `นำเข้าแคตตาล็อก (CSV): เพิ่ม ${r.merge.added} อัปเดต ${r.merge.updated} ข้าม ${r.merge.skipped}` +
          (r.parseErrors.length ? ` · คำเตือน ${r.parseErrors.length}` : '') +
          (r.merge.errors.length ? ` · ข้อผิดพลาด ${r.merge.errors.length}` : '')
      } else if (tab === 'catalog-json') {
        const o: MergeOptions = { addNew: opts.addNew, updateMetadata: opts.updateMetadata }
        const r: CatalogImportOutcome = await importCatalogFromJson(text, o, fileName)
        msg = `นำเข้าแคตตาล็อก (JSON): เพิ่ม ${r.merge.added} อัปเดต ${r.merge.updated} ข้าม ${r.merge.skipped}`
      } else {
        const o: CollectionMergeOptions = { overwrite: opts.overwrite }
        const r: CollectionImportOutcome = await importCollectionFromJson(text, o, fileName)
        msg = `นำเข้าคอลเลกชัน (JSON): เพิ่ม ${r.merge.added} อัปเดต ${r.merge.updated} ข้าม ${r.merge.skipped}` +
          (r.resolveErrors.length ? ` · ไม่พบการ์ง ${r.resolveErrors.length} รายการ` : '')
      }
      setResult(msg)
      reset()
    } catch (e) {
      setError('นำเข้าไม่สำเร็จ: ' + (e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">นำเข้าข้อมูล</h1>
      <p className="text-sm text-slate-400">
        นำเข้าแคตตาล็อก (CSV/JSON) หรือคอลเลกชันส่วนตัว (JSON) ระบบจะตรวจซ้ำด้วย id และรหัสการ์ด
        และจะไม่ลบหรือเขียนทับจำนวนที่มี/โน้ตส่วนตัวโดยไม่ได้ตั้งใจ
      </p>

      <div className="flex gap-1">
        {(['catalog-csv', 'catalog-json', 'collection-json'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'btn-primary' : 'btn-secondary'} onClick={() => { setTab(t); reset() }}>
            {t === 'catalog-csv' ? 'แคตตาล็อก CSV' : t === 'catalog-json' ? 'แคตตาล็อก JSON' : 'คอลเลกชัน JSON'}
          </button>
        ))}
      </div>

      <div className="card-surface p-4 space-y-3">
        <input type="file" accept={tab.includes('csv') ? '.csv,text/csv' : '.json,application/json'} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        <div className="text-sm text-slate-400">ไฟล์: {fileName || '—'}</div>

        {tab !== 'collection-json' ? (
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={opts.addNew} onChange={(e) => setOpts({ ...opts, addNew: e.target.checked })} />
              เพิ่มการ์ดใหม่
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={opts.updateMetadata} onChange={(e) => setOpts({ ...opts, updateMetadata: e.target.checked })} />
              อัปเดต metadata ของการ์ดที่มีอยู่
            </label>
          </div>
        ) : (
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={opts.overwrite} onChange={(e) => setOpts({ ...opts, overwrite: e.target.checked })} />
              เขียนทับรายการที่มีอยู่ (ถ้าไม่เลือก จะเพิ่มเฉพาะรายการใหม่ ไม่แตะของเดิม)
            </label>
          </div>
        )}

        {preview && (
          <div className="rounded-lg border border-slate-800 p-3 text-sm">
            <div className="text-slate-300">พบ {preview.count} รายการ{preview.errors.length > 0 ? ` · ${preview.errors.length} คำเตือน/ข้อผิดพลาด` : ''}</div>
            {preview.errors.length > 0 && (
              <ul className="mt-1 max-h-32 list-disc overflow-auto pl-5 text-xs text-amber-400">
                {preview.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {preview.sample.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
                {preview.sample.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </div>
        )}

        {error && <div className="text-sm text-red-400">{error}</div>}
        {result && <div className="text-sm text-emerald-400">{result}</div>}

        <div className="flex gap-2">
          <button className="btn-primary" disabled={!text || (preview?.count ?? 0) === 0} onClick={doImport}>
            <Icon name="upload" size={16} /> นำเข้า
          </button>
          <button className="btn-secondary" onClick={reset}>ยกเลิก</button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium">ประวัติการนำเข้า</h2>
        {importLog.length === 0 ? (
          <EmptyState title="ยังไม่มีประวัติ" icon="file" />
        ) : (
          <ul className="card-surface divide-y divide-slate-800 text-sm">
            {[...importLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((l) => (
              <li key={l.id} className="flex items-center justify-between p-3">
                <span>
                  {l.kind} {l.fileName ? `· ${l.fileName}` : ''} · เพิ่ม {l.added} อัปเดต {l.updated} ข้าม {l.skipped}
                  {l.errors.length > 0 && <span className="text-amber-400"> · {l.errors.length} ข้อผิดพลาด</span>}
                </span>
                <span className="text-xs text-slate-500">{formatDate(l.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
