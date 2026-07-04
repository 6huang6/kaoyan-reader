import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base path: 默认 GitHub Pages (/kaoyan-reader/)，Vercel 设 VITE_BASE_PATH=/
const base = process.env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : '/kaoyan-reader/')

export default defineConfig({
  base,
  plugins: [react()],
})
