import type { Plugin } from 'vite'
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let hasCopyed = false

export const ViteStaticCopyPlugin: () => Plugin = () => {
  return {
    name: 'vite-static-copy-plugin',
    buildEnd: async () => {
      if (hasCopyed) {
        return
      }

      const fromDir = path.resolve(__dirname, '../static/')
      const targetDir = path.resolve(__dirname, '../dist/electron/static/')
      fs.mkdirSync(targetDir, { recursive: true })

      switch (process.platform) {

        case 'darwin':
          fs.cpSync(path.join(fromDir, 'sh/MacOs'), path.join(targetDir, 'sh'), { recursive: true })
          fs.cpSync(path.join(fromDir, 'tmpl/MacOs'), path.join(targetDir, 'tmpl'), { recursive: true })
          fs.cpSync(path.join(fromDir, 'zip/MacOs'), path.join(targetDir, 'zip'), { recursive: true })
          break

        case 'win32':
          fs.cpSync(path.join(fromDir, 'sh/Windows'), path.join(targetDir, 'sh'), { recursive: true })
          fs.cpSync(path.join(fromDir, 'tmpl/Windows'), path.join(targetDir, 'tmpl'), { recursive: true })
          fs.cpSync(path.join(fromDir, 'zip/Windows'), path.join(targetDir, 'zip'), { recursive: true })
          break

        case 'linux':
          fs.cpSync(path.join(fromDir, 'sh/Linux'), path.join(targetDir, 'sh'), { recursive: true })
          fs.cpSync(path.join(fromDir, 'tmpl/Linux'), path.join(targetDir, 'tmpl'), { recursive: true })
          fs.cpSync(path.join(fromDir, 'zip/Linux'), path.join(targetDir, 'zip'), { recursive: true })
          break

        default:
          throw new Error(`Unsupported platform: ${process.platform}`)
      }

      hasCopyed = true
      console.log('Static files copied successfully!')
    }
  }
}
