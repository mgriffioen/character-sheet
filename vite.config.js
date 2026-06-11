import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site is served from /character-sheet/.
// Use a relative base in dev so `npm run dev` works at the root, and the
// repo subpath in production builds so assets resolve on GitHub Pages.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/character-sheet/' : '/',
  plugins: [react()],
  server: {
    host: true, // expose on the local network so a tablet can reach the dev server
  },
}))
