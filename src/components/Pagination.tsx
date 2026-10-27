import { Icon } from './Icon'

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-slate-400">
      <span>
        หน้า {page} / {totalPages} ({total.toLocaleString('th-TH')} รายการ)
      </span>
      <div className="flex gap-1">
        <button
          className="btn-secondary"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="หน้าก่อนหน้า"
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <button
          className="btn-secondary"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="หน้าถัดไป"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  )
}
