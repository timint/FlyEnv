import type { OnlineVersionItem, SoftInstalled } from '@shared/app'

import { join, dirname, basename } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { Base } from './Base'
import { I18nT } from '@lang/index'
import { ForkPromise } from '@shared/ForkPromise'
import TaskQueue from '../TaskQueue'
import { sleep } from '@shared/Helpers/General'
import { versionBinVersion, versionFilterSame, versionFixed, versionLocalFetch, versionSort } from '../util/Version'
import { AppLog, serviceStartExecCMD, setDir777ToCurrentUser } from '../Fn'

class Manager extends Base {
  constructor() {
    super()
    this.type = 'postgresql'
  }

  init() {}

  _startServer(version: SoftInstalled, lastVersion?: SoftInstalled, DATA_DIR?: string) {
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog(
          'info',
          I18nT('appLog.startServiceBegin', { service: `${this.type}-${version.version}` })
        )
      })
      const bin = version.bin
      const versionTop = version?.version?.split('.')?.shift() ?? ''
      const dbPath = DATA_DIR ?? join(global.Server.PostgreSqlDir!, `postgresql${versionTop}`)
      const confFile = join(dbPath, 'postgresql.conf')
      const pidFile = join(dbPath, 'postmaster.pid')
      const logFile = join(dbPath, 'pg.log')
      let sendUserPass = false

      mkdirSync(global.Server.PostgreSqlDir!, { recursive: true })

      const doRun = async () => {
        const execArgs = `-D "${dbPath}" -l "${logFile}" start`

        try {
          const res = await serviceStartExecCMD(
            version,
            pidFile,
            global.Server.PostgreSqlDir!,
            bin,
            execArgs,
            '',
            on
          )
          if (sendUserPass) {
            on(I18nT('fork.postgresqlInit', { dir: dbPath }))
          }
          const pid = res['APP-Service-Start-PID'].trim().split('\n').shift()!.trim()
          on({
            'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: pid }))
          })
          resolve({
            'APP-Service-Start-PID': pid
          })
        } catch (e: any) {
          console.log('-k start err: ', e)
          reject(e)
          return
        }
      }

      console.log('confFile: ', confFile, existsSync(confFile))

      if (existsSync(confFile)) {
        await doRun()
      } else if (!existsSync(dbPath) || (existsSync(dbPath) && readdirSync(dbPath).length === 0)) {
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.initDBDataDir'))
        })
        process.env.LC_ALL = global.Server.Local!
        process.env.LANG = global.Server.Local!

        console.log('global.Server.Local: ', global.Server.Local)
        mkdirSync(dbPath, { recursive: true })
        try {
          await setDir777ToCurrentUser(dbPath)
        } catch (e) {}

        const binDir = dirname(bin)
        const initDB = join(binDir, 'initdb.exe')
        process.chdir(dirname(initDB))
        const command = `start /B ./${basename(initDB)} -D "${dbPath}" -U root > NUL 2>&1 &`
        try {
          execSync(command)
        } catch (e) {
          on({
            'APP-On-Log': AppLog('error', I18nT('appLog.initDBDataDirFail', { error: e }))
          })
          reject(e)
          return
        }
        await sleep(1000)
        if (!existsSync(confFile)) {
          on({
            'APP-On-Log': AppLog(
              'error',
              I18nT('appLog.initDBDataDirFail', { error: `Data Dir ${dbPath} create faild` })
            )
          })
          reject(new Error(`Data Dir ${dbPath} create faild`))
          return
        }
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.initDBDataDirSuccess', { dir: dbPath }))
        })
        let conf = readFileSync(confFile, 'utf-8')
        let find = conf.match(/lc_messages = '(.*?)'/g)
        conf = conf.replace(find?.[0] ?? '###@@@&&&', `lc_messages = '${global.Server.Local}'`)
        find = conf.match(/lc_monetary = '(.*?)'/g)
        conf = conf.replace(find?.[0] ?? '###@@@&&&', `lc_monetary = '${global.Server.Local}'`)
        find = conf.match(/lc_numeric = '(.*?)'/g)
        conf = conf.replace(find?.[0] ?? '###@@@&&&', `lc_numeric = '${global.Server.Local}'`)
        find = conf.match(/lc_time = '(.*?)'/g)
        conf = conf.replace(find?.[0] ?? '###@@@&&&', `lc_time = '${global.Server.Local}'`)

        writeFileSync(confFile, conf)

        const defaultConfFile = join(dbPath, 'postgresql.conf.default')
        copyFileSync(confFile, defaultConfFile)
        sendUserPass = true
        await doRun()
      } else {
        reject(new Error(`Data Dir ${dbPath} has exists, but conf file not found in dir`))
      }
    })
  }

  fetchAllOnlineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('postgresql')
        all.forEach((a: any) => {
          const dir = join(
            global.Server.AppDir!,
            `postgresql-${a.version}`,
            `pgsql`,
            'bin/pg_ctl.exe'
          )
          const zip = join(global.Server.Cache!, `postgresql-${a.version}.zip`)
          a.appDir = join(global.Server.AppDir!, `postgresql-${a.version}`)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
        })
        resolve(all)
      } catch (e) {
        resolve([])
      }
    })
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      let versions: SoftInstalled[] = []
      Promise.all([versionLocalFetch(setup?.postgresql?.dirs ?? [], 'pg_ctl.exe')])
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            const command = `${basename(item.bin)} --version`
            const reg = /(\s)(\d+(\.\d+){1,4})(.*?)/g
            return TaskQueue.run(versionBinVersion, item.bin, command, reg)
          })
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
}

export default new Manager()
