import type { AppHost, SoftInstalled } from '@shared/app'

import { exec, execSync, type ChildProcess, spawn } from 'child_process'
import { createWriteStream, existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, unlinkSync } from 'fs'
import { dirname, isAbsolute, join, parse, basename, normalize } from 'path'
import { ForkPromise } from '@shared/ForkPromise'
import crypto from 'crypto'
import axios from 'axios'
import sudoPrompt from '@shared/sudo'
import chardet from 'chardet'
import iconv from 'iconv-lite'
import { I18nT } from '@lang/index'
import { userInfo, hostname } from 'os'
import packageJson from '../../package.json'
import { sleep } from '@/core/Helpers/General'

export const ProcessSendSuccess = (key: string, data: any, on?: boolean) => {
  process?.send?.({
    on,
    key,
    info: {
      code: 0,
      data
    }
  })
}

export const ProcessSendError = (key: string, msg: any, on?: boolean) => {
  process?.send?.({
    on,
    key,
    info: {
      code: 1,
      msg
    }
  })
}

export const ProcessSendLog = (key: string, msg: any, on?: boolean) => {
  process?.send?.({
    on,
    key,
    info: {
      code: 200,
      msg
    }
  })
}

export function uuid(length = 32) {
  const num = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
  let str = ''
  for (let i = 0; i < length; i++) {
    str += num.charAt(Math.floor(Math.random() * num.length))
  }
  return str
}

export function fixEnv(): { [k: string]: any } {
  let path = `C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;%SYSTEMROOT%\\System32\\WindowsPowerShell\\v1.0\\;${process.env['PATH']}`
  path = Array.from(new Set(path.split(';'))).join(';')
  const env = { ...process.env, PATH: path }
  return env
}

export function execSyncFix(command: string, opt?: { [k: string]: any }): string | undefined {
  let res: any = undefined
  try {
    res = execSync(command, { ...opt, env: fixEnv() }).toString()
  } catch (e) {
    res = undefined
  }
  return res
}

export function suExecPromise(command: string): ForkPromise<{
  stdout: string
  stderr: string
}> {
  return new ForkPromise((resolve, reject) => {
    try {
      sudoPrompt(
        command,
        {
          name: packageJson.productName,
          dir: global.Server.Cache!,
          // dir: 'E:/test aaa/新建 文件夹',
          debug: false
        },
        (error: any, stdout?: string, stderr?: string) => {
          if (!error) {
            resolve({
              stdout: stdout?.toString() ?? '',
              stderr: stderr?.toString() ?? ''
            })
          } else {
            reject(error)
          }
        }
      )
    } catch (e) {
      reject(e)
    }
  })
}

export function execPromise(
  command: string,
  opt?: { [k: string]: any }
): ForkPromise<{
  stdout: string
  stderr: string
}> {
  return new ForkPromise((resolve, reject) => {
    try {
      exec(
        command,
        {
          ...(opt || {}),
          encoding: 'utf-8',
          env: fixEnv()
        },
        (error, stdout, stderr) => {
          if (!error) {
        resolve({
          stdout,
          stderr
        })
          } else {
        reject(error)
          }
        }
      )
    } catch (e) {
      reject(e)
    }
  })
}

export function spawnPromise(
  command: string,
  params: Array<any>,
  opt?: { [k: string]: any }
): ForkPromise<string> {
  return new ForkPromise((resolve, reject, on) => {
    const stdout: Array<Buffer> = []
    const stderr: Array<Buffer> = []
    const child: ChildProcess = spawn(
      command,
      params,
      {
        ...(opt || {}),
        encoding: 'utf-8',
        env: fixEnv()
      }
    )
    const stdinFn = (txt: string) => {
      (child.stdin as any)?.write(`${txt}\n`)
    }
    let exit = false
    const onEnd = (code: number | null) => {
      if (exit) return
      exit = true
      if (!code) {
        resolve(Buffer.concat(stdout).toString().trim())
      } else {
        reject(new Error(Buffer.concat(stderr).toString().trim()))
      }
    }

    // Use type assertions for all evented streams due to type conflicts
    ((child.stdout as any)?.on as Function)?.call(child.stdout, 'data', (data: any) => {
      stdout.push(data)
      on(data.toString(), stdinFn)
    })
    ((child.stderr as any)?.on as Function)?.call(child.stderr, 'data', (err: any) => {
      stderr.push(err)
      on(err.toString(), stdinFn)
    })
    ((child as any).on as Function)?.call(child, 'exit', onEnd)
    ((child as any).on as Function)?.call(child, 'close', onEnd)
  })
}

export function spawnPromiseMore(
  command: string,
  params: Array<any>,
  opt?: { [k: string]: any }
): {
  promise?: ForkPromise<any>
  spawn?: ChildProcess
} {
  const stdout: Array<Buffer> = []
  const stderr: Array<Buffer> = []
  let child: ChildProcess
  try {
    child = spawn(
      command,
      params,
      {
        ...(opt || {}),
        env: fixEnv(),
        windowsHide: true
      }
    )
  } catch (e) {
    console.log('spawnPromiseMore err: ', e)
    return {
      promise: undefined,
      spawn: undefined
    }
  }
  const stdinFn = (txt: string) => {
    child?.stdin?.write(`${txt}\n`)
  }
  const promise = new ForkPromise((resolve, reject, on) => {
    let exit = false
    const onEnd = (code: number | null) => {
      if (exit) return
      exit = true
      if (!code) {
        resolve(Buffer.concat(stdout).toString().trim())
      } else {
        reject(new Error(Buffer.concat(stderr).toString().trim()))
      }
    }
    child?.stdout?.on('data', (data: any) => {
      console.log('spawnPromiseMore stdout: ', data.toString())
      stdout.push(data)
      on(data.toString(), stdinFn)
    })
    child?.stderr?.on('data', (err: any) => {
      console.log('spawnPromiseMore stderr: ', err.toString())
      stderr.push(err)
      on(err.toString(), stdinFn)
    })
    child.on('exit', onEnd)
    child.on('close', onEnd)
  })
  return {
    promise,
    spawn: child
  }
}

export function md5(str: string) {
  const md5 = crypto.createHash('md5')
  return md5.update(str).digest('hex')
}

export function downloadFile(url: string, savepath: string) {
  return new ForkPromise((resolve, reject, on) => {
    const proxyUrl =
      Object.values(global?.Server?.Proxy ?? {})?.find((s: string) => s.includes('://')) ?? ''
    let proxy: any = {}
    if (proxyUrl) {
      try {
        const u = new URL(proxyUrl)
        proxy.protocol = u.protocol.replace(':', '')
        proxy.host = u.hostname
        proxy.port = u.port
      } catch (e) {
        proxy = undefined
      }
    } else {
      proxy = undefined
    }
    axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      proxy: proxy,
      onDownloadProgress: (progress) => {
        if (progress.total) {
          const percent = Math.round((progress.loaded * 100.0) / progress.total)
          on(percent)
        }
      }
    })
      .then(function (response) {
        const base = dirname(savepath)
        mkdirSync(base, { recursive: true })
        const stream = createWriteStream(savepath)
        response.data.pipe(stream)
        stream.on('error', (err) => {
          reject(err)
        })
        stream.on('finish', () => {
          resolve(true)
        })
      })
      .catch((err) => {
        reject(err)
      })
  })
}

export const hostAlias = (item: AppHost) => {
  const alias = item.alias
    ? item.alias.split('\n').filter((n) => {
        return n && n.length > 0
      })
    : []
  const arr = Array.from(new Set(alias)).sort()
  arr.unshift(item.name)
  return arr
}


export const AppLog = (type: 'info' | 'error', msg: string) => {
  const time = new Date().getTime()
  return `[${type}]${time}:${msg}`
}

export function stringToUTF8(str: string): string {
  try {
    const buffer: Buffer = Buffer.from(str)
    if (buffer?.length === 0 || buffer?.byteLength === 0) {
      return ''
    }
    const detectedEncoding = chardet.detect(buffer)
    console.log('detectedEncoding: ', detectedEncoding)
    if (
      !detectedEncoding ||
      detectedEncoding.toLowerCase() === 'utf-8' ||
      detectedEncoding.toLowerCase() === 'utf8'
    ) {
      return buffer.toString('utf-8')
    }

    if (typeof detectedEncoding === 'string') {
      let str = ''
      try {
        str = iconv.decode(buffer, detectedEncoding)
      } catch (e) {}
      return str
    }

    try {
      return iconv.decode(buffer, detectedEncoding)
    } catch (conversionError: any) {
      console.error(
        `Error converting from ${detectedEncoding} to UTF-8 for str: ${str}`,
        conversionError
      )
      return buffer.toString('utf-8')
    }
  } catch (err: any) {
    return ''
  }
}
export async function serviceStartExec(
  version: SoftInstalled,
  pidPath: string,
  baseDir: string,
  bin: string,
  execArgs: string,
  execEnv: string,
  on: Function,
  maxTime = 20,
  timeToWait = 500,
  checkPidFile = true
): Promise<{ 'APP-Service-Start-PID': string }> {
  if (pidPath && existsSync(pidPath)) {
    try {
      unlinkSync(pidPath)
    } catch (e) {}
  }

  const typeFlag = version.typeFlag
  const versionStr = version.version!.trim()

  const outFile = join(baseDir, `${typeFlag}-${versionStr}-start-out.log`.split(' ').join(''))
  const errFile = join(baseDir, `${typeFlag}-${versionStr}-start-error.log`.split(' ').join(''))

  let psScript = readFileSync(join(global.Server.Static!, 'sh/flyenv-async-exec.ps1'), 'utf8')

  psScript = psScript
    .replace('#ENV#', execEnv)
    .replace('#CWD#', dirname(bin))
    .replace('#BIN#', bin)
    .replace('#ARGS#', execArgs)
    .replace('#OUTLOG#', outFile)
    .replace('#ERRLOG#', errFile)

  const psName = `${typeFlag}-${versionStr}-start.ps1`.split(' ').join('')
  const psPath = join(baseDir, psName)
  writeFileSync(psPath, psScript)

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommand'))
  })

  process.chdir(baseDir)
  let res: any
  try {
    res = await spawnPromise(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `"Unblock-File -LiteralPath './${psName}'; & './${psName}'"`
      ],
      {
        shell: 'powershell.exe',
        cwd: baseDir
      }
    )
  } catch (e) {
    on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.execStartCommandFail', {
          error: e,
          service: `${version.typeFlag}-${version.version}`
        })
      )
    })
    throw e
  }

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommandSuccess'))
  })
  on({
    'APP-Service-Start-Success': true
  })

  if (!checkPidFile) {
    let pid = ''
    const stdout = res.trim()
    const regex = /FlyEnv-Process-ID(.*?)FlyEnv-Process-ID/g
    const match = regex.exec(stdout)
    if (match) {
      pid = match[1] // 捕获组 (\d+) 的内容
    }
    writeFileSync(pidPath, pid)
    on({
      'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: pid }))
    })
    return {
      'APP-Service-Start-PID': pid
    }
  }

  res = await waitPidFile(pidPath, 0, maxTime, timeToWait)
  if (res) {
    if (res?.pid) {
      writeFileSync(pidPath, res.pid)
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: res.pid }))
      })
      return {
        'APP-Service-Start-PID': res.pid
      }
    }
    on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.startServiceFail', {
          error: res?.error ?? 'Start Fail',
          service: `${version.typeFlag}-${version.version}`
        })
      )
    })
    throw new Error(res?.error ?? 'Start Fail')
  }
  let msg = 'Start Fail'
  if (existsSync(errFile)) {
    msg = await readFileAsUTF8(errFile) || 'Start Fail'
  }
  on({
    'APP-On-Log': AppLog(
      'error',
      I18nT('appLog.startServiceFail', {
        error: msg,
        service: `${version.typeFlag}-${version.version}`
      })
    )
  })
  throw new Error(msg)
}

export async function serviceStartExecCMD(
  version: SoftInstalled,
  pidPath: string,
  baseDir: string,
  bin: string,
  execArgs: string,
  execEnv: string,
  on: Function,
  maxTime = 20,
  timeToWait = 500,
  checkPidFile = true
): Promise<{ 'APP-Service-Start-PID': string }> {
  if (pidPath && existsSync(pidPath)) {
    try {
      unlinkSync(pidPath)
    } catch (e) {}
  }

  const typeFlag = version.typeFlag
  const versionStr = version.version!.trim()

  const outFile = join(baseDir, `${typeFlag}-${versionStr}-start-out.log`.split(' ').join(''))
  const errFile = join(baseDir, `${typeFlag}-${versionStr}-start-error.log`.split(' ').join(''))

  let psScript = readFileSync(join(global.Server.Static!, 'sh/flyenv-async-exec.cmd'), 'utf8')

  let execBin = basename(bin)
  if (execBin.includes('.exe')) {
    execBin = `./${execBin}`
  }

  psScript = psScript
    .replace('#ENV#', execEnv)
    .replace('#CWD#', dirname(bin))
    .replace('#BIN#', execBin)
    .replace('#ARGS#', execArgs)
    .replace('#OUTLOG#', outFile)
    .replace('#ERRLOG#', errFile)

  const psName = `${typeFlag}-${versionStr}-start.cmd`.split(' ').join('')
  const psPath = join(baseDir, psName)
  writeFileSync(psPath, psScript)

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommand'))
  })

  process.chdir(baseDir)
  let res: any
  try {
    res = await spawnPromise(psName, [], {
      shell: 'cmd.exe',
      cwd: baseDir
    })
  } catch (e) {
    on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.execStartCommandFail', {
          error: e,
          service: `${version.typeFlag}-${version.version}`
        })
      )
    })
    throw e
  }

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommandSuccess'))
  })
  on({
    'APP-Service-Start-Success': true
  })

  if (!checkPidFile) {
    return {
      'APP-Service-Start-PID': ''
    }
  }

  res = await waitPidFile(pidPath, 0, maxTime, timeToWait)
  if (res) {
    if (res?.pid) {
      writeFileSync(pidPath, res.pid)
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: res.pid }))
      })
      return {
        'APP-Service-Start-PID': res.pid
      }
    }
    on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.startServiceFail', {
          error: res?.error ?? 'Start Fail',
          service: `${version.typeFlag}-${version.version}`
        })
      )
    })
    throw new Error(res?.error ?? 'Start Fail')
  }
  let msg = 'Start Fail'
  if (existsSync(errFile)) {
    msg = await readFileAsUTF8(errFile) || 'Start Fail'
  }
  on({
    'APP-On-Log': AppLog(
      'error',
      I18nT('appLog.startServiceFail', {
        error: msg,
        service: `${version.typeFlag}-${version.version}`
      })
    )
  })
  throw new Error(msg)
}

export async function serviceStartExecGetPID(
  version: SoftInstalled,
  pidPath: string,
  baseDir: string,
  cwdDir: string,
  bin: string,
  execArgs: string,
  execEnv: string,
  on: Function
): Promise<{ 'APP-Service-Start-PID': string }> {
  if (pidPath && existsSync(pidPath)) {
    try {
      rmSync(pidPath, { recursive: true, force: true })
    } catch (e) {}
  }

  const typeFlag = version.typeFlag
  const versionStr = version.version!.trim()

  const outFile = join(baseDir, `${typeFlag}-${versionStr}-start-out.log`.split(' ').join(''))
  const errFile = join(baseDir, `${typeFlag}-${versionStr}-start-error.log`.split(' ').join(''))

  let psScript = readFileSync(join(global.Server.Static!, 'sh/flyenv-async-exec.ps1'), 'utf8')

  psScript = psScript
    .replace('#ENV#', execEnv)
    .replace('#CWD#', cwdDir)
    .replace('#BIN#', bin)
    .replace('#ARGS#', execArgs)
    .replace('#OUTLOG#', outFile)
    .replace('#ERRLOG#', errFile)

  const psName = `${typeFlag}-${versionStr}-start.ps1`.split(' ').join('')
  const psPath = join(baseDir, psName)
  writeFileSync(psPath, psScript)

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommand'))
  })

  process.chdir(baseDir)
  let res: any
  try {
    res = await spawnPromise(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `"Unblock-File -LiteralPath './${psName}'; & './${psName}'"`
      ],
      {
        shell: 'powershell.exe',
        cwd: baseDir
      }
    )
  } catch (e) {
    on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.execStartCommandFail', {
          error: e,
          service: `${version.typeFlag}-${version.version}`
        })
      )
    })
    throw e
  }

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommandSuccess'))
  })
  on({
    'APP-Service-Start-Success': true
  })

  let pid = ''
  const stdout = res.trim()
  const regex = /FlyEnv-Process-ID(.*?)FlyEnv-Process-ID/g
  const match = regex.exec(stdout)
  if (match) {
    pid = match[1] // Capture group (\d+) content
  }
  writeFileSync(pidPath, pid)
  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: pid }))
  })
  return {
    'APP-Service-Start-PID': pid
  }
}
