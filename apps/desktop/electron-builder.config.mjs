/**
 * Desktop distribution configuration.
 *
 * GitHub Actions supplies DESKTOP_RELEASE_OWNER and DESKTOP_RELEASE_REPOSITORY
 * from the repository that created the release. The development fallback keeps
 * local package checks pointed at this checkout's public release channel.
 */
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const owner = process.env.DESKTOP_RELEASE_OWNER ?? '0verL1nk'
const repository = process.env.DESKTOP_RELEASE_REPOSITORY ?? 'deepseek-harness'
const version = process.env.DESKTOP_RELEASE_VERSION ?? manifest.version

/** @type {import('electron-builder').Configuration} */
export default {
  appId: 'ai.deepseek.harness',
  productName: 'DeepSeek Harness',
  executableName: 'deepseek-harness',
  artifactName: 'DeepSeek-Harness-${version}-${os}-${arch}.${ext}',
  extraMetadata: { version },
  asar: true,
  // The runtime dependency tree must stay real on disk: the profile module
  // fallback symlinks into it, and symlink traversal happens in the kernel,
  // below Electron's archive interception. `lib/` stays archived.
  asarUnpack: ['node_modules/**'],
  extraResources: [{
    from: '../web/public/favicon.svg',
    to: 'favicon.svg',
  }],
  electronLanguages: ['en-US', 'zh-CN'],
  npmRebuild: true,
  publish: [{
    provider: 'github',
    owner,
    repo: repository,
    releaseType: 'release',
  }],
  files: [
    'lib/**/*.js',
    'package.json',
    '!**/*.map',
    // Workspace TS sources are dead weight (lib/ ships the runtime), but the
    // negation must stay scoped: npm packages whose built output lives under
    // a src/ directory (koffi, @opentelemetry's build/src CJS trees) break
    // when excluded.
    '!node_modules/@deepseek-ai/*/src/**',
    '!node_modules/**/*.d.ts',
    '!node_modules/**/*.d.mts',
    '!node_modules/**/*.{md,markdown,ts,tsx}',
    '!node_modules/**/{test,tests,__tests__,coverage}/**',
  ],
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.developer-tools',
    icon: '../web/public/favicon.svg',
    // pnpm retains optional prebuilt native packages for both architectures.
    // @electron/universal still lipo-merges bytes that differ; this allows only
    // identical module artifacts (including unused opposite-arch packages) through.
    x64ArchFiles: 'Contents/Resources/app.asar.unpacked/node_modules/**',
  },
  win: {
    target: ['nsis'],
    icon: '../web/public/favicon.svg',
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Development',
    icon: '../web/public/favicon.svg',
    maintainer: 'DeepSeek AI <support@deepseek.com>',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
}
