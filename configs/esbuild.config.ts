import type { BuildOptions } from 'esbuild'

const external = [
  '@electron/remote',
  '@lzwme/get-physical-address',
  '@usebruno/node-machine-id',
  '@vue',
  '7zip-min-electron',
  'axios',
  'child_process',
  'compressing',
  'dns2',
  'dohdec',
  'electron',
  'electron-devtools-installer',
  'electron-log',
  'electron-updater',
  'entities',
  'estree-walker',
  'fast-xml-parser',
  'fs',
  'hpagent',
  'iconv-lite',
  'ip',
  'js-yaml',
  'jszip',
  'lodash',
  'nock',
  'node-pty',
  'nodejieba',
  'os',
  'pako',
  'path',
  'serve-handler',
  'source-map',
  'source-map-js',
  'tangerine',
  'vue',
  'vue-i18n',
  'electron-is',
  'electron-localshortcut',
  'http',
  'https',
  'net',
  'tls',
]

const dev: BuildOptions = {
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  entryPoints: ['src/main/index.dev.ts'],
  outfile: 'dist/electron/main.js',
  minify: false,
  bundle: true,
  external: external,
}

const dist: BuildOptions = {
  platform: 'node',
  target: 'esnext',
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/electron/main.js',
  minify: true,
  bundle: true,
  external: external,
  drop: ['debugger', 'console']
}

const devFork: BuildOptions = {
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  entryPoints: ['src/fork/index.ts'],
  outfile: 'dist/electron/fork.js',
  minify: false,
  bundle: true,
  external,
}

const distFork: BuildOptions = {
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  entryPoints: ['src/fork/index.ts'],
  outfile: 'dist/electron/fork.js',
  minify: true,
  bundle: true,
  external,
  drop: ['debugger', 'console']
}

export default {
  dev,
  dist,
  devFork,
  distFork,
}
