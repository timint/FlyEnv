import { join } from 'path'
import { existsSync } from 'fs'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { mkdirp, remove } from '@shared/fs-extra'
import { moveChildDirToParent } from '../../util/Dir'
import { brewInfoJson, portSearch } from '../../util/Brew'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../../util/Version'
import { extractArchive } from '../../util/Archive'
import { waitTime } from '@shared/utils'
import TaskQueue from '../../TaskQueue'
import { isMacOS, isWindows } from '@shared/utils'

class Maven extends Base {
  constructor() {
    super()
    this.type = 'maven'
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('maven')
        all.forEach((a: any) => {
          let dir = ''
          let zip = ''
          if (isWindows()) {
            dir = join(global.Server.AppDir!, `maven-${a.version}`, 'bin/mvn.cmd')
            zip = join(global.Server.Cache!, `maven-${a.version}.zip`)
            a.appDir = join(global.Server.AppDir!, `maven-${a.version}`)
          } else {
            dir = join(global.Server.AppDir!, `maven-${a.version}`, 'bin/mvn')
            zip = join(global.Server.Cache!, `maven-${a.version}.tar.gz`)
            a.appDir = join(global.Server.AppDir!, `maven-${a.version}`)
          }

          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.type = 'maven'
          a.name = `Maven-${a.version}`
        })
        resolve(all)
      } catch (e) {
        console.log('fetchAllOnlineVersion error: ', e)
        resolve([])
      }
    })
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      let versions: SoftInstalled[] = []
      let all: Promise<SoftInstalled[]>[] = []
      if (isWindows()) {
        all = [versionLocalFetch(setup?.maven?.dirs ?? [], 'mvn.cmd')]
      } else {
        const dirs = setup?.maven?.dirs ?? []
        all = [versionLocalFetch([...dirs, '/opt/local/share/java/'], 'mvn', 'maven')]
      }

      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const reg = /(Apache Maven )(.*?)( )/g
          const all = versions.map((item) => {
            const command = `"${item.bin}" --version`
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
        const all = ['maven']
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
        `"^maven\\d*$"`,
        (f) => {
          return f.toLowerCase().includes('a java-based build and project management environment.')
        },
        (name) => {
          return existsSync(`/opt/local/share/java/${name}/bin/mvn`)
        }
      )
      resolve(Info)
    })
  }
}
export default new Maven()
