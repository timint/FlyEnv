import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { execPromise } from '@shared/child-process'
import { mkdirp, readdir, remove } from '@shared/fs-extra'
import { moveChildDirToParent } from '../util/Dir'
import { brewInfoJson } from '../util/Brew'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../util/Version'
import { extractArchive } from '../util/Archive'
import { uuid, waitTime } from '../Fn'
import TaskQueue from '../TaskQueue'
import { basename, join } from 'path'
import { existsSync } from 'fs'
import { isWindows } from '@shared/utils'

class Rust extends Base {
  constructor() {
    super()
    this.type = 'rust'
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('rust')
        all.forEach((a: any) => {
          let dir = ''
          let zip = ''
          if (isWindows()) {
            dir = join(global.Server.AppDir!, `rust`, a.version, 'cargo/bin/cargo.exe')
            zip = join(global.Server.Cache!, `rust-${a.version}.tar.xz`)
            a.appDir = join(global.Server.AppDir!, `rust`, a.version)
          } else {
            dir = join(global.Server.AppDir!, `rust-${a.version}`, 'bin/cargo')
            zip = join(global.Server.Cache!, `rust-${a.version}.tar.xz`)
            a.appDir = join(global.Server.AppDir!, `rust-${a.version}`)
          }

          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.name = `Rust-${a.version}`
        })
        resolve(all)
      } catch {
        resolve({})
      }
    })
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      let versions: SoftInstalled[] = []
      let all: Promise<SoftInstalled[]>[] = []
      if (isWindows()) {
        all = [versionLocalFetch([...(setup?.rust?.dirs ?? [])], 'cargo.exe')]
      } else {
        all = [versionLocalFetch([...(setup?.rust?.dirs ?? [])], 'cargo', 'rust')]
      }
      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) =>
            TaskQueue.run(
              versionBinVersion,
              item.bin,
              `"${item.bin}" --version`,
              /(cargo )(\d+(\.\d+){1,4})(.*?)/g
            )
          )
          return Promise.all(all)
        })
        .then((list) => {
          list.forEach((v, i) => {
            const { error, version } = v
            const num = version
              ? Number(versionFixed(version).split('.').slice(0, 2).join(''))
              : null
            const item = versions[i]
            if (isWindows()) {
              item.path = join(item.path, '../')
            } else {
              if (item.path.includes(global.Server.AppDir!)) {
                const p = join(item.path, '../bin/cargo')
                if (existsSync(p)) {
                  item.path = join(p, '../../')
                }
              }
            }

            Object.assign(item, {
              version: version,
              num,
              enable: version !== null,
              error
            })
          })
          resolve(versionSort(versions))
        })
        .catch(() => {
          resolve([])
        })
    })
  }

  async _installSoftHandle(row: any): Promise<void> {
    if (isWindows()) {
      await remove(row.appDir)
      await mkdirp(row.appDir)
      const cacheDir = join(global.Server.Cache!, uuid())
      await mkdirp(cacheDir)
      await zipUnpack(row.zip, cacheDir)
      const files = await readdir(cacheDir)
      const find = files.find((f) => f.includes('.tar'))
      if (!find) {
        throw new Error('UnZIP failed')
      }
      await zipUnpack(join(cacheDir, find), row.appDir)
      await moveChildDirToParent(row.appDir)
      await remove(cacheDir)
    } else {
      const dir = row.appDir
      await super._installSoftHandle(row)
      await moveChildDirToParent(dir)
      const appBinDir = join(row.appDir, 'bin')
      await mkdirp(appBinDir)
      const subDirs = await readdir(row.appDir)
      for (const d of subDirs) {
        const binDir = join(row.appDir, d, 'bin')
        if (existsSync(binDir)) {
          const binFiles = await readdir(binDir)
          for (const bin of binFiles) {
            const srcFile = join(binDir, bin)
            const destFile = join(appBinDir, basename(bin))
            if (!existsSync(destFile) && existsSync(srcFile)) {
              try {
                await execPromise(['ln', '-s', `"${srcFile}"`, `"${destFile}"`].join(' '))
              } catch {}
            }
          }
        }
      }
    } else if (isWindows()) {
      await remove(row.appDir)
      await mkdirp(row.appDir)
      const cacheDir = join(global.Server.Cache!, uuid())
      await mkdirp(cacheDir)
      await extractArchive(row.zip, cacheDir)
      const files = await readdir(cacheDir)
      const find = files.find((f) => f.includes('.tar'))
      if (!find) {
        throw new Error('UnZIP failed')
      }
      await extractArchive(join(cacheDir, find), row.appDir)
      await moveChildDirToParent(row.appDir)
      await remove(cacheDir)
    }

  brewinfo() {
    return new ForkPromise(async (resolve, reject) => {
      try {
        const all: Array<string> = ['rust']
        const info = await brewInfoJson(all)
        resolve(info)
      } catch (e) {
        reject(e)
        return
      }
    })
  }
}
export default new Rust()
