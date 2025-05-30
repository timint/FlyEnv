import { createServer } from 'vite'
import { promisify } from 'util'
import { spawn, exec, ChildProcess } from 'child_process'
import { build } from 'esbuild'
import { cpSync, readFileSync, watch } from 'fs'
import path from 'path'
import md5 from 'md5'

import viteConfig from 'configs/vite.config.js'
import esbuildConfig from 'configs/esbuild.config.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

let restart = false
let electronProcess: ChildProcess | null

const execAsync = promisify(exec);

async function killAllElectron() {
  const sh = path.resolve(__dirname, '../scripts/electron-kill.ps1')
  const scriptDir = path.dirname(sh)
  console.log('sh: ', sh, scriptDir)
  const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath './electron-kill.ps1'; & './electron-kill.ps1'"`
  let res: any = null
  try {
    res = await execAsync(command, {
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
    await execAsync(`taskkill /f /t ${str}`)
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
    Promise.all([
      //killAllElectron(),
      build(esbuildConfig.dev),
      build(esbuildConfig.devFork)
    ])
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
  const args = ['--inspect=5858', 'dist/electron/main.js']
  electronProcess = spawn('electron', args, {
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
    console.log('Vite Dev Server Start !!!')
  })
}

process.on('SIGINT', async () => {
  console.log('Catch SIGINT，Cleaning Electron Process...')
  //await killAllElectron()
  process.exit(0)
})

// Watch for changes in main files
let preveMd5 = ''
let fsWait = false
const next = (base: string, file?: string | null) => {
  if (file) {
    if (fsWait) return
    const currentMd5 = md5(readFileSync(path.join(base, file))) as string
    if (currentMd5 == preveMd5) {
      return
    }
    fsWait = true
    preveMd5 = currentMd5
    console.log(`${file} file updated`)
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

const mainPath = 'src/main'
const forkPath = 'src/fork'
const staticPath = 'static'

watch(mainPath, { recursive: true }, (event, filename) => {
  next(mainPath, filename)
})

watch(forkPath, { recursive: true }, (event, filename) => {
  next(forkPath, filename)
})

watch(staticPath, { recursive: true }, (event, filename) => {
  if (filename) {
    if (fsWait) return
    const from = path.join(staticPath, filename)
    const currentMd5 = md5(readFileSync(from)) as string
    if (currentMd5 == preveMd5) {
      return
    }
    fsWait = true
    preveMd5 = currentMd5
    const to = path.resolve(__dirname, '../dist/electron/static/', filename)
    console.log(`${filename} file updated`)
    console.log('Copy file: ', from, to)
    cpSync(from, to)
    setTimeout(() => {
      fsWait = false
    }, 500)
  }
})
