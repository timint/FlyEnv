import { join } from 'path'
import { existsSync } from 'fs'
import { Base } from './Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import {
  brewInfoJson,
  execPromise,
  getAllFileAsync,
  mkdirp,
  moveChildDirToParent,
  portSearch,
  readdir,
  remove,
  versionBinVersion,
  versionFilterSame,
  versionFixed,
  versionLocalFetch,
  versionMacportsFetch,
  versionSort,
  waitTime,
  zipUnpack
} from '../Fn'
import TaskQueue from '../TaskQueue'
import { isMacOS, isWindows } from '@shared/utils'

class Perl extends Base {
  constructor() {
    super()
    this.type = 'perl'
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('perl')
        all.forEach((a: any) => {
          let dir = ''
          let zip = ''
          if (isMacOS()) {
            dir = join(global.Server.AppDir!, `perl`, a.version, 'perl')
            zip = join(global.Server.Cache!, `perl-${a.version}.zip`)
          } else if (isWindows()) {
            dir = join(global.Server.AppDir!, `perl`, a.version, 'perl/bin/perl.exe')
            zip = join(global.Server.Cache!, `perl-${a.version}.zip`)
          }
          a.appDir = join(global.Server.AppDir!, 'perl', a.version)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.name = `Perl-${a.version}`
        })
        resolve(all)
      } catch {
        resolve({})
      }
    })
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise(async (resolve) => {
      let versions: SoftInstalled[] = []
      let all: Promise<SoftInstalled[]>[] = []
      if (isMacOS()) {
        const base = '/opt/local/bin'
        const allSbinFile = await getAllFileAsync(base, false)
        const bins = allSbinFile.filter((f) => f.startsWith('perl5')).map((f) => `bin/${f}`)
        all = [
          versionLocalFetch(setup?.perl?.dirs ?? [], 'perl', 'perl'),
          versionMacportsFetch(bins)
        ]
      } else if (isWindows()) {
        all = [versionLocalFetch(setup?.perl?.dirs ?? [], 'perl.exe')]
      }
      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            const command = `"${item.bin}" --version`
            const reg = /(v)(\d+(\.\d+){1,4})(.*?)/g
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
    if (isMacOS()) {
      const dir = row.appDir
      await super._installSoftHandle(row)
      const subDirs = await readdir(dir)
      const subDir = subDirs.pop()
      if (subDir) {
        await execPromise(`cd ${join(dir, subDir)} && mv ./* ../`)
        await waitTime(300)
        await remove(join(dir, subDir))
      }
    } else if (isWindows()) {
      await remove(row.appDir)
      await mkdirp(row.appDir)
      await zipUnpack(row.zip, row.appDir)
      await moveChildDirToParent(row.appDir)
    }
  }

  brewinfo() {
    return new ForkPromise(async (resolve, reject) => {
      try {
        const all = ['perl']
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
        `"^perl[\\d\\.]+$"`,
        (f) => {
          return f.includes('lang') && f.includes('Practical Extraction and Report Language')
        },
        (name) => {
          return existsSync(join('/opt/local/bin/', name))
        }
      )
      resolve(Info)
    })
  }
}
export default new Perl()
