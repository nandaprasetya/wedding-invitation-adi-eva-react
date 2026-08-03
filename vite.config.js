import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Custom Vite plugin to serve & copy assets from wedding-invitation-test
const copyAssetsPlugin = () => ({
  name: 'serve-test-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const cleanUrl = req.url.split('?')[0];
      if (cleanUrl.includes('/assets/')) {
        const assetsSubPath = cleanUrl.substring(cleanUrl.indexOf('/assets/'));
        const filePath = path.join(__dirname, '../wedding-invitation-test', assetsSubPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.mp3': 'audio/mpeg',
            '.svg': 'image/svg+xml'
          };
          res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
          return fs.createReadStream(filePath).pipe(res);
        }
      }
      next();
    });
  },
  closeBundle() {
    const src = path.join(__dirname, '../wedding-invitation-test/assets');
    const dest = path.join(__dirname, 'dist/assets');
    function copyRecursive(from, to) {
      if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
      fs.readdirSync(from).forEach(file => {
        const s = path.join(from, file);
        const d = path.join(to, file);
        if (fs.statSync(s).isDirectory()) copyRecursive(s, d);
        else fs.copyFileSync(s, d);
      });
    }
    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
    }
  }
})

export default defineConfig({
  plugins: [react(), copyAssetsPlugin()],
})
