import { type ChildProcess, exec, execSync, spawn } from 'child_process'
import { merge } from 'lodash'
import { chmodSync, createWriteStream, existsSync, mkdirSync, readdirSync, realpathSync, statSync } from 'fs'
import { dirname, isAbsolute, join, parse, basename, normalize } from 'path'
import { ForkPromise } from '@shared/ForkPromise'
import axios from 'axios'
import { appendFile, copyFile, mkdirp, readdir, readFile, remove, rename, writeFile } from 'fs-extra'
import type { AppHost, SoftInstalled } from '@shared/app'
import sudoPrompt from '@shared/sudo'
import { compareVersions } from 'compare-versions'
import chardet from 'chardet'
import iconv from 'iconv-lite'
import { I18nT } from '@lang/index'
import { userInfo, hostname } from 'os'

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

export function waitTime(time: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}

export function fixEnv(): { [k: string]: any } {
  let path = [
    '%SYSTEMROOT%\\System32\\WindowsPowerShell\\v1.0\\',
    process.env['PATH'] || ''
  ].filter(Boolean).join(';')
  const env = { ...process.env, PATH: path }
  return env
}

export function execSyncFix(command: string, opt?: { [k: string]: any }): string | undefined {
  let res: any = undefined
  try {
    res = execSync(command, {
      encoding: 'utf-8',
      env: fixEnv(),
      ...opt
    })
  } catch (err) {
    res = undefined
  }
  return res
}

export function execPromiseRoot(command: string): ForkPromise<{
  stdout: string
  stderr: string
}> {
  return new ForkPromise((resolve, reject) => {
    try {
      sudoPrompt(command, {
          name: 'PhpWebStudy',
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
    } catch (err) {
      reject(err)
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
      exec(command, {
        encoding: 'utf-8',
        env: fixEnv(),
        ...opt
      }, (error, stdout, stderr) => {
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
    } catch (err) {
      reject(err)
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
    const child = spawn(
      command,
      params,
      merge(
        {
          encoding: 'utf-8',
          env: fixEnv()
        },
        opt
      )
    )
    const stdinFn = (txt: string) => {
      child?.stdin?.write(`${txt}\n`)
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

    child?.stdout?.on('data', (data) => {
      stdout.push(data)
      on(data.toString(), stdinFn)
    })
    child?.stderr?.on('data', (err) => {
      stderr.push(err)
      on(err.toString(), stdinFn)
    })
    child.on('exit', onEnd)
    child.on('close', onEnd)
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
    child = spawn(command, params, {
      env: fixEnv(),
      windowsHide: true,
      ...opt
    })
  } catch (err) {
    console.error('spawnPromiseMore err: ', err)
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
    child?.stdout?.on('data', (data) => {
      console.info('spawnPromiseMore stdout: ', data.toString())
      stdout.push(data)
      on(data.toString(), stdinFn)
    })
    child?.stderr?.on('data', (err) => {
      console.info('spawnPromiseMore stderr: ', err.toString())
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

export function chmod(fp: string, mode: string) {
  if (statSync(fp).isFile()) {
    chmodSync(fp, mode)
    return
  }
  const files = readdirSync(fp)
  files.forEach(function (item) {
    const fPath = join(fp, item)
    chmodSync(fPath, mode)
    const stat = statSync(fPath)
    if (stat.isDirectory()) {
      chmod(fPath, mode)
    }
  })
}

export function createFolder(fp: string) {
  fp = fp.replace(/\\/g, '/')
  if (existsSync(fp)) {
    return true
  }
  const arr = fp.split('/')
  let dir = '/'
  for (const p of arr) {
    dir = join(dir, p)
    if (!existsSync(dir)) {
      mkdirSync(dir)
    }
  }
  return existsSync(fp)
}

export function md5(str: string) {
  const md5 = crypto.createHash('md5')
  return md5.update(str).digest('hex')
}

export function getAllFile(fp: string, fullpath = true, basePath: Array<string> = []) {
  let arr: Array<string> = []
  if (!existsSync(fp)) {
    return arr
  }
  const state = statSync(fp)
  if (state.isFile()) {
    return [fp]
  }
  const files = readdirSync(fp)
  files.forEach(function (item) {
    const base = [...basePath]
    base.push(item)
    const fPath = join(fp, item)
    if (existsSync(fPath)) {
      const stat = statSync(fPath)
      if (stat.isDirectory()) {
        const sub = getAllFile(fPath, fullpath, base)
        arr = arr.concat(sub)
      }
      if (stat.isFile()) {
        arr.push(fullpath ? fPath : base.join('/'))
      }
    }
  })
  return arr
}

export function downFile(url: string, savepath: string) {
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
      } catch (err) {
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
        createFolder(base)
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

export function getSubDir(fp: string, fullpath = true) {
  const arr: Array<string> = []
  if (!existsSync(fp)) {
    return arr
  }
  const stat = statSync(fp)
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    try {
      const files = readdirSync(fp)
      files.forEach(function (item) {
        const fPath = join(fp, item)
        if (existsSync(fPath)) {
          const stat = statSync(fPath)
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            arr.push(fullpath ? fPath : item)
          }
        }
      })
    } catch (err) {}
  }
  return arr
}

export const getAllFileAsync = async (
  dirPath: string,
  fullpath = true,
  basePath: Array<string> = []
): Promise<string[]> => {
  if (!existsSync(dirPath)) {
    return []
  }
  const list: Array<string> = []
  const files = await readdir(dirPath, { withFileTypes: true })
  for (const file of files) {
    const arr = [...basePath]
    arr.push(file.name)
    const childPath = join(dirPath, file.name)
    if (file.isDirectory()) {
      const sub = await getAllFileAsync(childPath, fullpath, arr)
      list.push(...sub)
    } else if (file.isFile()) {
      const name = fullpath ? childPath : arr.join('/')
      list.push(name)
    }
  }
  return list
}

export const getSubDirAsync = async (dirPath: string, fullpath = true): Promise<string[]> => {
  if (!existsSync(dirPath)) {
    return []
  }
  const list: Array<string> = []
  const files = await readdir(dirPath, { withFileTypes: true })
  for (const file of files) {
    const childPath = join(dirPath, file.name)
    if (file.isDirectory()) {
      const name = fullpath ? childPath : file.name
      list.push(name)
    }
  }
  return list
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

export function versionFixed(version?: string | null) {
  return (
    version
      ?.split('.')
      ?.map((v) => {
        const vn = parseInt(v)
        if (isNaN(vn)) {
          return '0'
        }
        return `${vn}`
      })
      ?.join('.') ?? '0'
  )
}

export const versionCheckBin = (binPath: string) => {
  if (existsSync(binPath)) {
    console.debug('binPath: ', binPath)
    binPath = realpathSync(binPath)
    if (!existsSync(binPath)) {
      return false
    }
    if (!statSync(binPath).isFile()) {
      return false
    }
    console.info('binPath realpathSync: ', binPath)
    return binPath
  }
  return false
}

export const versionSort = (versions: SoftInstalled[]) => {
  return versions.sort((a, b) => {
    const bv = versionFixed(b.version)
    const av = versionFixed(a.version)
    return compareVersions(bv, av)
  })
}

export const versionFilterSame = (versions: SoftInstalled[]) => {
  const arr: SoftInstalled[] = []
  let item = versions.pop()
  while (item) {
    const has = versions.some((v) => v.bin === item?.bin)
    if (!has) {
      arr.push(item)
    }
    item = versions.pop()
  }
  return arr
}

export const versionBinVersion = (
  bin: string,
  command: string,
  reg: RegExp
): Promise<{ version?: string; error?: string }> => {
  return new Promise(async (resolve) => {
    const handleCatch = (err: any) => {
      resolve({
        error: command + '<br/>' + err.toString().trim().replace(new RegExp('\n', 'g'), '<br/>'),
        version: undefined
      })
    }
    const handleThen = (res: any) => {
      let str = res.stdout + res.stderr
      str = str.replace(new RegExp(`\r\n`, 'g'), `\n`)
      let version: string | undefined = ''
      try {
        version = reg?.exec(str)?.[2]?.trim()
        reg!.lastIndex = 0
      } catch (err) {}
      resolve({
        version
      })
    }
    try {
      const res = await execPromise(command, {
        cwd: dirname(bin)
      })
      console.info('versionBinVersion: ', command, reg, res)
      handleThen(res)
    } catch (err) {
      console.error('versionBinVersion err: ', err)
      handleCatch(err)
    }
  })
}

export const versionDirCache: Record<string, string[]> = {}

export const versionLocalFetch = async (
  customDirs: string[],
  binName: string
): Promise<Array<SoftInstalled>> => {
  const installed: Set<string> = new Set()

  const findInstalled = async (dir: string, depth = 0, maxDepth = 2) => {
    if (!existsSync(dir)) {
      return
    }
    dir = realpathSync(dir)
    let binPath = versionCheckBin(join(dir, `${binName}`))
    if (binPath) {
      installed.add(binPath)
      return
    }
    binPath = versionCheckBin(join(dir, `bin/${binName}`))
    if (binPath) {
      installed.add(binPath)
      return
    }
    binPath = versionCheckBin(join(dir, `sbin/${binName}`))
    if (binPath) {
      installed.add(binPath)
      return
    }
    if (depth >= maxDepth) {
      return false
    }
    const sub = versionDirCache?.[dir] ?? (await getSubDirAsync(dir))
    if (!versionDirCache?.[dir]) {
      versionDirCache[dir] = sub
    }
    for (const s of sub) {
      await findInstalled(s, depth + 1, maxDepth)
    }
    return
  }

  const base = global.Server.AppDir!
  const subDir = versionDirCache?.[base] ?? (await getSubDirAsync(base))
  if (!versionDirCache?.[base]) {
    versionDirCache[base] = subDir
  }
  for (const f of subDir) {
    await findInstalled(f)
  }

  for (const s of customDirs) {
    await findInstalled(s, 0, 1)
  }

  const count = installed.size
  if (count === 0) {
    return []
  }

  const list: Array<SoftInstalled> = []
  const installedList: Array<string> = Array.from(installed)
  for (const i of installedList) {
    const path = fetchPathByBin(i)
    const item = {
      bin: i,
      path: `${path}`,
      run: false,
      running: false
    }
    if (!list.find((f) => f.path === item.path && f.bin === item.bin)) {
      list.push(item as any)
    }
  }
  return list
}

export const versionInitedApp = async (type: string, bin: string) => {
  const versions: SoftInstalled[] = []
  const zipDir = join(global.Server.Static!, 'zip')
  const allZip = versionDirCache?.[zipDir] ?? (await getAllFileAsync(zipDir, false))
  if (!versionDirCache?.[zipDir]) {
    versionDirCache[zipDir] = allZip
  }
  const varr = allZip
    .filter((z) => z.startsWith(`${type}-`) && z.endsWith('.7z'))
    .map((z) => z.replace(`${type}-`, '').replace('.7z', ''))
  varr.forEach((v) => {
    const num = Number(v.split('.').slice(0, 2).join(''))
    versions.push({
      version: v,
      bin: join(global.Server.AppDir!, `${type}-${v}`, bin),
      path: join(global.Server.AppDir!, `${type}-${v}`),
      num: num,
      enable: true,
      error: undefined,
      run: false,
      running: false,
      isLocal7Z: true,
      typeFlag: type as any
    })
  })
  return versions
}

export const AppLog = (type: 'info' | 'error', msg: string) => {
  const time = new Date().toString() // Thu Apr 03 01:36:23
  return `[${time}] ${type}: ${msg}` // Example: [Thu Apr 03 01:36:23] info: Log message here message here
}

export const fetchRawPATH = (): ForkPromise<string[]> => {
  return new ForkPromise(async (resolve, reject) => {
    const sh = join(global.Server.Static!, 'sh/path-get.ps1')
    const copySh = join(global.Server.Cache!, 'path-get.ps1')
    if (existsSync(copySh)) {
      await remove(copySh)
    }
    await copyFile(sh, copySh)
    process.chdir(global.Server.Cache!)
    let res: any
    try {
      res = await psCommand(`Unblock-File -LiteralPath './path-get.ps1'; & './path-get.ps1'`, {
        cwd: global.Server.Cache!
      })
    } catch (err) {
      await appendFile(join(global.Server.BaseDir!, 'debug.log'), `[_fetchRawPATH][error]: ${err}\n`)
      return reject(err)
    }

    let str = ''
    const stdout = res.trim()
    console.debug('fetchRawPATH stdout: ', stdout)
    const regex = /FlyEnv-PATH-GET([\s\S]*?)FlyEnv-PATH-GET/g
    const match = regex.exec(stdout)
    if (match) {
      str = match[1].trim()
    }
    console.debug('fetchRawPATH str: ', {
      str
    })
    str = str.replace(new RegExp(`\r\n`, 'g'), '').replace(new RegExp(`\n`, 'g'), '')
    if (!str.includes(':\\') && !str.includes('%')) {
      return resolve([])
    }
    const oldPath = Array.from(new Set(str.split(';') ?? []))
      .filter((s) => !!s.trim())
      .map((s) => s.trim())
    console.debug('_fetchRawPATH: ', str, oldPath)
    resolve(oldPath)
  })
}

export const handleWinPathArr = (paths: string[]) => {
  return Array.from(new Set(paths.map(p => p.trim())))
    .filter(p => p && (isAbsolute(p) || p.includes('%') || p.includes('$env:')))
    .sort((a, b) => {
      const type = (p: string) =>
        isAbsolute(p) ? 1 :
        p.startsWith('%SystemRoot%') ? 2 :
        (p.includes('%') || p.includes('$env:')) ? 3 : 4
      return type(a) - type(b)
    })
}

export const writePath = async (path: string[], other: string = '') => {
  console.info('writePath paths: ', path)
  const sh = join(global.Server.Static!, 'sh/path-set.ps1')
  const copySh = join(global.Server.Cache!, 'path-set.ps1')
  if (existsSync(copySh)) {
    await remove(copySh)
  }
  const pathStr = path.join(';')
  let content = await readFile(sh, 'utf-8')
  content = content.replace('##NEW_PATH##', pathStr).replace('##OTHER##', other)
  await writeFile(copySh, content, 'utf-8')
  process.chdir(global.Server.Cache!)
  try {
    await psCommand(`Unblock-File -LiteralPath '${copySh}'; & '${copySh}'`)
  } catch (err) {
    console.error('writePath error: ', err)
    await appendFile(join(global.Server.BaseDir!, 'debug.log'), `[writePath][error]: ${err}\n`)
  }
}

export const addPath = async (dir: string) => {
  try {
    let allPath = await fetchRawPATH()
    allPath = allPath.filter(p => p !== dir)
    allPath.unshift(dir)
    await writePath(handleWinPathArr(allPath))
  } catch {}
}

/**
 * move dir's file and sub dir to other dir
 * @param src
 * @param dest
 */
export async function moveDirToDir(src: string, dest: string) {
  // Read the source directory
  const entries = await readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      await mkdirp(destPath)
      // Recursively move subdirectories
      await moveDirToDir(srcPath, destPath)
    } else {
      // Move file
      await rename(srcPath, destPath)
    }
  }
}

export async function moveChildDirToParent(dir: string) {
  const sub = await readdir(dir)
  for (const s of sub) {
    const sdir = join(dir, s)
    await moveDirToDir(sdir, dir)
    await remove(sdir)
  }
}

export function fetchPathByBin(bin: string) {
  let path = dirname(bin)
  const paths = bin.split(`\\`)
  let isBin = paths.pop()
  while (isBin) {
    if (['bin', 'sbin'].includes(isBin)) {
      path = paths.join(`\\`)
      isBin = undefined
      break
    }
    isBin = paths.pop()
  }
  return path
}

const NTFS: Record<string, boolean> = {}

export async function isNTFS(fileOrDirPath: string) {
  const driveLetter = parse(fileOrDirPath).root.replace(/[:\\]/g, '')
  if (NTFS.hasOwnProperty(driveLetter)) {
    return NTFS[driveLetter]
  }
  try {
    const command = `Get-Volume -DriveLetter ${driveLetter} | ConvertTo-Json`
    const jsonResult = await psCommand(command, {
      encoding: 'utf-8'
    })?.stdout ?? ''
    const { FileSystem, FileSystemType } = JSON.parse(jsonResult)
    const is = FileSystem === 'NTFS' || FileSystemType === 'NTFS'
    NTFS[driveLetter] = is
    return is
  } catch (error) {
    return false
  }
}

export async function readFileAsUTF8(filePath: string): Promise<string> {
  try {
    const buffer: Buffer = await readFile(filePath)
    if (buffer?.length === 0 || buffer?.byteLength === 0) {
      return ''
    }
    const detectedEncoding = chardet.detect(buffer)
    console.info('detectedEncoding: ', detectedEncoding)
    if (!detectedEncoding || detectedEncoding.match(/utf-?8/i)) {
      return buffer.toString('utf-8')
    }

    if (typeof detectedEncoding === 'string') {
      let str = ''
      try {
        str = iconv.decode(buffer, detectedEncoding)
      } catch (err) {}
      return str
    }

    try {
      return iconv.decode(buffer, detectedEncoding)
    } catch (conversionError: any) {
      console.error(
        `Error converting from ${detectedEncoding} to UTF-8 for file: ${filePath}`,
        conversionError
      )
      return buffer.toString('utf-8')
    }
  } catch (err: any) {
    return ''
  }
}

export function stringToUTF8(str: string): string {
  try {
    const buffer: Buffer = Buffer.from(str)
    if (buffer?.length === 0 || buffer?.byteLength === 0) {
      return ''
    }
    const detectedEncoding = chardet.detect(buffer)
    console.info('detectedEncoding: ', detectedEncoding)
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
      } catch (err) {}
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

export async function setDir777ToCurrentUser(folderPath: string) {
  if (!existsSync(folderPath)) {
    return
  }
  const username = userInfo().username
  const domain = hostname()
  const identity = `"${domain}\\${username}"`

  const args = [
    `"${normalize(folderPath)}"`,
    '/grant',
    `${identity}:(F)`, // 注意这里不再额外加引号
    '/t',
    '/c',
    '/q'
  ]

  console.info(`Executing: icacls ${args.join(' ')}`)
  await appendFile(
    join(global.Server.BaseDir!, 'debug.log'),
    `[setDir777ToCurrentUser][args]: icacls ${args.join(' ')}\n`
  )
  try {
    await spawnPromise('icacls', args, {
      shell: true,
      windowsHide: true
    })
  } catch (err) {
    await appendFile(
      join(global.Server.BaseDir!, 'debug.log'),
      `[setDir777ToCurrentUser][error]: ${err}\n`
    )
  }
}

export async function waitPidFile(
  pidFile: string,
  time = 0,
  maxTime = 20,
  timeToWait = 500
): Promise<
  | {
      pid?: string
      error?: string
    }
  | false
> {
  let res:
    | {
        pid?: string
        error?: string
      }
    | false = false
  if (existsSync(pidFile)) {
    const pid = (await readFile(pidFile, 'utf-8')).trim()
    return {
      pid
    }
  } else {
    if (time < maxTime) {
      await waitTime(timeToWait)
      res = res || (await waitPidFile(pidFile, time + 1, maxTime, timeToWait))
    } else {
      res = false
    }
  }
  console.debug('waitPid: ', time, res)
  return res
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
      await remove(pidPath)
    } catch (err) {}
  }

  const typeFlag = version.typeFlag
  const versionStr = version.version!.trim()

  const outFile = join(baseDir, `${typeFlag}-${versionStr}-start-out.log`.split(' ').join(''))
  const errFile = join(baseDir, `${typeFlag}-${versionStr}-start-error.log`.split(' ').join(''))

  let psScript = await readFile(join(global.Server.Static!, 'sh/flyenv-async-exec.ps1'), 'utf8')

  psScript = psScript
    .replace('#ENV#', execEnv)
    .replace('#CWD#', dirname(bin))
    .replace('#BIN#', bin)
    .replace('#ARGS#', execArgs)
    .replace('#OUTLOG#', outFile)
    .replace('#ERRLOG#', errFile)

  const psName = `${typeFlag}-${versionStr}-start.ps1`.split(' ').join('')
  const psPath = join(baseDir, psName)
  await writeFile(psPath, psScript)

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommand'))
  })

  process.chdir(baseDir)
  let res: any
  try {
    res = await psCommand(`Unblock-File -LiteralPath './${psName}'; & './${psName}'`, {
      cwd: baseDir
    })
  } catch (err) {
    on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.execStartCommandFail', {
          error: err,
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
    await writeFile(pidPath, pid)
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
      await writeFile(pidPath, res.pid)
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
    msg = (await readFileAsUTF8(errFile)) || 'Start Fail'
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
      await remove(pidPath)
    } catch (err) {}
  }

  const typeFlag = version.typeFlag
  const versionStr = version.version!.trim()

  const outFile = join(baseDir, `${typeFlag}-${versionStr}-start-out.log`.split(' ').join(''))
  const errFile = join(baseDir, `${typeFlag}-${versionStr}-start-error.log`.split(' ').join(''))

  let psScript = await readFile(join(global.Server.Static!, 'sh/flyenv-async-exec.cmd'), 'utf8')

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
  await writeFile(psPath, psScript)

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
  } catch (err) {
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
      await writeFile(pidPath, res.pid)
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
    msg = (await readFileAsUTF8(errFile)) || 'Start Fail'
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
      await remove(pidPath)
    } catch (err) {}
  }

  const typeFlag = version.typeFlag
  const versionStr = version.version!.trim()

  const outFile = join(baseDir, `${typeFlag}-${versionStr}-start-out.log`.split(' ').join(''))
  const errFile = join(baseDir, `${typeFlag}-${versionStr}-start-error.log`.split(' ').join(''))

  let psScript = await readFile(join(global.Server.Static!, 'sh/flyenv-async-exec.ps1'), 'utf8')

  psScript = psScript
    .replace('#ENV#', execEnv)
    .replace('#CWD#', cwdDir)
    .replace('#BIN#', bin)
    .replace('#ARGS#', execArgs)
    .replace('#OUTLOG#', outFile)
    .replace('#ERRLOG#', errFile)

  const psName = `${typeFlag}-${versionStr}-start.ps1`.split(' ').join('')
  const psPath = join(baseDir, psName)
  await writeFile(psPath, psScript)

  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommand'))
  })

  process.chdir(baseDir)
  let res: any
  try {
    res = await psCommand(`Unblock-File -LiteralPath './${psName}'; & './${psName}'`, {
      cwd: baseDir
    })
  } catch (err) {
    on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.execStartCommandFail', {
          error: err,
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
    pid = match[1] // content of the capture group (\d+)
  }
  await writeFile(pidPath, pid)
  on({
    'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: pid }))
  })
  return {
    'APP-Service-Start-PID': pid
  }
}
