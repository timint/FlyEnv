import { createServer, build as viteBuild } from 'vite'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs-extra'
import path from 'path'
import { psCommand } from '../src/shared/powershell'

import viteConfig from '../configs/vite.config'

let restart = false
let electronProcess: ChildProcess | null
let viteServer: any = null

async function killAllElectron() {
  console.info('ℹ️ Terminating all Electron processes...')
  try {
    await psCommand('Get-Process Electron | Stop-Process -Force')
  } catch (err: any) {
    const msg = err?.toString() || ''
    if (!msg.includes('Cannot find a process with the name')) {
      console.error('killAllElectron error:', err)
    }
    // else: suppress error if Electron is not running
  }
}

async function launchViteDevServer(openInBrowser = false) {
  const config = openInBrowser ? viteConfig.serveConfig : viteConfig.serverConfig
  viteServer = await createServer({
    ...config,
    configFile: false
  })
  await viteServer.listen()
}

function buildMainProcess() {
  console.info('✅ Building Electron main and fork process (Vite)...')
  return new Promise((resolve, reject) => {
    Promise.all([
      killAllElectron(),
      viteBuild(process.env.NODE_ENV === 'development' ? viteConfig.mainDevConfig : viteConfig.mainConfig),
      viteBuild(viteConfig.forkConfig)
    ])
    .then(() => {
      console.info('✅ Electron main and fork process built')
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

  // Listen for browser window close event
  electronProcess.on('exit', async () => {
    console.info('⚠️ Electron process exited (browser window closed)')
    await killAllElectron()
    if (viteServer) {
      try {
        await viteServer.close();
        console.info('✅ Vite Dev Server closed')
      } catch (e) {
        console.error('Error closing Vite Dev Server:', e)
      }
    }
    process.exit(0)
  })
}

if (process.env.TEST === 'electron') {
  console.info('✅ Starting Electron Dev Environment...')
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
