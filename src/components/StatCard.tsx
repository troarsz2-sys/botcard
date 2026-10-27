import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = 'default',
}: {
  label: string
  value: ReactNode
  icon: IconName
  hint?: string
  accent?: 'default' | 'green' | 'amber' | 'pink' | 'blue'
}) {
  const accentCls =
    accent === 'green'
      ? 'text-emerald-400'
      : accent === 'amber'
      ? 'text-amber-400'
      : accent === 'pink'
      ? 'text-pink-400'
      : accent === 'blue'
      ? 'text-sky-400'
      : 'text-brand-500'
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={accentCls}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}
