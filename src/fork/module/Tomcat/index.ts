import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import { execPromise } from '@shared/child-process'
import { chmod, copyFile, mkdirp, readFile, readdir, remove, writeFile } from '@shared/fs-extra'
import { moveChildDirToParent } from '../util/Dir'
import { brewInfoJson, brewSearch } from '../util/Brew'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../util/Version'
import { extractArchive } from '../util/Archive'
import { serviceStartExec } from '../util/ServiceStart'
import { AppLog, waitTime } from '../Fn'
import TaskQueue from '../TaskQueue'
import { makeGlobalTomcatServerXML } from './service/ServiceItemJavaTomcat'
import { I18nT } from '@lang/index'
import { isLinux, isWindows } from '@shared/utils'
import { ProcessListSearch } from '@shared/Process.win'

class Tomcat extends Base {
  constructor() {
    super()
    this.type = 'tomcat'
  }

  init() {
    this.pidPath = join(global.Server.BaseDir!, 'tomcat/tomcat.pid')
  }

  fetchAllOnlineVersion() {
    console.log('Tomcat fetchAllOnlineVersion !!!')
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('tomcat')
        all.forEach((a: any) => {
          let dir = ''
          let zip = ''
          if (isWindows()) {
            dir = join(global.Server.AppDir!, `tomcat-${a.version}`, 'bin/catalina.bat')
            zip = join(global.Server.Cache!, `tomcat-${a.version}.zip`)
            a.appDir = join(global.Server.AppDir!, `tomcat-${a.version}`)
          } else {
            dir = join(global.Server.AppDir!, `static-tomcat-${a.version}`, 'bin/catalina.sh')
            zip = join(global.Server.Cache!, `static-tomcat-${a.version}.tar.gz`)
            a.appDir = join(global.Server.AppDir!, `static-tomcat-${a.version}`)
          }

          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
          a.name = `Tomcat-${a.version}`
        })
        resolve(all)
      } catch {
        resolve({})
      }
    })
  }

  async _fixStartBat(version: SoftInstalled) {
    const file = join(dirname(version.bin), 'setclasspath.bat')
    if (existsSync(file)) {
      let content = await readFile(file, 'utf-8')
      content = content.replace(
        `set "_RUNJAVA=%JRE_HOME%\\bin\\java.exe"`,
        `set "_RUNJAVA=%JRE_HOME%\\bin\\javaw.exe"`
      )
      await writeFile(file, content)
    }
  }

  _initDefaultDir(version: SoftInstalled, baseDir?: string) {
    return new ForkPromise(async (resolve, reject, on) => {
      let dir = ''
      if (baseDir) {
        dir = baseDir
      } else {
        const v = version?.version?.split('.')?.shift() ?? ''
        dir = join(global.Server.BaseDir!, `tomcat/tomcat${v}`)
      }
      if (existsSync(dir) && existsSync(join(dir, 'conf/server.xml'))) {
        resolve(dir)
        return
      }
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.confInit'))
      })
      const files = [
        'catalina.policy',
        'catalina.properties',
        'context.xml',
        'jaspic-providers.xml',
        'jaspic-providers.xsd',
        'tomcat-users.xml',
        'tomcat-users.xsd',
        'logging.properties',
        'web.xml',
        'server.xml'
      ]
      const fromConfDir = join(dirname(dirname(version.bin)), 'conf')
      const toConfDir = join(dir, 'conf')
      await mkdirp(toConfDir)
      for (const file of files) {
        const src = join(fromConfDir, file)
        if (existsSync(src)) {
          await copyFile(src, join(toConfDir, file))
        }
      }
      on({
        'APP-On-Log': AppLog(
          'info',
          I18nT('appLog.confInitSuccess', { file: join(dir, 'conf/server.xml') })
        )
      })
      resolve(dir)
    })
  }

  _startServer(version: SoftInstalled, CATALINA_BASE?: string) {
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog(
          'info',
          I18nT('appLog.startServiceBegin', { service: `${this.type}-${version.version}` })
        )
      })
      const bin = version.bin

      if (isWindows()) {
        await this._fixStartBat(version)
      }

      const baseDir: any = await this._initDefaultDir(version, CATALINA_BASE).on(on)
      await makeGlobalTomcatServerXML({
        path: baseDir
      } as any)

      await mkdirp(join(baseDir, 'logs'))

      const tomcatDir = join(global.Server.BaseDir!, 'tomcat')
      const execArgs = ``

      if (isWindows()) {
        const execEnv = `set "CATALINA_BASE=${baseDir}"`
        try {
          await serviceStartExec({
            version,
            pidPath: this.pidPath,
            baseDir: tomcatDir,
            bin,
            execArgs,
            execEnv,
            on,
            checkPidFile: false
          })
        } catch (e: any) {
          console.log('-k start err: ', e)
          reject(e)
          return
        }

        const checkPid = (): Promise<{ pid: string } | undefined> => {
          return new Promise((resolve) => {
            const doCheck = async (time: number) => {
              const pids = await ProcessListSearch(`-Dcatalina.base="${baseDir}"`, false)
              if (pids.length > 0) {
                const pid = pids.pop()!
                resolve({
                  pid: pid.PID
                })
              } else {
                if (time < 20) {
                  await waitTime(2000)
                  await doCheck(time + 1)
                } else {
                  resolve(undefined)
                }
              }
            }
            doCheck(0).then().catch()
          })
        }
        await waitTime(3000)
        const res = await checkPid()
        if (res && res?.pid) {
          await writeFile(this.pidPath, `${res.pid}`)
          on({
            'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: res.pid }))
          })
          resolve({
            'APP-Service-Start-PID': res.pid
          })
          return
        }
        on({
          'APP-On-Log': AppLog(
            'error',
            I18nT('appLog.execStartCommandFail', {
              error: 'Start failed',
              service: `${this.type}-${version.version}`
            })
          )
        })
        reject(new Error('Start failed'))
      } else {
        const execEnv = `export CATALINA_BASE="${baseDir}"
export CATALINA_PID="${this.pidPath}"`
        try {
          const res = await serviceStartExec({
            root: isLinux(),
            version,
            pidPath: this.pidPath,
            baseDir: tomcatDir,
            bin,
            execArgs,
            execEnv,
            on
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

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      let versions: SoftInstalled[] = []
      let all: Promise<SoftInstalled[]>[] = []
      if (isWindows()) {
        all = [versionLocalFetch(setup?.tomcat?.dirs ?? [], 'catalina.bat')]
      } else {
        all = [versionLocalFetch(setup?.tomcat?.dirs ?? [], 'catalina.sh', 'tomcat')]
      }
      Promise.all(all)
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          if (isWindows()) {
            const all = versions.map((item) => {
              const bin = join(dirname(item.bin), 'version.bat')
              const command = `call "${bin}"`
              const reg = /(Server version: Apache Tomcat\/)(.*?)(\n)/g
              return TaskQueue.run(versionBinVersion, item.bin, command, reg)
            })
            return Promise.all(all)
          } else {
            const all: any[] = []
            for (const item of versions) {
              const bin = join(dirname(item.bin), 'version.sh')
              await chmod(bin, '0777')
              const command = `"${bin}"`
              const reg = /(Server version: Apache Tomcat\/)(.*?)(\n)/g
              all.push(TaskQueue.run(versionBinVersion, bin, command, reg))
            }
            return Promise.all(all)
          }
          return Promise.resolve([])
        })
        .then((list) => {
          list.forEach((v, i) => {
            const { error, version } = v
            const num = version
              ? Number(versionFixed(version).split('.').slice(0, 2).join(''))
              : null
            const bin = isWindows()
              ? join(dirname(versions[i].bin), 'startup.bat')
              : join(dirname(versions[i].bin), 'startup.sh')
            Object.assign(versions[i], {
              bin,
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
        const command = 'brew search -q --formula "/^tomcat((@[\\d\\.]+)?)$/"'
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
      resolve({})
    })
  }
}
export default new Tomcat()
