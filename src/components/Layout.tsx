import { NavLink, Outlet } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { StorageNotice } from './Feedback'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const NAV: NavItem[] = [
  { to: '/', label: 'แดชบอร์ด', icon: 'dashboard' },
  { to: '/catalog', label: 'แคตตาล็อก', icon: 'catalog' },
  { to: '/progress', label: 'ความคืบหน้า', icon: 'progress' },
  { to: '/wishlist', label: 'การ์ดที่อยากได้', icon: 'heart' },
  { to: '/sync', label: 'ซิงก์ข้อมูลการ์ด', icon: 'refresh' },
  { to: '/import', label: 'นำเข้า', icon: 'upload' },
  { to: '/export', label: 'ส่งออก/สำรอง', icon: 'download' },
  { to: '/manual', label: 'จัดการการ์ด', icon: 'plusCircle' },
  { to: '/settings', label: 'ตั้งค่า', icon: 'settings' },
]

function navCls({ isActive }: { isActive: boolean }): string {
  return [
    'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-brand-600 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ')
}

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <img src="./favicon.svg" alt="" className="h-8 w-8" />
          <div className="font-semibold text-slate-100">คลังการ์ด BOT</div>
          <div className="ml-2 text-xs text-slate-500 hidden sm:block">
            Battle of Talingchan Collection
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navCls}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-4">
          <StorageNotice />
        </div>
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-slate-500">
        แอปสำหรับใช้ส่วนตัว · ข้อมูลเก็บในเบราว์เซอร์เท่านั้น · ไม่ใช่เว็บไซต์ทางการของเกม
      </footer>
    </div>
  )
}
