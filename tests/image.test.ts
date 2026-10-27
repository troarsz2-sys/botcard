import { describe, it, expect } from 'vitest'
import { blobToDataUrl, dataUrlToBlob } from '../src/utils/image'

describe('image conversion', () => {
  it('round-trip blob <-> dataUrl', async () => {
    const original = new Blob([new Uint8Array([72, 105])], { type: 'text/plain' }) // "Hi"
    const url = await blobToDataUrl(original)
    expect(url.startsWith('data:text/plain;base64,')).toBe(true)
    const back = dataUrlToBlob(url)
    expect(back.type).toBe('text/plain')
    const buf = new Uint8Array(await back.arrayBuffer())
    expect(Array.from(buf)).toEqual([72, 105])
  })
  it('dataUrl ผิดรูปแบบ -> throw', () => {
    expect(() => dataUrlToBlob('not-a-data-url')).toThrow()
  })
})
