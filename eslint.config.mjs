import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores(['.local/**', '.next/**', 'out/**', 'dist/**', '.wrangler/**', 'src/generated/**', 'public/indexes/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts']),
])
