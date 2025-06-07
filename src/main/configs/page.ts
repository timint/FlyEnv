import is from 'electron-is'
import { dirname, resolve } from 'path'
import { ViteDevPort } from '../../../configs/vite.port'
import { fileURLToPath } from 'url'

import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const index = resolve(__dirname, '../renderer/index.html')
const tray = resolve(__dirname, '../renderer/tray.html')

interface PageOptions {
  [key: string]: {
    attrs: BrowserWindowConstructorOptions
    bindCloseToHide: boolean
    url: string
  }
}

const options: PageOptions = {
  index: {
    attrs: {
      title: 'FlyEnv',
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#262D3D',
      transparent: false
    },
    bindCloseToHide: true,
    url: is.dev() ? `http://localhost:${ViteDevPort}` : `file://${index}`
  },
  tray: {
    attrs: {},
    bindCloseToHide: true,
    url: is.dev() ? `http://localhost:${ViteDevPort}/tray.html` : `file://${tray}`
  }
}

export default options
