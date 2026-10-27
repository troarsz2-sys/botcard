// ค่าที่ไม่ซ้ำและเรียงแล้ว
export function distinctStrings(values: (string | undefined | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))].sort((a, b) =>
    a.localeCompare(b)
  )
}

// ลำดับความหายาก (ใช้ตอนเรียง)
export const RARITY_ORDER = ['C', 'R', 'SR', 'UR', 'PR', 'CBR', 'SCR', 'USEC']

export function rarityRank(r: string | undefined): number {
  if (!r) return 9999
  const i = RARITY_ORDER.indexOf(r)
  return i === -1 ? 1000 + r.localeCompare('') : i
}
