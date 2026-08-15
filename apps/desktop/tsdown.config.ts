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
})
