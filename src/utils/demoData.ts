import type { Card } from '../types'

// ข้อมูลตัวอย่าง (DEMO) — ไม่ใช่การ์ดจริง ใช้เพื่อทดลองเท่านั้น
// ชื่อ/รหัสที่ประดิษฐ์ขึ้นเอง ตั้งคำนำหน้า "(ตัวอย่าง)" และ set = DEMO เพื่อให้สังเกตได้ง่าย
// ลบได้จากหน้าตั้งค่า > "ลบข้อมูลตัวอย่างทั้งหมด"
export function createDemoCards(): Omit<Card, 'id' | 'createdAt' | 'updatedAt'>[] {
  const base = {
    set: 'DEMO',
    verified: false,
    attribution: 'ข้อมูลตัวอย่าง (ไม่ใช่การ์ดจริง)',
    description: 'การ์ดตัวอย่างสำหรับทดลอง ไม่ใช่การ์ดทางการ ลบได้จากหน้าตั้งค่า',
  }
  return [
    { code: 'DEMO-001', nameTh: '(ตัวอย่าง) นักรบตำนาน', nameEn: '(Demo) Legend Warrior', type: 'Avatar', rarity: 'SR', ...base },
    { code: 'DEMO-002', nameTh: '(ตัวอย่าง) เวทมนตร์ป้องกัน', nameEn: '(Demo) Guard Magic', type: 'Magic', rarity: 'C', ...base },
    { code: 'DEMO-003', nameTh: '(ตัวอย่าง) ชีวิตส่งเสริม', nameEn: '(Demo) Life Boost', type: 'Life', rarity: 'R', ...base },
    { code: 'DEMO-004', nameTh: '(ตัวอย่าง) สร้างปราการ', nameEn: '(Demo) Build Fort', type: 'Construct', rarity: 'UR', ...base },
    { code: 'DEMO-005', nameTh: '(ตัวอย่าง) อวตารสีแดง', nameEn: '(Demo) Red Avatar', type: 'Avatar', rarity: 'SR', variant: 'พิมพ์พิเศษ', ...base },
    { code: 'DEMO-006', nameTh: '(ตัวอย่าง) เวทมนตร์โจมตี', nameEn: '(Demo) Attack Magic', type: 'Magic', rarity: 'C', ...base },
  ]
}
