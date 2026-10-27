import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base: './' ทำให้สามารถ deploy ลง GitHub Pages (project site) ได้โดยไม่ต้องกำหนด path ล่วงหน้า
// และยังเปิดผ่านไฟล์ในเครื่องได้ด้วย
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
})
