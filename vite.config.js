import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

const cloudflareSpaPlugin = () => ({
  name: 'cloudflare-spa-fallback',
  closeBundle() {
    const indexHtml = path.join(__dirname, 'dist/index.html')
    const fourOhFourHtml = path.join(__dirname, 'dist/404.html')
    if (fs.existsSync(indexHtml)) {
      fs.copyFileSync(indexHtml, fourOhFourHtml)
    }
  }
})

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflareSpaPlugin()],
  base: '/',
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
