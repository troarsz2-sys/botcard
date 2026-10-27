import { Icon, type IconName } from './Icon'

export function EmptyState({ title, message, icon = 'info' }: { title: string; message?: string; icon?: IconName }) {
  return (
    <div className="card-surface flex flex-col items-center justify-center p-10 text-center">
      <span className="mb-3 text-slate-600">
        <Icon name={icon} size={40} />
      </span>
      <h3 className="text-lg font-medium text-slate-200">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-400">{message}</p>}
    </div>
  )
}

export function Loading({ message = 'กำลังโหลด…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-10 text-slate-400">
      <span className="mr-2 animate-spin">
        <Icon name="refresh" size={20} />
      </span>
      {message}
    </div>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="card-surface flex items-start gap-2 border-red-800 p-4 text-red-200">
      <span className="mt-0.5 text-red-400">
        <Icon name="alert" size={18} />
      </span>
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function StorageNotice() {
  return (
    <div className="card-surface flex items-start gap-2 border-brand-700/60 bg-brand-700/10 p-3 text-sm text-slate-300">
      <span className="mt-0.5 text-brand-500">
        <Icon name="info" size={18} />
      </span>
      <span>
        ข้อมูลคลังการ์ดเก็บใน <b>เบราว์เซอร์เครื่องนี้</b> (IndexedDB) ไม่ได้ส่งไปเซิร์ฟเวอร์
        แนะนำให้ <b>สำรองข้อมูลเป็นไฟล์</b> บ่อย ๆ ที่หน้าส่งออก/สำรอง ข้อมูลไม่ได้แชร์ข้ามเบราว์เซอร์หรืออุปกรณ์
      </span>
    </div>
  )
}
