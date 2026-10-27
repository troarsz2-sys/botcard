import { useEffect, useState } from 'react'
import { getImage } from '../database/repositories'

// โหลดรูปที่แนบเองตาม imageLocalId แบบ on-demand แล้วสร้าง object URL
// ไม่โหลดรูปทั้งหมดเข้า memory
export function useImageUrl(imageLocalId?: string): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    let created: string | null = null
    if (!imageLocalId) {
      setUrl(null)
      return
    }
    setLoading(true)
    getImage(imageLocalId).then((img) => {
      if (!active) return
      if (img) {
        created = URL.createObjectURL(img.blob)
        setUrl(created)
      } else {
        setUrl(null)
      }
      setLoading(false)
    })
    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [imageLocalId])

  return { url, loading }
}
