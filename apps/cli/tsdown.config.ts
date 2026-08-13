import { defineConfig } from 'tsdown'

/**
 * The dsh CLI ships its `bin` plus the profile boot API consumed by the
 * desktop host. The root tsdown builds only `lib/types/index.js`, so this
 * override points at those emitted TypeScript entry modules instead.
 * Declarations come from `tsc -b` (dts: false), matching every package.
 */
export default defineConfig({
  entry: ['lib/types/{bin,profile-boot}.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
