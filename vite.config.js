import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/onesignal': {
        target: 'https://onesignal.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/onesignal/, '/api/v1')
      }
    }
  }
})