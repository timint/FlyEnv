import { appendFileSync, chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, isAbsolute, join, normalize, parse } from 'path'
import { execSync } from 'child_process'
import { spawnPromise } from '../Fn'
import { ForkPromise } from '@shared/ForkPromise'
import { userInfo, hostname } from 'os'
import { sleep } from '../../shared/Helpers/General'
import iconv from 'iconv-lite'
import chardet from 'chardet'

// Note this function seems unused, but it is a utility function that can be useful in some cases
export function chmodRecursiveSync(fp: string, mode: string) {
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
      chmodRecursiveSync(fPath, mode)
    }
  })
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
    } catch (e) {}
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
  const files = readdirSync(dirPath, { withFileTypes: true })
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
  const files = readdirSync(dirPath, { withFileTypes: true })
  for (const file of files) {
    const childPath = join(dirPath, file.name)
    if (file.isDirectory()) {
      const name = fullpath ? childPath : file.name
      list.push(name)
    }
  }
  return list
}


export const fetchRawPATH = (): ForkPromise<string[]> => {
  return new ForkPromise(async (resolve, reject) => {
    const sh = join(global.Server.Static!, 'sh/path-get.ps1')
    const copySh = join(global.Server.Cache!, 'path-get.ps1')
    if (existsSync(copySh)) {
      unlinkSync(copySh)
    }
    copyFileSync(sh, copySh)
    process.chdir(global.Server.Cache!)
    let res: any
    try {
      res = await spawnPromise(
        'powershell.exe',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          `"Unblock-File -LiteralPath './path-get.ps1'; & './path-get.ps1'"`
        ],
        {
          shell: 'powershell.exe',
          cwd: global.Server.Cache!
        }
      )
    } catch (e) {
      appendFileSync(join(global.Server.BaseDir!, 'debug.log'), `[_fetchRawPATH][error]: ${e}\n`)
      return reject(e)
    }

    let str = ''
    const stdout = res.trim()
    console.log('fetchRawPATH stdout: ', stdout)
    const regex = /FlyEnv-PATH-GET([\s\S]*?)FlyEnv-PATH-GET/g
    const match = regex.exec(stdout)
    if (match) {
      str = match[1].trim()
    }
    console.log('fetchRawPATH str: ', {
      str
    })
    str = str.replace(new RegExp(`\r\n`, 'g'), '').replace(new RegExp(`\n`, 'g'), '')
    if (!str.includes(':\\') && !str.includes('%')) {
      return resolve([])
    }
    const oldPath = Array.from(new Set(str.split(';') ?? []))
      .filter((s) => !!s.trim())
      .map((s) => s.trim())
    console.log('_fetchRawPATH: ', str, oldPath)
    resolve(oldPath)
  })
}

export const handleWinPathArr = (paths: string[]) => {
  return Array.from(new Set(paths))
    .map((p) => {
      return p.trim()
    })
    .filter((p) => {
      if (!p) {
        return false
      }
      return isAbsolute(p) || p.includes('%') || p.includes('$env:')
    })
    .sort((a, b) => {
      // 判断a的类型
      const aType = isAbsolute(a)
        ? 1
        : a.startsWith('%SystemRoot%')
          ? 2
          : a.includes('%') || a.includes('$env:')
            ? 3
            : 4
      // 判断b的类型
      const bType = isAbsolute(b)
        ? 1
        : b.startsWith('%SystemRoot%')
          ? 2
          : b.includes('%') || b.includes('$env:')
            ? 3
            : 4
      // 比较优先级
      return aType - bType
    })
}

export const writePath = async (path: string[], other: string = '') => {
  console.log('writePath paths: ', path)
  const sh = join(global.Server.Static!, 'sh/path-set.ps1')
  const copySh = join(global.Server.Cache!, 'path-set.ps1')
  if (existsSync(copySh)) {
    unlinkSync(copySh)
  }
  const pathStr = path.join(';')
  let content = readFileSync(sh, 'utf-8')
  content = content.replace('##NEW_PATH##', pathStr).replace('##OTHER##', other)
  writeFileSync(copySh, content, 'utf-8')
  process.chdir(global.Server.Cache!)
  try {
    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '${copySh}'; & '${copySh}'"`
    execSync(command)
  } catch (e) {
    console.log('writePath error: ', e)
    appendFileSync(join(global.Server.BaseDir!, 'debug.log'), `[writePath][error]: ${e}\n`)
  }
}

export const addPath = async (dir: string) => {
  let allPath: string[] = []
  try {
    allPath = await fetchRawPATH()
  } catch (e) {
    return
  }
  const index = allPath.indexOf(dir)
  if (index === 0) {
    return
  }
  if (index > 0) {
    allPath.splice(index, 1)
  }
  allPath.unshift(dir)
  const savePath = handleWinPathArr(allPath)
  try {
    await writePath(savePath)
  } catch (e) {}
}

/**
 * move dir's file and sub dir to other dir
 * @param src
 * @param dest
 */
export async function moveDirToDir(src: string, dest: string) {
  // Read the source directory
  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true })
      // Recursively move subdirectories
      await moveDirToDir(srcPath, destPath)
    } else {
      // Move file
      renameSync(srcPath, destPath)
    }
  }
}

export async function moveChildDirToParent(dir: string) {
  const sub = readdirSync(dir)
  for (const s of sub) {
    const sdir = join(dir, s)
    await moveDirToDir(sdir, dir)
    unlinkSync(sdir)
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
    const command = `powershell -command "Get-Volume -DriveLetter ${driveLetter} | ConvertTo-Json"`
    const result = execSync(command, { encoding: 'utf-8' }) ?? ''
    const { FileSystem, FileSystemType } = JSON.parse(result)
    const is = FileSystem === 'NTFS' || FileSystemType === 'NTFS'
    NTFS[driveLetter] = is
    return is
  } catch (error) {
    return false
  }
}

export async function readFileAsUTF8(filePath: string): Promise<string> {
  try {
    const buffer: Buffer = readFileSync(filePath)
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
        `Error converting from ${detectedEncoding} to UTF-8 for file: ${filePath}`,
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
    console.error(`Directory does not exist: ${folderPath}`)
    return
  }

  const username = userInfo().username
  const domain = hostname()
  const identity = `"${domain}\\${username}"`

  const args = [
    `"${normalize(folderPath)}"`,
    '/grant',
    `${identity}:(F)`, // Note: no extra quotes here
    '/t',
    '/c',
    '/q'
  ]

  console.log(`Executing: icacls ${args.join(' ')}`)
  appendFileSync(
    join(global.Server.BaseDir!, 'debug.log'),
    `[setDir777ToCurrentUser][args]: icacls ${args.join(' ')}\n`
  )
  try {
    await spawnPromise('icacls', args, {
      shell: true,
      windowsHide: true
    })
  } catch (e) {
    appendFileSync(
      join(global.Server.BaseDir!, 'debug.log'),
      `[setDir777ToCurrentUser][error]: ${e}\n`
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
    const pid = (readFileSync(pidFile, 'utf-8')).trim()
    return {
      pid
    }
  } else {
    if (time < maxTime) {
      await sleep(timeToWait)
      res = res || (await waitPidFile(pidFile, time + 1, maxTime, timeToWait))
    } else {
      res = false
    }
  }
  console.log('waitPid: ', time, res)
  return res
}
