import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Vira chamadas relativas em /usuarios e /despesas para o backend local
      '/usuarios': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/despesas': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/processar': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
