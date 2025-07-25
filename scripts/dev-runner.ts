import { createServer, build } from 'vite'
import { spawn, ChildProcess } from 'child_process'
import _fs from 'fs-extra'
import _path from 'path'
import _md5 from 'md5'

import viteConfig from '../configs/vite.config'
import { DoFix } from './fix'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { createRequire } from 'node:module'
import { ElectronKill, ElectronKillWin } from './electron-process-kill'
import { isLinux, isMacOS, isWindows } from '../src/shared/utils'

const require = createRequire(import.meta.url)

global.require = require

const __dirname = dirname(fileURLToPath(import.meta.url))

const { copySync } = _fs

let restart = false
let electronProcess: ChildProcess | null

async function launchViteDevServer(openInBrowser = false) {
  const config = openInBrowser ? viteConfig.serveConfig : viteConfig.serverConfig
  const server = await createServer({
    ...config,
    configFile: false
  })
  await server.listen()
}

let building = false
const buildCallback: any = []

function buildMainProcess() {
  return new Promise(async (resolve, reject) => {
    if (building) {
      buildCallback.push({
        resolve,
        reject
      })
      return
    }
    building = true
    await DoFix()
    let promise: Promise<any> | undefined
    if (isMacOS() || isLinux()) {
      console.log('isMacOS || isLinux !!!')
      const config = viteConfig.vite.mac
      promise = Promise.all([
        build(config.dev),
        build(config.devFork),
        build(config.devHelper),
        ElectronKill(electronProcess)
      ])
    } else if (isWindows()) {
      console.log('isWindows !!!')
      const config = viteConfig.vite.win
      promise = Promise.all([
        build(config.dev),
        build(config.devFork),
        build(config.devHelper),
        ElectronKillWin()
      ])
    }
    if (!promise) {
      building = false
      buildCallback.forEach((b: any) => {
        b.reject(new Error('No PLATFORM provided'))
      })
      buildCallback.splice(0)
      reject(new Error('No PLATFORM provided'))
      return
    }
    promise
      .then(() => {
        building = false
        buildCallback.forEach((b: any) => {
          b.resolve(true)
        })
        buildCallback.splice(0)
        resolve(true)
      })
      .catch((e) => {
        console.log('[buildMainProcess] Error', e)
        building = false
        buildCallback.forEach((b: any) => {
          b.reject(e)
        })
        buildCallback.splice(0)
        reject(e)
      })
  })
}

function runElectronApp() {
  // Use the correct file path for development
  const electronEntryPoint = 'dist/electron/main.dev.mjs'
  console.log(`Starting Electron with entry point: ${electronEntryPoint}`)

  electronProcess = spawn(`electron --inspect=5858 ${electronEntryPoint}`, {
    stdio: 'pipe',
    shell: isWindows()
  })
  electronProcess?.stderr?.on('data', (data) => {
    console.error('[electronProcess]', data.toString())
  })

  electronProcess?.stdout?.on('data', (data) => {
    console.log('[electronProcess]', data.toString())
  })

  electronProcess.on('error', (err) => {
    console.error(`[electronProcess] spawn error: ${err.message}`)
  })

  electronProcess.on('close', (code) => {
    console.log(`[electronProcess] closed with code: ${code}`)
    if (restart) {
      restart = false
      runElectronApp()
    }
  })
}

Promise.all([launchViteDevServer(), buildMainProcess()])
  .then(() => {
    // Copy static files for initial run (the plugin handles this during build)
    const staticPath = _path.resolve(__dirname, '../static/')
    const staticDest = _path.resolve(__dirname, '../dist/electron/static/')
    copySync(staticPath, staticDest)
    console.log('Initial static files copied')

    runElectronApp()
  })
  .catch((err) => {
    console.log('vite or build error: ')
    console.error(err)
  })

// Watch for changes in main files
let preveMd5 = ''
let fsWait = false
const next = (base: string, file?: string | null) => {
  if (file) {
    if (fsWait) return

    const filePath = _path.join(base, file)

    // Check if the path exists and is a file (not a directory)
    if (!_fs.existsSync(filePath) || !_fs.statSync(filePath).isFile()) {
      return
    }

    const currentMd5 = _md5(_fs.readFileSync(filePath)) as string
    if (currentMd5 == preveMd5) {
      return
    }
    fsWait = true
    preveMd5 = currentMd5
    console.log(`${file} file has been updated`)
    restart = true
    buildMainProcess()
      .then()
      .catch((err) => {
        console.error(err)
      })
    setTimeout(() => {
      fsWait = false
    }, 500)
  }
}
const mainPath = _path.resolve(__dirname, '../src/main/')
_fs.watch(
  mainPath,
  {
    recursive: true
  },
  (event, filename) => {
    next(mainPath, filename)
  }
)

const forkPath = _path.resolve(__dirname, '../src/fork/')
_fs.watch(
  forkPath,
  {
    recursive: true
  },
  (event, filename) => {
    next(forkPath, filename)
  }
)

const staticPath = _path.resolve(__dirname, '../static/')
_fs.watch(
  staticPath,
  {
    recursive: true
  },
  (event, filename) => {
    if (filename) {
      if (fsWait) return
      const from = _path.join(staticPath, filename)

      // Skip if the path doesn't exist or is not a file
      if (!_fs.existsSync(from) || !_fs.statSync(from).isFile()) {
        return
      }

      const currentMd5 = _md5(_fs.readFileSync(from)) as string
      if (currentMd5 == preveMd5) {
        return
      }
      fsWait = true
      preveMd5 = currentMd5
      const to = _path.resolve(__dirname, '../dist/electron/static/', filename)
      console.log(`${filename} file has been updated`)
      console.log('Copying file: ', from, to)
      copySync(from, to)
      setTimeout(() => {
        fsWait = false
      }, 500)
    }
  }
)
