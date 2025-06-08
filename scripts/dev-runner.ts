import { createServer } from 'vite'
import { promisify } from 'util'
import { spawn, exec, execSync, ChildProcess } from 'child_process'
import { build } from 'esbuild'
import { cpSync, readFileSync, watch } from 'fs'
import { dirname, join, resolve } from 'path'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'

import viteConfig from 'configs/vite.config.js'
import esbuildConfig from 'configs/esbuild.config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

function buildMainProcess() {
  return new Promise((resolve, reject) => {
    Promise.all([
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
  console.log('Catch SIGINT, Cleaning Electron Process...')
  if (electronProcess && !electronProcess.killed) {
    try {
      electronProcess.kill('SIGTERM')
      // Give it a moment to exit
      await new Promise(res => setTimeout(res, 500))
    } catch (e) {
      console.log('Error killing electronProcess:', e)
    }
  }
  process.exit(0)
})

// Watch for changes in main files
let previousMd5 = ''
let fsWait = false

function next(base: string, file?: string | null) {
  if (!file || fsWait) return
  const content = readFileSync(join(base, file))
  const currentMd5 = createHash('md5').update(content).digest('hex')
  if (currentMd5 === previousMd5) return
  fsWait = true
  previousMd5 = currentMd5
  console.log(`${file} file updated`)
  restart = true
  buildMainProcess().catch(console.error)
  setTimeout(() => { fsWait = false }, 500)
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
  if (!filename || fsWait) return
  const from = join(staticPath, filename)
  const to = resolve(__dirname, '../dist/electron/static/', filename)
  const content = readFileSync(from)
  const currentMd5 = createHash('md5').update(content).digest('hex')
  if (currentMd5 === previousMd5) return
  fsWait = true
  previousMd5 = currentMd5
  console.log(`${filename} file updated`)
  console.log('Copy file:', from, to)
  cpSync(from, to)
  setTimeout(() => { fsWait = false }, 500)
})
