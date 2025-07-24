import { join } from 'path'
import { existsSync } from 'fs'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { mkdirp, remove } from '@shared/fs-extra'
import { moveChildDirToParent } from '../util/Dir'
import { brewInfoJson, brewSearch, portSearch } from '../util/Brew'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../util/Version'
import { extractArchive } from '../util/Archive'
import TaskQueue from '../TaskQueue'
import { isMacOS, isWindows } from '@shared/utils'

class Ruby extends Base {
  constructor() {
    super()
    this.type = 'ruby'
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('ruby')
        all.forEach((a: any) => {
          const dir = join(global.Server.AppDir!, 'ruby', `v${a.version}`, 'bin/ruby.exe')
          const zip = join(global.Server.Cache!, `ruby-${a.version}.zip`)
          a.appDir = join(global.Server.AppDir!, 'ruby', `v${a.version}`)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.name = `Ruby-${a.version}`
        })
        resolve(all)
      } catch {
        resolve([])
      }
    })
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      let versions: SoftInstalled[] = []
      let all: Promise<SoftInstalled[]>[] = []
      if (isWindows()) {
        const dir = [...(setup?.ruby?.dirs ?? [])]
        all = [versionLocalFetch(dir, 'ruby.exe')]
      } else {
        const dir = [...(setup?.ruby?.dirs ?? []), '/opt/local/lib']
        all = [versionLocalFetch(dir, 'ruby', 'ruby')]
      }

      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            const command = `"${item.bin}" -v`
            const reg = /(ruby )(\d+(\.\d+){1,4})(.*?)/g
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
      await super._installSoftHandle(row)
    }
  }

  brewinfo() {
    console.log('ruby brewinfo !!!')
    return new ForkPromise(async (resolve, reject) => {
      try {
        let all: Array<string> = ['ruby']
        const command = 'brew search -q --formula "/^ruby@[\\d\\.]+$/"'
        console.log('brewinfo command: ', command)
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
        `"^ruby([\\d]+)?$"`,
        (f) => {
          return (
            f.includes('lang ruby') &&
            f.includes('Powerful and clean object-oriented scripting language')
          )
        },
        () => {
          return existsSync(join('/opt/local/lib/ruby/bin/erl'))
        }
      )
      resolve(Info)
    })
  }
}
export default new Ruby()
