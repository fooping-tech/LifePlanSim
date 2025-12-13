import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const alias = {
  '@models': fileURLToPath(new URL('./src/models', import.meta.url)),
  '@simulation': fileURLToPath(new URL('./src/simulation', import.meta.url)),
  '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
  '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
  '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
  '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
}

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version?: string }

const appVersion = packageJson.version ?? '0.0.0'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    rollupOptions: {
      plugins: [
        {
          name: 'emit-version-json',
          generateBundle() {
            const payload = {
              version: appVersion,
              buildId: process.env.VITE_BUILD_ID ?? null,
              builtAt: new Date().toISOString(),
            }
            this.emitFile({
              type: 'asset',
              fileName: 'version.json',
              source: JSON.stringify(payload, null, 2),
            })
          },
        },
      ],
    },
  },
  resolve: {
    alias,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
  },
})
