import fs from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'

await build({
  entryPoints: ['renderer/dashboard.jsx'],
  outdir: 'public/compiled',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'chrome130',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.woff2': 'file', '.woff': 'file' },
  assetNames: 'assets/[name]-[hash]'
})

const licenses = 'public/compiled/licenses'
await fs.mkdir(licenses, { recursive: true })
for (const pkg of ['react', 'react-dom', 'scheduler', '@mdi/js', '@fontsource/roboto']) {
  await fs.copyFile(path.join('node_modules', pkg, 'LICENSE'), path.join(licenses, pkg.replace('/', '-') + '.txt'))
}
