import { join } from 'path'
import { existsSync } from 'fs'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { execPromise } from '@shared/child-process'
import { mkdirp, readdir, remove } from '@shared/fs-extra'
import { moveChildDirToParent } from '../util/Dir'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../util/Version'
import { extractArchive } from '../util/Archive'
import { waitTime } from '../Fn'
import TaskQueue from '../TaskQueue'
import { isMacOS, isWindows } from '@shared/utils'
import Helper from '../Helper'

class Bun extends Base {
  constructor() {
    super()
    this.type = 'bun'
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('bun')
        all.forEach((a: any) => {
          let dir = ''
          let zip = ''
          if (isWindows()) {
            dir = join(global.Server.AppDir!, `bun`, a.version, 'bun.exe')
            zip = join(global.Server.Cache!, `bun-${a.version}.zip`)
          } else {
            dir = join(global.Server.AppDir!, `bun`, a.version, 'bun')
            zip = join(global.Server.Cache!, `bun-${a.version}.zip`)
          }
          a.appDir = join(global.Server.AppDir!, 'bun', a.version)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.name = `Bun-${a.version}`
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
        all = [versionLocalFetch(setup?.bun?.dirs ?? [], 'bun.exe')]
      } else {
        all = [versionLocalFetch(setup?.bun?.dirs ?? [], 'bun', 'bun')]
      }
      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            const command = `"${item.bin}" --version`
            const reg = /(.*?)(\d+(\.\d+){1,4})(.*?)/g
            return TaskQueue.run(versionBinVersion, item.bin, command, reg)
          })
          return Promise.all(all)
        })
        .then((list) => {
          list.forEach((v, i) => {
            const { error, version } = v
            const num = version
              ? Number(versionFixed(version).split('.').slice(0, 2).join(''))
              : null
            Object.assign(versions[i], {
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
      await zipUnpack(row.zip, row.appDir)
      await moveChildDirToParent(row.appDir)
    } else {
      const dir = row.appDir
      await super._installSoftHandle(row)
      await moveChildDirToParent(dir)
      try {
      await Helper.send('mailpit', 'binFixed', row.bin)
    } else if (isWindows()) {
      await remove(row.appDir)
      await mkdirp(row.appDir)
      await extractArchive(row.zip, row.appDir)
      await moveChildDirToParent(row.appDir)
    }
  }
}
export default new Bun()
