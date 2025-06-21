import { createServer } from 'vite'
import { spawn, ChildProcess } from 'child_process'
import { build } from 'esbuild'
import fs from 'fs-extra'
import path from 'path'
// @ts-ignore
import md5 from 'md5'
import { psCommand } from '../src/shared/powershell'

import viteConfig from '../configs/vite.config'
import esbuildConfig from '../configs/esbuild.config'

let restart = false
let electronProcess: ChildProcess | null

async function killAllElectron() {
  console.info('ℹ️ Terminating all Electron processes...')
  try {
    await psCommand('Get-Process Electron | Stop-Process -Force')
  } catch (err) {
    console.error('killAllElectron error:', err)
  }
}

async function launchViteDevServer(openInBrowser = false) {
  const config = openInBrowser ? viteConfig.serveConfig : viteConfig.serverConfig
  const server = await createServer({
    ...config,
    configFile: false
  })
  await server.listen()
}

function buildMainProcess() {
  console.info('ℹ️ Building Electron main process...')
  return new Promise((resolve, reject) => {
    Promise.all([
      killAllElectron(),
      build(esbuildConfig.dev),
      build(esbuildConfig.devFork)
    ])
    .then(() => {
      console.info('✅ Electron main process built')
      console.info('Copying static files...')
      fs.copySync(path.resolve(__dirname, '../static/'), path.resolve(__dirname, '../dist/electron/static/'))
      resolve(true)
    })
    .catch((err) => {
      console.error(err)
      reject(err)
    })
  })
}

function logPrinter(data: string[]) {
  let log = '\n'

  data = data.toString().split(/\r?\n/)
  data.forEach((line) => {
    log += `  ${line}\n`
  })

  if (/[0-9A-z]+/.test(log)) {
    console.log(log)
  }
}

function runElectronApp() {
  electronProcess = spawn('electron', ['--inspect=5858', 'dist/electron/main.js'], {
    stdio: 'pipe',
    shell: process.platform === 'win32'
  })
  electronProcess?.stderr?.on('data', (data) => {
    logPrinter(data)
  })

  electronProcess?.stdout?.on('data', (data) => {
    logPrinter(data)
  })

  electronProcess.on('close', () => {
    console.info('⚠️ electronProcess closed')
    if (electronProcess && electronProcess.killed === false) {
      electronProcess.kill('SIGTERM')
    }
    if (restart) {
      restart = false
      runElectronApp()
    }
  })
}

if (process.env.TEST === 'electron') {
  console.info('Starting Electron Dev Environment...')
  Promise.all([
    launchViteDevServer(),
    buildMainProcess()
  ])
  .then(() => {
    runElectronApp()
  })
  .catch((err) => {
    console.error(err)
  })
}

if (process.env.TEST === 'browser') {
  launchViteDevServer(true).then(() => {
    console.info('✅ Vite Dev Server is started')
  })
}

process.on('SIGINT', async () => {
  console.info('⚠️ Catch SIGINT, cleaning Electron process...')
  await killAllElectron()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.info('⚠️ Catch SIGTERM, cleaning Electron process...')
  await killAllElectron()
  process.exit(0)
})

// Watch for changes in main files
let previousMd5 = ''
let fsWait = false
const next = (base: string, file?: string | null) => {
  if (file) {
    if (fsWait) return
    const currentMd5 = md5(fs.readFileSync(path.join(base, file))) as string
    if (currentMd5 == previousMd5) {
      return
    }
    fsWait = true
    previousMd5 = currentMd5
    console.info(`✅ File ${file} has been updated`)
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
const mainPath = path.resolve(__dirname, '../src/main/')
fs.watch(mainPath, { recursive: true }, (e, filename) => {
  next(mainPath, filename)
})

const forkPath = path.resolve(__dirname, '../src/fork/')
fs.watch(forkPath, { recursive: true }, (e, filename) => {
  next(forkPath, filename)
})

const staticPath = path.resolve(__dirname, '../static/')
fs.watch(staticPath, { recursive: true }, (e, filename) => {
  if (!filename || !fs.existsSync(path.join(staticPath, filename)) || !fs.lstatSync(path.join(staticPath, filename)).isFile()) {
    return
  }
  if (fsWait) return
  const from = path.join(staticPath, filename)
  const currentMd5 = md5(fs.readFileSync(from)) as string
  if (currentMd5 == previousMd5) {
    return
  }
  fsWait = true
  previousMd5 = currentMd5
  const to = path.resolve(__dirname, '../dist/electron/static/', filename)
  console.info('✅ Copying static files', from, to)
  fs.copySync(from, to)
  setTimeout(() => {
    fsWait = false
  }, 500)
})
