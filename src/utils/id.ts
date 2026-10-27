// สร้าง id และจัดรูปแบบ

export function generateId(): string {
  try {
    const c = globalThis.crypto as Crypto | undefined
    if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  } catch {
    // ใช้ fallback ด้านล่าง
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export function nowIso(): string {
  return new Date().toISOString()
}

// ทำให้รหัสการ์ดเป็นตัวพิมพ์ใหญ่และตัดช่องว่าง เพื่อใช้ตรวจซ้ำ
export function normalizeCode(code: string | undefined | null): string {
  return (code ?? '').trim().toUpperCase()
}
