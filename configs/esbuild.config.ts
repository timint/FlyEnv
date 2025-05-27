import type { BuildOptions } from 'esbuild'
import { BuildPlugin } from './plugs.build'
const external = [
  '7zip-min-electron',
  '@electron/remote',
  '@lzwme/get-physical-address',
  '@vue',
  'aws-sdk',
  'axios',
  'child-process-promise',
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
  'fs-extra',
  'fsevents',
  'iconv-lite',
  'ip',
  'js-yaml',
  'jszip',
  'lodash',
  'mock-aws-s3',
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
]

const dev: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/main/index.dev.ts'],
  outfile: 'dist/electron/main.js',
  minify: false,
  bundle: true,
  external: external,
  plugins: [BuildPlugin()]
}

const dist: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/electron/main.js',
  minify: true,
  bundle: true,
  external: external,
  plugins: [BuildPlugin()],
  drop: ['debugger', 'console']
}

const devFork: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/fork/index.ts'],
  outfile: 'dist/electron/fork.js',
  minify: false,
  bundle: true,
  external,
  plugins: [BuildPlugin()]
}

const distFork: BuildOptions = {
  platform: 'node',
  entryPoints: ['src/fork/index.ts'],
  outfile: 'dist/electron/fork.js',
  minify: true,
  bundle: true,
  external,
  plugins: [BuildPlugin()],
  drop: ['debugger', 'console']
}

export default {
  dev,
  dist,
  devFork,
  distFork
}
