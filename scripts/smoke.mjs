// Bundle the JSX SSR entry with esbuild, then run it. Keeps the smoke test
// runnable with plain `node` (no JSX loader needed at runtime).
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { rmSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const outfile = join(here, '.ssr.bundle.mjs')

await build({
  entryPoints: [join(here, 'ssrEntry.jsx')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  outfile,
  logLevel: 'error',
  // jsdom is a Node-only package (reads files via __dirname); keep it external.
  external: ['jsdom'],
  // React's server bundle uses CJS require() for Node builtins; provide one.
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
})

try {
  const mod = await import(pathToFileURL(outfile).href)
  await mod.run()
  rmSync(outfile, { force: true })
  // esbuild keeps a background service alive; exit explicitly so the process
  // (and CI step) terminates instead of hanging on open handles.
  process.exit(0)
} catch (err) {
  rmSync(outfile, { force: true })
  console.error(err)
  process.exit(1)
}
