import type { UserConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import * as path from 'path'
import { ViteDevPort } from './vite.port'
import vueJsx from '@vitejs/plugin-vue-jsx'
import wasm from 'vite-plugin-wasm-esm'
import monacoEditorPlugin from 'vite-plugin-monaco-editor-esm'
import { fileURLToPath } from 'url'
import Checker from 'vite-plugin-checker';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const renderPath = path.resolve(__dirname, '../src/render/')
const sharePath = path.resolve(__dirname, '../src/shared/')
const langPath = path.resolve(__dirname, '../src/lang/')

console.log('renderPath: ', renderPath)
console.log('sharePath: ', sharePath)

const config: UserConfig = {
  base: './',
  plugins: [
    Checker({ typescript: true }),
    monacoEditorPlugin({}),
    wasm([]),
    vue(),
    vueJsx(),
  ],
  assetsInclude: [
    '**/*.node'
  ],
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
      'node-pty',
      'nock',
      '7zip-min-electron',
      'tangerine',
      'os',
      'child_process',
      'node-forge'
    ]
  },
  root: renderPath,
  resolve: {
    alias: {
      '@': renderPath,
      '@shared': sharePath,
      '@lang': langPath
    }
  },
  css: {
    // CSS preprocessor options
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
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
          console.log('id: ', id)
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

export default {
  serveConfig,
  serverConfig,
  buildConfig
}
