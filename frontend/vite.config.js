import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://192.168.30.21:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api/v1')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,   // no sourcemap in production bundle
  },
  // Strip all console.* and debugger statements from the production bundle.
  // console logs remain fully visible during `npm run dev`.
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
