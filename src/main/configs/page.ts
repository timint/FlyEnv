import is from 'electron-is'
import path from 'path'
import { ViteDevPort } from '../../../configs/vite.port'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))

const index = path.resolve(__dirname, '../render/index.html')
const tray = path.resolve(__dirname, '../render/tray.html')

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
      minHeight: 600
    },
    bindCloseToHide: true,
    url: is.dev() ? `http://localhost:${ViteDevPort}` : index
  },
  tray: {
    attrs: {},
    bindCloseToHide: true,
    url: is.dev() ? `http://localhost:${ViteDevPort}/tray.html` : tray
  }
}

export default options
