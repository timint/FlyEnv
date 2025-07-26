import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { mkdirp, remove } from '@shared/fs-extra'
import { moveChildDirToParent } from '../../util/Dir'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../../util/Version'
import { brewInfoJson, brewSearch, portSearch } from '../../util/Brew'
import { extractArchive } from '../../util/Archive'
import TaskQueue from '../../TaskQueue'
import { isWindows } from '@shared/utils'

class GoLang extends Base {
  constructor() {
    super()
    this.type = 'golang'
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('golang')
        all.forEach((a: any) => {
          let dir = ''
          let zip = ''
          if (isWindows()) {
            dir = join(global.Server.AppDir!, `static-go-${a.version}`, 'bin/go.exe')
            zip = join(global.Server.Cache!, `static-go-${a.version}.zip`)
          } else {
            dir = join(global.Server.AppDir!, `static-go-${a.version}`, 'bin/go')
            zip = join(global.Server.Cache!, `static-go-${a.version}.tar.gz`)
          }
          a.appDir = join(global.Server.AppDir!, `static-go-${a.version}`)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.name = `Go-${a.version}`
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
        all = [versionLocalFetch(setup?.golang?.dirs ?? [], 'go.exe')]
      } else {
        all = [versionLocalFetch(setup?.golang?.dirs ?? [], 'gofmt', 'go')]
      }
      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            let bin = item.bin
            if (!isWindows()) {
              bin = join(dirname(item.bin), 'go')
            }
            const command = `"${bin}" version`
            const reg = /( go)(.*?)( )/g
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
      await extractArchive(row.zip, row.appDir)
      await moveChildDirToParent(row.appDir)
    } else {
      const dir = row.appDir
      await super._installSoftHandle(row)
      await moveChildDirToParent(dir)
      }
    }

  brewinfo() {
    return new ForkPromise(async (resolve, reject) => {
      try {
        let all: Array<string> = []
        const command = 'brew search -q --formula "/^go$/"'
        all = await brewSearch(all, command)
        const info = await brewInfoJson(all)
        resolve(info)
      } catch (e) {
        reject(e)
        return
      }
    })
  }

  portinfo() {
    return new ForkPromise(async (resolve) => {
      const Info: { [k: string]: any } = await portSearch(
        `"^go$"`,
        (f) => {
          return f.includes(
            'compiled, garbage-collected, concurrent programming language developed by Google Inc.'
          )
        },
        () => {
          return existsSync(join('/opt/local/lib/go/bin/gofmt'))
        }
      )
      resolve(Info)
    })
  }
}
export default new GoLang()
