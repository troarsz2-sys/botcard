import { describe, it, expect } from 'vitest'
import {
  parseCommunityTs,
  transformCommunityCards,
  communitySetUrl,
  COMMUNITY_SETS,
  type RawCommunityCard,
} from '../src/utils/syncTransform'

// ตัวอย่าง source จาก kerlos repo (ตัดสั้นลงสำหรับทดสอบ)
const SAMPLE_TS = `
import { Card } from "@/src/types/cards";

export const CARDS_BT01: Card[] = [
  {
    name: "นนทก นิ้วเพชร",
    type: "Avatar",
    soi: 1,
    print: "BT01-001",
    rare: "UR",
    mainEffect: "อัตโนมัติ เมื่อโจมตี Avatar {symbol เทพ} : ทำลาย Avatar",
    cost: 3,
    gem: 2,
    power: 3,
    symbol: "ยักษ์",
    color: "แดง",
  },
  {
    name: "นนทก นิ้วเพชร",
    type: "Avatar",
    soi: 1,
    print: "BT01-001",
    rare: "SCR",
    mainEffect: "อัตโนมัติ เมื่อโจมตี Avatar {symbol เทพ} : ทำลาย Avatar",
    cost: 3,
    gem: 2,
    power: 3,
    symbol: "ยักษ์",
    color: "แดง",
  },
  {
    name: "ปื้ด เด็กเปรต",
    type: "Avatar",
    soi: 1,
    print: "BT01-002",
    rare: "SR",
    mainEffect: "ต่อเนื่อง เพิ่ม POWER ตามจำนวน LIFE Card",
    cost: 4,
    gem: 0,
    power: 0,
    symbol: "เปรต",
    color: "แดง",
  },
  {
    name: "เมตตาระยะยาว",
    type: "Magic",
    soi: 1,
    print: "BT01-036",
    rare: "UR",
    mainEffect: "ทำลาย Avatar บนสนามอีกฝ่ายทุกใบ",
    subtype: "Normal",
    cost: 0,
    symbol: "เทพ",
  },
  {
    name: "ไม่นะ โปโป้ !",
    type: "Life",
    soi: 1,
    print: "BT01-051",
    rare: "C",
    mainEffect: "เมื่อถูกหงายจากการโจมตี : ในมain phase ถัดไป จั่วการ์ด 1 ใบ",
    favorText: "ไอ้เลวเอ้ย!",
    dropRate: "3.00%",
  },
];
`

describe('parseCommunityTs', () => {
  it('แยก object ได้ถูกต้องจำนวน', () => {
    const cards = parseCommunityTs(SAMPLE_TS)
    expect(cards.length).toBe(5)
  })
  it('ดึง print และ name ได้', () => {
    const cards = parseCommunityTs(SAMPLE_TS)
    expect(cards[0].print).toBe('BT01-001')
    expect(cards[0].name).toBe('นนทก นิ้วเพชร')
  })
  it('ดึง rarity ได้', () => {
    const cards = parseCommunityTs(SAMPLE_TS)
    expect(cards[0].rare).toBe('UR')
    expect(cards[1].rare).toBe('SCR')
  })
  it('ดึง type Magic ได้', () => {
    const cards = parseCommunityTs(SAMPLE_TS)
    const magic = cards.find(c => c.print === 'BT01-036')
    expect(magic?.type).toBe('Magic')
    expect(magic?.subtype).toBe('Normal')
  })
  it('ดึง type Life ได้', () => {
    const cards = parseCommunityTs(SAMPLE_TS)
    const life = cards.find(c => c.print === 'BT01-051')
    expect(life?.type).toBe('Life')
  })
  it('return [] เมื่อไม่มี array', () => {
    expect(parseCommunityTs('// ไม่มีข้อมูล')).toEqual([])
  })
  it('ดึง number fields ได้ (cost, gem, power)', () => {
    const cards = parseCommunityTs(SAMPLE_TS)
    expect(cards[0].cost).toBe(3)
    expect(cards[0].gem).toBe(2)
    expect(cards[0].power).toBe(3)
  })
})

describe('transformCommunityCards', () => {
  const raw: RawCommunityCard[] = [
    { name: 'นนทก นิ้วเพชร', print: 'BT01-001', type: 'Avatar', rare: 'UR', soi: 1, mainEffect: 'test', cost: 3, gem: 2, power: 3, symbol: 'ยักษ์', color: 'แดง' },
    { name: 'ปื้ด เด็กเปรต', print: 'BT01-002', type: 'Avatar', rare: 'SR', soi: 1, mainEffect: '', cost: 4, gem: 0, power: 0, symbol: 'เปรต', color: 'แดง' },
    { name: 'no print card', print: '', type: 'Magic', rare: 'C', soi: 1 },
    { name: '', print: 'BT01-003', type: 'Avatar', rare: 'C', soi: 1 },
    { name: 'เมตตา', print: 'BT01-036', type: 'Magic', rare: 'UR', soi: 1, mainEffect: 'ทำลาย', subtype: 'Normal', cost: 0, symbol: 'เทพ' },
  ]

  it('แปลงการ์ดที่ถูกต้อง', () => {
    const { cards } = transformCommunityCards(raw)
    // 3 valid (BT01-001, BT01-002, BT01-036), 2 invalid (empty print / empty name)
    expect(cards.length).toBe(3)
  })

  it('นับ skipped สำหรับรายการไม่มี print/name', () => {
    const { skipped } = transformCommunityCards(raw)
    expect(skipped).toBe(2)
  })

  it('code = print field', () => {
    const { cards } = transformCommunityCards(raw)
    expect(cards[0].code).toBe('BT01-001')
  })

  it('set ถูก infer จาก print code', () => {
    const { cards } = transformCommunityCards(raw)
    expect(cards[0].set).toBe('BT01')
  })

  it('verified = false เสมอ (ข้อมูลชุมชน)', () => {
    const { cards } = transformCommunityCards(raw)
    for (const c of cards) expect(c.verified).toBe(false)
  })

  it('มี attribution และ sourceUrl', () => {
    const { cards } = transformCommunityCards(raw)
    expect(cards[0].attribution).toBeTruthy()
    expect(cards[0].sourceUrl).toContain('github.com')
  })

  it('description มีข้อมูล stats สำหรับ Avatar', () => {
    const { cards } = transformCommunityCards(raw)
    const avatar = cards.find(c => c.code === 'BT01-001')
    expect(avatar?.description).toContain('Cost 3')
    expect(avatar?.description).toContain('Gem 2')
    expect(avatar?.description).toContain('Power 3')
  })

  it('description มี subtype สำหรับ Magic', () => {
    const { cards } = transformCommunityCards(raw)
    const magic = cards.find(c => c.code === 'BT01-036')
    expect(magic?.description).toContain('Magic Normal')
  })

  it('สร้าง errors สำหรับรายการไม่ถูกต้อง', () => {
    const { errors } = transformCommunityCards(raw)
    expect(errors.length).toBe(2)
  })

  it('ข้อมูลว่างเปล่า return ว่าง ไม่ error', () => {
    const { cards, skipped, errors } = transformCommunityCards([])
    expect(cards).toEqual([])
    expect(skipped).toBe(0)
    expect(errors).toEqual([])
  })
})

describe('ตรวจสอบ field ข้อมูลที่หายไป', () => {
  it('การ์ดที่มีเฉพาะ print+name ยังแปลงได้', () => {
    const raw: RawCommunityCard[] = [{ name: 'การ์ดทดสอบ', print: 'TST-001', type: 'Avatar', rare: 'C', soi: 1 }]
    const { cards } = transformCommunityCards(raw)
    expect(cards[0].code).toBe('TST-001')
    expect(cards[0].nameTh).toBe('การ์ดทดสอบ')
  })
  it('ไม่ทำลายข้อมูลฐาน', () => {
    const raw: RawCommunityCard[] = [
      { name: 'A', print: 'SET-001', type: 'Avatar', rare: 'R', soi: 1 },
      { name: 'B', print: 'SET-002', type: 'Magic', rare: 'C', soi: 1 },
    ]
    const { cards } = transformCommunityCards(raw)
    expect(cards).toHaveLength(2)
    expect(cards.map(c => c.code)).toEqual(['SET-001', 'SET-002'])
  })
})

describe('communitySetUrl', () => {
  it('สร้าง URL ถูกต้อง', () => {
    expect(communitySetUrl('bt01')).toBe(
      'https://raw.githubusercontent.com/kerlos/battle-of-talinchan-cards/main/src/cards/bt01.ts'
    )
  })
})

describe('COMMUNITY_SETS', () => {
  it('มีชุดที่รู้จักครบ', () => {
    expect(COMMUNITY_SETS).toContain('bt01')
    expect(COMMUNITY_SETS).toContain('bt11')
    expect(COMMUNITY_SETS).toContain('sd01')
    expect(COMMUNITY_SETS).toContain('cc01')
    expect(COMMUNITY_SETS).toContain('sl01')
    expect(COMMUNITY_SETS.length).toBeGreaterThanOrEqual(20)
  })
})
