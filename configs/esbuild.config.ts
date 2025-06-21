import type { BuildOptions } from 'esbuild'

const external = [
  'electron',
  'path',
  'fs',
  '@lydell/node-pty',
  'fsevents',
  'mock-aws-s3',
  'aws-sdk',
  'nock',
  '7zip-min-electron',
  'dohdec',
  'nodejieba',
  'os',
  'child_process',
  'child-process-promise',
  'dtrace-provider',
  'fs-extra',
  'dns2',
  'lodash',
  'axios',
  'iconv-lite',
  'compressing',
  'fast-xml-parser',
  'source-map',
  'source-map-js',
  'entities',
  '@vue',
  'vue',
  'vue-i18n',
  'estree-walker',
  'serve-handler',
  'electron-updater',
  'js-yaml',
  '@lzwme/get-physical-address',
  '@electron/remote',
  'electron-log',
  'jszip',
  'pako',
  'electron-devtools-installer',
  'punycode',
  'p-timeout'
]

const dev: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/main/index.dev.ts'],
  outfile: 'dist/electron/main.js',
  minify: false,
  bundle: true,
  external: external,
  plugins: []
}

const dist: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/electron/main.js',
  minify: true,
  bundle: true,
  external: external,
  plugins: [],
  drop: ['debugger', 'console']
}

const devFork: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/fork/index.ts'],
  outfile: 'dist/electron/fork.js',
  minify: false,
  bundle: true,
  external,
  plugins: []
}

const distFork: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/fork/index.ts'],
  outfile: 'dist/electron/fork.js',
  minify: true,
  bundle: true,
  external,
  plugins: [],
  drop: ['debugger', 'console']
}

export default {
  dev,
  dist,
  devFork,
  distFork
}
