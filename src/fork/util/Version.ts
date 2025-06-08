import type { SoftInstalled } from '@shared/app'
import { existsSync, realpathSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { compareVersions } from 'compare-versions'
import { getAllFileAsync, fetchPathByBin, getSubDirAsync } from 'FileSystem'

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
    console.log('binPath: ', binPath)
    binPath = realpathSync(binPath)
    if (!existsSync(binPath)) {
      return false
    }
    if (!statSync(binPath).isFile()) {
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
      } catch (e) {}
      resolve({
        version
      })
    }
    try {
      const res = execSync(command, {
        cwd: dirname(bin)
      })
      console.log('versionBinVersion: ', command, reg, res)
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
