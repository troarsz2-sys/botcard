// จัดการจำนวน ไม่ให้ติดลบ

export function clampNonNegative(n: number | undefined | null): number {
  if (n == null || !Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export function incQuantity(current: number, step = 1): number {
  return clampNonNegative(current) + Math.max(1, Math.floor(step))
}

export function decQuantity(current: number, step = 1): number {
  return Math.max(0, clampNonNegative(current) - Math.max(1, Math.floor(step)))
}
