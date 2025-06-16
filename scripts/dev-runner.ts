import { createServer } from 'vite'
import { spawn, ChildProcess } from 'child_process'
import { build } from 'esbuild'
import fs from 'fs-extra'
import path from 'path'
// @ts-ignore
import { exec } from 'child-process-promise'
import md5 from 'md5'

import viteConfig from '../configs/vite.config'
import esbuildConfig from '../configs/esbuild.config'

let restart = false
let electronProcess: ChildProcess | null

async function killAllElectron() {
  const sh = _path.resolve(__dirname, '../scripts/electron-kill.ps1')
  const scriptDir = _path.dirname(sh)
  console.log('sh: ', sh, scriptDir)
  const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath './electron-kill.ps1'; & './electron-kill.ps1'"`
  let res: any = null
  try {
    res = await exec(command, {
      cwd: scriptDir
    })
  } catch (e) {
    console.log('killAllElectron err: ', e)
  }
  let all: any = []
  try {
    all = JSON.parse(res?.stdout?.trim() ?? '[]')
  } catch (e) {}
  console.log('all: ', all)
  const arr: Array<string> = []
  if (all && !Array.isArray(all)) {
    all = [all]
  }
  for (const item of all) {
    arr.push(item.ProcessId)
  }
  console.log('_stopServer arr: ', arr)
  if (arr.length > 0) {
    const str = arr.map((s) => `/pid ${s}`).join(' ')
    await exec(`taskkill /f /t ${str}`)
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
  return new Promise((resolve, reject) => {
    Promise.all([killAllElectron(), build(esbuildConfig.dev), build(esbuildConfig.devFork)])
      .then(() => {
        resolve(true)
      })
      .catch((e) => {
        console.log(e)
        reject(e)
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
    console.log('electronProcess close !!!')
    if (restart) {
      restart = false
      runElectronApp()
    }
  })
}

if (process.env.TEST === 'electron') {
  console.log('process.env.TEST electron !!!!!!')
  Promise.all([launchViteDevServer(), buildMainProcess()])
    .then(() => {
      runElectronApp()
    })
    .catch((err) => {
      console.error(err)
    })
}

if (process.env.TEST === 'browser') {
  launchViteDevServer(true).then(() => {
    console.log('Vite Dev Server Start !!!')
  })
}

process.on('SIGINT', async () => {
  console.log('Catch SIGINT，Cleaning Electron Process...')
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
    console.log(`File ${file} has been updated`)
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
  if (filename) {
    if (fsWait) return
    const from = path.join(staticPath, filename)
    const currentMd5 = md5(fs.readFileSync(from)) as string
    if (currentMd5 == previousMd5) {
      return
    }
    fsWait = true
    previousMd5 = currentMd5
    const to = path.resolve(__dirname, '../dist/electron/static/', filename)
    console.log(`File ${filename} has been updated`)
    console.log('Copying file', from, to)
    fs.copySync(from, to)
    setTimeout(() => {
      fsWait = false
    }, 500)
  }
})
