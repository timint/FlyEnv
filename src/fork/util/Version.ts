import { statSync, realpathSync } from 'node:fs'
import * as process from 'node:process'
import { dirname, join } from 'path'
import { compareVersions } from 'compare-versions'
import type { SoftInstalled } from '@shared/app'
import { execPromise } from '@shared/child-process'
import { existsSync } from '@shared/fs-extra'
import { isMacOS, isWindows } from '@shared/utils'
import { getSubDirAsync } from './Dir'
import { fetchPathByBin } from '../Fn'

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
  console.log('versionCheckBin: ', binPath)
  if (existsSync(binPath)) {
    console.log('binPath: ', binPath)
    binPath = realpathSync(binPath)
    if (!existsSync(binPath)) {
      return false
    }
    const stat = statSync(binPath)
    console.log('stat: ', stat.isFile(), stat.isDirectory(), stat.isSymbolicLink())
    if (!stat.isFile()) {
      return false
    }
    console.log('binPath realpathSync: ', binPath)
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
      } catch {}
      resolve({
        version
      })
    }
    const cwd = dirname(bin)
    try {
      process.chdir(cwd)
      const res = await execPromise(command, {
        cwd,
        shell: undefined
      })
      console.log('versionBinVersion: ', command, reg, bin, res)
      handleThen(res)
    } catch (e) {
      console.log('versionBinVersion err: ', e)
      handleCatch(e)
    }
  })
}

export const versionDirCache: Record<string, string[]> = {}

export const versionLocalFetch = async (
  customDirs: string[],
  binName: string,
  searchName?: string,
  binPaths?: string[]
): Promise<Array<SoftInstalled>> => {
  const installed: Set<string> = new Set()
  let searchDepth1Dir: string[] = []
  let searchDepth2Dir: string[] = []
  if (isMacOS()) {
    searchDepth1Dir = ['/', '/opt', '/usr', ...customDirs]
    searchDepth2Dir = [global.Server.AppDir!]
    if (searchName) {
      const base = ['/usr/local/Cellar', '/opt/homebrew/Cellar']
      for (const b of base) {
        const subDir = versionDirCache?.[b] ?? (await getSubDirAsync(b))
        if (!versionDirCache?.[b]) {
          versionDirCache[b] = subDir
        }
        const subDirFilter = subDir.filter((f) => {
          return f.includes(searchName)
        })
        for (const f of subDirFilter) {
          const subDir1 = versionDirCache?.[f] ?? (await getSubDirAsync(f))
          if (!versionDirCache?.[f]) {
            versionDirCache[f] = subDir1
          }
          for (const s of subDir1) {
            searchDepth2Dir.push(s)
          }
        }
      }
    }
  } else if (isWindows()) {
    searchDepth1Dir = [...customDirs]
    searchDepth2Dir = [global.Server.AppDir!]
  }

  const checkedDir: Set<string> = new Set()

  const findInstalled = async (dir: string, depth = 0, maxDepth = 2) => {
    if (!existsSync(dir)) {
      return
    }
    dir = realpathSync(dir)
    if (checkedDir.has(dir)) {
      return
    }
    let binPath: string | boolean = false
    if (binPaths) {
      for (const p of binPaths) {
        binPath = versionCheckBin(join(dir, p))
        if (binPath) {
          installed.add(binPath)
          checkedDir.add(dir)
          return
        }
      }
    }
    binPath = versionCheckBin(join(dir, `${binName}`))
    if (binPath) {
      installed.add(binPath)
      checkedDir.add(dir)
      return
    }
    binPath = versionCheckBin(join(dir, `bin/${binName}`))
    if (binPath) {
      installed.add(binPath)
      checkedDir.add(dir)
      return
    }
    binPath = versionCheckBin(join(dir, `sbin/${binName}`))
    if (binPath) {
      installed.add(binPath)
      checkedDir.add(dir)
      return
    }
    if (depth >= maxDepth) {
      checkedDir.add(dir)
      return
    }
    checkedDir.add(dir)
    const sub = versionDirCache?.[dir] ?? (await getSubDirAsync(dir))
    if (!versionDirCache?.[dir]) {
      versionDirCache[dir] = sub
    }
    for (const s of sub) {
      await findInstalled(s, depth + 1, maxDepth)
    }
  }

  for (const s of searchDepth1Dir) {
    await findInstalled(s, 0, 1)
  }

  for (const s of searchDepth2Dir) {
    await findInstalled(s)
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
      path,
      run: false,
      running: false
    }
    if (!list.find((f) => f.path === item.path && f.bin === item.bin)) {
      list.push(item as any)
    }
  }
  return list
}

export const versionMacportsFetch = async (bins: string[]): Promise<Array<SoftInstalled>> => {
  const list: Array<SoftInstalled> = []
  const base = '/opt/local/'
  const find = (fpm: string) => {
    let bin = join(base, fpm)
    if (existsSync(bin)) {
      bin = realpathSync(bin)
      const path = fetchPathByBin(bin)
      const item = {
        bin,
        path: `${path}/`,
        run: false,
        running: false
      }
      list.push(item as any)
    }
    return true
  }
  for (const fpm of bins) {
    find(fpm)
  }
  list.forEach((item) => {
    item.flag = 'macports'
  })
  return list
}
