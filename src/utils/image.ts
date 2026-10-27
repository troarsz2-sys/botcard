import type { StoredImage } from '../types'
import { generateId, nowIso } from './id'

// แปลง Blob -> data URL (base64) โดยไม่ใช้ FileReader เพื่อให้ทำงานใน node ได้ด้วย
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const base64 = btoa(bin)
  return `data:${blob.type || 'application/octet-stream'};base64,${base64}`
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!m) throw new Error('รูปแบบ data URL ไม่ถูกต้อง')
  const mime = m[1]
  const base64 = m[2]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function fileToStoredImage(file: Blob): Promise<StoredImage> {
  return {
    id: generateId(),
    blob: file,
    mime: file.type || 'application/octet-stream',
    createdAt: nowIso(),
  }
}

export interface BackupImageOut {
  id: string
  mime: string
  data: string
}

export async function storedImageToBackup(img: StoredImage): Promise<BackupImageOut> {
  return { id: img.id, mime: img.mime, data: await blobToDataUrl(img.blob) }
}
