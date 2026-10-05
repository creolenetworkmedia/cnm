import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative assets keep the site working both at
  // creolenetworkmedia.github.io/cnm/ and the custom domain.
  base: './',
  build: { sourcemap: true }
})
