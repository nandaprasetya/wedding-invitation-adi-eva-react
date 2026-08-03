import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Copy assets from ../wedding-invitation-test/assets to public/assets if present locally
const srcAssets = path.join(__dirname, '../wedding-invitation-test/assets')
const destAssets = path.join(__dirname, 'public/assets')

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  fs.readdirSync(src).forEach(file => {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursiveSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  })
}

try {
  copyRecursiveSync(srcAssets, destAssets)
} catch (e) {
  console.warn('Could not copy external test assets:', e.message)
}

export default defineConfig({
  plugins: [react()],
  base: './',
})
