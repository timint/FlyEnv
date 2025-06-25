import type { UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs';
import * as path from 'path'
import { ViteDevPort } from './vite.port'
import vueJsx from '@vitejs/plugin-vue-jsx'
import wasm from 'vite-plugin-wasm'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

const renderPath = path.resolve(__dirname, '../src/render/')
const sharePath = path.resolve(__dirname, '../src/shared/')
const helperPath = path.resolve(__dirname, '../src/helper/')
const langPath = path.resolve(__dirname, '../src/lang/')

const config: UserConfig = {
  base: './',
  plugins: [
    monacoEditorPlugin({}),
    wasm(),
    vue(),
    vueJsx()
  ],
  assetsInclude: ['**/*.node'],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      supported: {
        'top-level-await': true
      }
    },
    exclude: [
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
      'os',
      'child_process',
      'child-process-promise',
      'fs-extra',
      'node-forge'
    ]
  },
  root: renderPath,
  resolve: {
    alias: {
      '@': renderPath,
      '@shared': sharePath,
      '@helper': helperPath,
      '@lang': langPath
    }
  },
  css: {
    // CSS preprocessor options
    preprocessorOptions: {
      scss: {
        // Import var.scss globally so predefined variables can be used everywhere
        // Add ; at the end of the import path
        additionalData: '@import "@/components/Theme/Variables.scss";'
      }
    }
  }
}

const serverConfig: UserConfig = {
  server: {
    port: ViteDevPort,
    hmr: true
  },
  ...config
}

const serveConfig: UserConfig = {
  server: {
    port: ViteDevPort,
    open: true,
    hmr: true
  },
  ...config
}

const buildConfig: UserConfig = {
  mode: 'production',
  build: {
    outDir: '../../dist/render',
    assetsDir: 'static',
    target: 'esnext',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, '../src/render/index.html'),
        tray: path.resolve(__dirname, '../src/render/tray.html')
      },
      output: {
        entryFileNames: 'static/js/[name].[hash].js',
        chunkFileNames: 'static/js/[name].[hash].js',
        assetFileNames: 'static/[ext]/[name].[hash].[ext]',
        manualChunks(id) {
          console.debug('id: ', id)
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString()
          }
          return undefined
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  ...config
}

const mainConfig: UserConfig = {
  mode: 'production',
  build: {
    outDir: path.resolve(__dirname, '../../dist/electron'),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, '../src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: [
        'electron', 'path', 'fs', 'crypto', 'node:crypto', 'events', 'node:events', 'buffer', 'node:buffer', 'stream', 'node:stream', 'url', 'node:url', 'perf_hooks', 'node:perf_hooks', 'tls', 'node:tls', '@lydell/node-pty', 'fsevents', 'mock-aws-s3', 'aws-sdk', 'nock', '7zip-min-electron', 'nodejieba', 'os', 'child_process', 'child-process-promise', 'dtrace-provider', 'fs-extra', 'dns2', 'lodash', 'axios', 'iconv-lite', 'compressing', 'fast-xml-parser', 'source-map', 'source-map-js', 'entities', '@vue', 'vue', 'vue-i18n', 'estree-walker', 'serve-handler', 'electron-updater', 'js-yaml', '@lzwme/get-physical-address', '@electron/remote', 'electron-log', 'jszip', 'pako', 'electron-devtools-installer', 'punycode', 'p-timeout'
      ],
      output: {
        entryFileNames: 'main.js',
        format: 'cjs',
        dir: path.resolve(__dirname, '../../dist/electron')
      }
    },
    target: 'esnext',
    minify: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@lang': path.resolve(__dirname, '../src/lang'),
      '@shared': path.resolve(__dirname, '../src/shared')
    }
  }
}

const forkConfig: UserConfig = {
  mode: 'production',
  build: {
    outDir: path.resolve(__dirname, '../../dist/electron'),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, '../src/fork/index.ts'),
      formats: ['cjs'],
      fileName: () => 'fork.js'
    },
    rollupOptions: {
      external: [
        'electron', 'path', 'fs', 'crypto', 'node:crypto', 'events', 'node:events', 'buffer', 'node:buffer', 'stream', 'node:stream', 'url', 'node:url', 'perf_hooks', 'node:perf_hooks', 'tls', 'node:tls', '@lydell/node-pty', 'fsevents', 'mock-aws-s3', 'aws-sdk', 'nock', '7zip-min-electron', 'nodejieba', 'os', 'child_process', 'child-process-promise', 'dtrace-provider', 'fs-extra', 'dns2', 'lodash', 'axios', 'iconv-lite', 'compressing', 'fast-xml-parser', 'source-map', 'source-map-js', 'entities', '@vue', 'vue', 'vue-i18n', 'estree-walker', 'serve-handler', 'electron-updater', 'js-yaml', '@lzwme/get-physical-address', '@electron/remote', 'electron-log', 'jszip', 'pako', 'electron-devtools-installer', 'punycode', 'p-timeout'
      ],
      output: {
        entryFileNames: 'fork.js',
        format: 'cjs',
        dir: path.resolve(__dirname, '../../dist/electron')
      }
    },
    target: 'node16',
    minify: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@lang': path.resolve(__dirname, '../src/lang'),
      '@shared': path.resolve(__dirname, '../src/shared')
    }
  }
}

const mainDevConfig: UserConfig = {
  mode: 'development',
  build: {
    outDir: path.resolve(__dirname, '../../dist/electron'),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, '../src/main/index.dev.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: [
        'electron', 'path', 'fs', 'crypto', 'node:crypto', 'events', 'node:events', 'buffer', 'node:buffer', 'stream', 'node:stream', 'url', 'node:url', 'perf_hooks', 'node:perf_hooks', 'tls', 'node:tls', '@lydell/node-pty', 'fsevents', 'mock-aws-s3', 'aws-sdk', 'nock', '7zip-min-electron', 'nodejieba', 'os', 'child_process', 'child-process-promise', 'dtrace-provider', 'fs-extra', 'dns2', 'lodash', 'axios', 'iconv-lite', 'compressing', 'fast-xml-parser', 'source-map', 'source-map-js', 'entities', '@vue', 'vue', 'vue-i18n', 'estree-walker', 'serve-handler', 'electron-updater', 'js-yaml', '@lzwme/get-physical-address', '@electron/remote', 'electron-log', 'jszip', 'pako', 'electron-devtools-installer', 'punycode', 'p-timeout'
      ],
      output: {
        entryFileNames: 'main.js',
        format: 'cjs',
        dir: path.resolve(__dirname, '../../dist/electron')
      }
    },
    target: 'esnext',
    minify: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@lang': path.resolve(__dirname, '../src/lang'),
      '@shared': path.resolve(__dirname, '../src/shared')
    }
  }
}

const watchConfig = {
  build: {
    watch: {
      include: [
        'src/main/**',
        'src/fork/**',
        'static/**'
      ],
      exclude: [
        'node_modules/**',
        'dist/**'
      ]
    }
  }
}

export default {
  serveConfig,
  serverConfig,
  buildConfig,
  mainConfig,
  forkConfig,
  mainDevConfig,
  watchConfig
}
