import { useState } from 'react'
import type { Card } from '../types'
import { useImageUrl } from '../hooks/useImage'
import { Icon } from './Icon'

// แสดงภาพการ์ด: รูปแนบเอง (local) > URL ภายนอก > ภาพแทน
export function CardImage({ card, className = '' }: { card: Card; className?: string }) {
  const [imgError, setImgError] = useState(false)
  const { url, loading } = useImageUrl(card.imageLocalId)

  const placeholder = (
    <div className={`flex items-center justify-center bg-slate-800 text-slate-600 ${className}`}>
      <Icon name="image" size={32} />
    </div>
  )

  if (card.imageLocalId) {
    if (loading) return <div className={`animate-pulse bg-slate-800 ${className}`} />
    if (url) return <img src={url} alt={card.nameTh} className={className} />
    return placeholder
  }
  if (card.imageUrl && !imgError) {
    return (
      <img
        src={card.imageUrl}
        alt={card.nameTh}
        className={className}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    )
  }
  return placeholder
}
