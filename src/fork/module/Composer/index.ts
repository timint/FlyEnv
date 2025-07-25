import { join } from 'path'
import { existsSync } from 'fs'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { chmod, copyFile, mkdirp, readFile, writeFile } from '@shared/fs-extra'
import { brewInfoJson } from '../../util/Brew'
import { versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../../util/Version'
import TaskQueue from '../../TaskQueue'
import { isWindows } from '@shared/utils'

class Composer extends Base {
  constructor() {
    super()
    this.type = 'composer'
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('composer')
        all.forEach((a: any) => {
          let bin = ''
          let zip = ''
          if (isWindows()) {
            bin = join(global.Server.AppDir!, `composer-${a.version}`, 'composer.phar')
            zip = join(global.Server.Cache!, `composer-${a.version}.phar`)
          } else {
            bin = join(global.Server.AppDir!, `composer-${a.version}`, 'composer')
            zip = join(global.Server.Cache!, `composer-${a.version}.phar`)
          }
          a.appDir = join(global.Server.AppDir!, `composer-${a.version}`)
          a.zip = zip
          a.bin = bin
          a.downloaded = existsSync(zip)
          a.installed = existsSync(bin)
          a.type = 'composer'
          a.name = `Composer-${a.version}`
        })
        resolve(all)
      } catch (e) {
        console.log('fetchAllOnlineVersion error: ', e)
        resolve([])
      }
    })
  }

  async _installSoftHandle(row: any): Promise<void> {
    if (isWindows()) {
      if (!existsSync(row.appDir)) {
        await mkdirp(row.appDir)
      }
      await copyFile(row.zip, join(row.appDir, 'composer.phar'))
      await writeFile(
        join(row.appDir, 'composer.bat'),
        `@echo off
php "%~dp0composer.phar" %*`
      )
    } else {
      if (!existsSync(row.appDir)) {
        await mkdirp(row.appDir)
    }
      const bin = join(row.appDir, 'composer')
      await copyFile(row.zip, bin)
      await chmod(bin, '0777')
  }
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      const binVersion = (bin: string): Promise<{ version?: string; error?: string }> => {
        return new Promise(async (resolve) => {
          const reg = /(public const VERSION = ')(\d+(\.\d+){1,4})(';)/g
          const handleCatch = (err: any) => {
            resolve({
              error: '<br/>' + err.toString().trim().replace(new RegExp('\n', 'g'), '<br/>'),
              version: undefined
            })
          }
          const handleThen = (res: any) => {
            const str = res.stdout + res.stderr
            let version: string | undefined = ''
            try {
              version = reg?.exec(str)?.[2]?.trim()
              reg!.lastIndex = 0
            } catch {}
            resolve({
              version
            })
          }
          try {
            const res = await readFile(bin, 'utf-8')
            handleThen({
              stdout: res,
              stderr: ''
            })
          } catch (e) {
            handleCatch(e)
          }
        })
      }
      let versions: SoftInstalled[] = []
      let all: Promise<SoftInstalled[]>[] = []
      if (isWindows()) {
        all = [versionLocalFetch(setup?.composer?.dirs ?? [], 'composer.phar')]
      } else {
        all = [versionLocalFetch(setup?.composer?.dirs ?? [], 'composer', 'composer')]
      }
      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => TaskQueue.run(binVersion, item.bin))
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

  brewinfo() {
    return new ForkPromise(async (resolve, reject) => {
      try {
        const all = ['composer']
        const info = await brewInfoJson(all)
        resolve(info)
      } catch (e) {
        reject(e)
        return
      }
    })
  }
}
export default new Composer()
