import { join } from 'path'
import { existsSync } from 'fs'
import { Base } from '../Base'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { mkdirp, remove } from '@shared/fs-extra'
import { moveChildDirToParent } from '../../util/Dir'
import { brewInfoJson, portSearch } from '../../util/Brew'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../../util/Version'
import { extractArchive } from '../../util/Archive'
import { serviceStartExec } from '../../util/ServiceStart'
import { AppLog } from '../../Fn'
import { ForkPromise } from '@shared/ForkPromise'
import { I18nT } from '@lang/index'
import TaskQueue from '../../TaskQueue'
import { isWindows } from '@shared/utils'

class Elasticsearch extends Base {
  constructor() {
    super()
    this.type = 'elasticsearch'
  }

  init() {
    this.pidPath = join(global.Server.BaseDir!, 'elasticsearch/elasticsearch.pid')
  }

  _startServer(version: SoftInstalled) {
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog(
          'info',
          I18nT('appLog.startServiceBegin', { service: `elasticsearch-${version.version}` })
        )
      })
      const bin = version.bin

      const baseDir = join(global.Server.BaseDir!, `elasticsearch`)
      await mkdirp(baseDir)

      if (isWindows()) {
        const execEnv = `set "ES_HOME=${version.path}"
set "ES_PATH_CONF=${join(version.path, 'config')}"
`
        const execArgs = `-d -p "${this.pidPath}"`

        try {
          const res = await serviceStartExecCMD({
            version,
            pidPath: this.pidPath,
            baseDir,
            bin,
            execArgs,
            execEnv,
            on,
            maxTime: 120,
            timeToWait: 1000
          })
          resolve(res)
        } catch (e: any) {
          console.log('-k start err: ', e)
          reject(e)
          return
        }
      } else {
        const execEnv = `export ES_HOME="${version.path}"
export ES_PATH_CONF="${join(version.path, 'config')}"
`
        const execArgs = `-d -p "${this.pidPath}"`

        try {
          const res = await serviceStartExec({
            version,
            pidPath: this.pidPath,
            baseDir,
            bin,
            execArgs,
            execEnv,
            on,
            maxTime: 60,
            timeToWait: 2000
          })
          resolve(res)
        } catch (e: any) {
          console.log('-k start err: ', e)
          reject(e)
          return
        }
      }
    })
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('elasticsearch')
        all.forEach((a: any) => {
          let dir = ''
          let zip = ''
          if (isWindows()) {
            dir = join(
              global.Server.AppDir!,
              'elasticsearch',
              `v${a.version}`,
              'bin/elasticsearch.bat'
            )
            zip = join(global.Server.Cache!, `elasticsearch-${a.version}.zip`)
          } else {
            dir = join(global.Server.AppDir!, 'elasticsearch', `v${a.version}`, 'bin/elasticsearch')
            zip = join(global.Server.Cache!, `static-elasticsearch-${a.version}.tar.gz`)
          }
          a.appDir = join(global.Server.AppDir!, 'elasticsearch', `v${a.version}`)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.name = `Elasticsearch-${a.version}`
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
        all = [versionLocalFetch(setup?.elasticsearch?.dirs ?? [], 'elasticsearch.bat')]
      } else {
        all = [
          versionLocalFetch(setup?.elasticsearch?.dirs ?? [], 'elasticsearch', 'elasticsearch')
        ]
      }
      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            const command = `"${item.bin}" --version`
            const reg = /(Version: )(\d+(\.\d+){1,4})(.*?)/g
            return TaskQueue.run(versionBinVersion, item.bin, command, reg)
          })
          if (all.length === 0) {
            return Promise.resolve([])
          }
          return Promise.all(all)
        })
        .then(async (list) => {
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
        const all = ['elasticsearch']
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
        `"^elasticsearch\\d*$"`,
        (f) => {
          return (
            f.includes('www') && f.includes('Fast, multi-platform web server with automatic HTTPS')
          )
        },
        (name) => {
          return existsSync(join('/opt/local/bin/', name))
        }
      )
      resolve(Info)
    })
  }
}
export default new Elasticsearch()
