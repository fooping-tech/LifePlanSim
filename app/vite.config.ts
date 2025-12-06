import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const alias = {
  '@models': fileURLToPath(new URL('./src/models', import.meta.url)),
  '@simulation': fileURLToPath(new URL('./src/simulation', import.meta.url)),
  '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
  '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
  '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
  '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
  },
})
