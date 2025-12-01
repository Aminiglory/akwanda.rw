import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Keep sourcemaps in development only to reduce production bundle size
    sourcemap: mode === 'development',
  },
}))
