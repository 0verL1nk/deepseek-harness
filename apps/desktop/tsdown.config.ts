import { defineConfig } from 'tsdown'

/** Bundle the Electron main, preload, and isolated local-Web host from emitted host JavaScript. */
export default defineConfig({
  entry: ['lib/types/{main,backend,preload,updates,i18n}.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  // The `electron` specifier must reach the runtime: Electron's main process
  // intercepts it to serve the built-in API, while bundling would inline the
  // npm path-shim package whose CommonJS `__dirname` access crashes the ES
  // module chunk at first import.
  external: ['electron'],
})
