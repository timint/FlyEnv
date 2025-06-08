import type { OnlineVersionItem, SoftInstalled } from '@shared/app'

import { I18nT } from '@lang/index'
import { basename, dirname, join } from 'path'
import { appendFileSync, copyFile, copyFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { spawn, execSync } from 'child_process'
import { ForkPromise } from '@shared/ForkPromise'
import { zipUnPack } from '@shared/file'
import axios from 'axios'
import { ProcessListSearch, ProcessPidList, ProcessPidListByPid } from '../Process'
import {
  AppLog,
  getAllFileAsync,
  moveChildDirToParent,
  uuid,
  waitTime
} from '../Fn'

export class Base {
  type: string
  pidPath: string
  constructor() {
    this.type = ''
    this.pidPath = ''
  }

  exec(fnName: string, ...args: any) {
    // @ts-ignore
    const fn: (...args: any) => ForkPromise<any> = this?.[fnName] as any
    return fn ? fn.call(this, ...args) : Promise.reject(new Error('No Method'))
  }

  initLocalApp(version: SoftInstalled, flag: string) {
    return new ForkPromise((resolve, reject, on) => {
      console.log('initLocalApp: ', version.bin, global.Server.AppDir)
      if (
        !existsSync(version.bin) &&
        version.bin.includes(join(global.Server.AppDir!, `${flag}-${version.version}`))
      ) {
        const local7ZFile = join(global.Server.Static!, `zip/${flag}-${version.version}.7z`)
        if (existsSync(local7ZFile)) {
          on({
            'APP-On-Log': AppLog(
              'info',
              I18nT('appLog.serviceUseBundle', { service: `${flag}-${version.version}` })
            )
          })
          zipUnPack(
            join(global.Server.Static!, `zip/${flag}-${version.version}.7z`),
            global.Server.AppDir!
          )
            .then(() => {
              on({
                'APP-On-Log': AppLog(
                  'info',
                  I18nT('appLog.bundleUnzipSuccess', { appDir: version.path })
                )
              })
              resolve(true)
            })
            .catch((e) => {
              on({
                'APP-On-Log': AppLog('error', I18nT('appLog.bundleUnzipFail', { error: e }))
              })
              reject(e)
            })
          return
        }
      }
      resolve(true)
    })
  }

  _startServer(version: SoftInstalled, ...args: any): ForkPromise<any> {
    console.log(version)
    console.log(args)
    return new ForkPromise<any>((resolve) => {
      resolve(true)
    })
  }

  stopService(version: SoftInstalled) {
    return this._stopServer(version)
  }

  startService(version: SoftInstalled, ...args: any) {
    return new ForkPromise(async (resolve, reject, on) => {
      if (!version?.version) {
        reject(new Error(I18nT('fork.versionNoFound')))
        return
      }
      try {
        await this._stopServer(version).on(on)
        const res = await this._startServer(version, ...args).on(on)
        if (res?.['APP-Service-Start-PID']) {
          const pid = res['APP-Service-Start-PID']
          const appPidFile = join(global.Server.BaseDir!, `pid/${this.type}.pid`)
          mkdirSync(dirname(appPidFile), { recursive: true })
          writeFileSync(appPidFile, `${pid}`.trim())
        }
        resolve(res)
      } catch (e) {
        reject(e)
      }
    })
  }

  _stopServer(version: SoftInstalled): ForkPromise<{ 'APP-Service-Stop-PID': number[] }> {
    console.log(version)
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.stopServiceBegin', { service: this.type }))
      })
      const appPidFile = join(global.Server.BaseDir!, `pid/${this.type}.pid`)
      if (existsSync(appPidFile)) {
        const pid = (readFileSync(appPidFile, 'utf-8')).trim()
        const pids = await ProcessPidListByPid(pid)
        console.log('_stopServer 0 pid: ', pid, pids)
        if (pids.length > 0) {
          const str = pids.map((s) => `/pid ${s}`).join(' ')
          try {
            execSync(`taskkill /f /t ${str}`)
          } catch (e) {}
        }
        on({
          'APP-Service-Stop-Success': true
        })
        try {
          unlinkSync(appPidFile)
        } catch (e) {}
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.stopServiceEnd', { service: this.type }))
        })
        resolve({
          'APP-Service-Stop-PID': pids
        })
        return
      }
      if (version?.pid) {
        const pids = await ProcessPidListByPid(`${version.pid}`.trim())
        console.log('_stopServer 1 pid: ', version.pid, pids)
        if (pids.length > 0) {
          const str = pids.map((s) => `/pid ${s}`).join(' ')
          try {
            execSync(`taskkill /f /t ${str}`)
          } catch (e) {}
        }
        on({
          'APP-Service-Stop-Success': true
        })
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.stopServiceEnd', { service: this.type }))
        })
        resolve({
          'APP-Service-Stop-PID': pids
        })
        return
      }
      const dis: { [k: string]: string } = {
        caddy: 'caddy',
        nginx: 'nginx',
        apache: 'httpd',
        mysql: 'mysqld',
        mariadb: 'mariadbd',
        memcached: 'memcached',
        mongodb: 'mongod',
        postgresql: 'postgres',
        'pure-ftpd': 'pure-ftpd',
        tomcat: 'org.apache.catalina.startup.Bootstrap',
        rabbitmq: 'rabbit',
        elasticsearch: 'org.elasticsearch.server/org.elasticsearch.bootstrap.Elasticsearch',
        ollama: 'ollama'
      }
      const serverName = dis[this.type]
      const pids = await ProcessListSearch(serverName, false)
      console.log('_stopServer 2 pid: ', serverName, pids)
      const all = pids.filter((item) => item.CommandLine.includes('PhpWebStudy-Data'))
      if (all.length > 0) {
        const str = all.map((s) => `/pid ${s.ProcessId}`).join(' ')
        try {
          execSync(`taskkill /f /t ${str}`)
        } catch (e) {}
      }
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.stopServiceEnd', { service: this.type }))
      })
      resolve({
        'APP-Service-Stop-PID': pids.map((s) => s.ProcessId)
      })
    })
  }

  async waitPidFile(
    pidFile: string,
    errLog?: string,
    time = 0
  ): Promise<
    | {
        pid?: string
        error?: string
      }
    | false
  > {
    let res:
      | {
          pid?: string
          error?: string
        }
      | false = false
    if (errLog && existsSync(errLog)) {
      const error = readFileSync(errLog, 'utf-8')
      if (error.length > 0) {
        return {
          error
        }
      }
    }
    if (existsSync(pidFile)) {
      const pid = (readFileSync(pidFile, 'utf-8')).trim()
      return {
        pid
      }
    } else {
      if (time < 20) {
        await waitTime(500)
        res = res || (await this.waitPidFile(pidFile, errLog, time + 1))
      } else {
        res = false
      }
    }
    console.log('waitPid: ', time, res)
    return res
  }

  getAxiosProxy() {
    const proxyUrl =
      Object.values(global?.Server?.Proxy ?? {})?.find((s: string) => s.includes('://')) ?? ''
    let proxy: any = {}
    if (proxyUrl) {
      try {
        const u = new URL(proxyUrl)
        proxy.protocol = u.protocol.replace(':', '')
        proxy.host = u.hostname
        proxy.port = u.port
      } catch (e) {
        proxy = undefined
      }
    } else {
      proxy = undefined
    }
    return proxy
  }

  async _fetchOnlineVersion(app: string): Promise<OnlineVersionItem[]> {
    let list: OnlineVersionItem[] = []
    try {
      const res = await axios({
        url: 'https://api.macphpstudy.com/api/version/fetch',
        method: 'post',
        data: {
          app,
          os: 'win',
          arch: 'x86'
        },
        proxy: this.getAxiosProxy()
      })
      list = res?.data?.data ?? []
    } catch (e) {}
    return list
  }

  installSoft(row: any) {
    return new ForkPromise(async (resolve, reject, on) => {
      const service = basename(row.appDir)
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.startInstall', { service }))
      })
      const refresh = () => {
        row.downloaded = existsSync(row.zip)
        row.installed = existsSync(row.bin)
      }

      const handlePython = async () => {
        const tmpDir = join(global.Server.Cache!, `python-${row.version}-tmp`)
        if (existsSync(tmpDir)) {
          execSync(`rmdir /S /Q ${tmpDir}`)
        }
        const dark = join(global.Server.Cache!, 'dark/dark.exe')
        const darkDir = join(global.Server.Cache!, 'dark')
        if (!existsSync(dark)) {
          const darkZip = join(global.Server.Static!, 'zip/dark.zip')
          await zipUnPack(darkZip, dirname(dark))
        }
        const pythonSH = join(global.Server.Static!, 'sh/python.ps1')
        let content = readFileSync(pythonSH, 'utf-8')
        const TMPL = tmpDir
        const EXE = row.zip
        const APPDIR = row.appDir

        content = content
          .replace(new RegExp(`#DARKDIR#`, 'g'), darkDir)
          .replace(new RegExp(`#TMPL#`, 'g'), TMPL)
          .replace(new RegExp(`#EXE#`, 'g'), EXE)
          .replace(new RegExp(`#APPDIR#`, 'g'), APPDIR)

        let sh = join(global.Server.Cache!, `python-install-${uuid()}.ps1`)
        writeFileSync(sh, content)

        process.chdir(global.Server.Cache!)
        try {
          execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '${sh}'; & '${sh}'"`)
        } catch (e) {
          console.log('[python-install][error]: ', e)
          appendFileSync(
            join(global.Server.BaseDir!, 'debug.log'),
            `[python][python-install][error]: ${e}\n`
          )
        }
        // unlinkSync(sh)

        const checkState = async (time = 0): Promise<boolean> => {
          let res = false
          const allProcess = await ProcessPidList()
          const find = allProcess.find(
            (p) => p?.CommandLine?.includes('msiexec.exe') && p?.CommandLine?.includes(APPDIR)
          )
          console.log('python checkState find: ', find)
          const bin = row.bin
          if (existsSync(bin) && !find) {
            res = true
          } else {
            if (time < 20) {
              await waitTime(1000)
              res = res || (await checkState(time + 1))
            }
          }
          return res
        }
        const res = await checkState()
        if (res) {
          await waitTime(1000)
          sh = join(global.Server.Cache!, `pip-install-${uuid()}.ps1`)
          let content = readFileSync(join(global.Server.Static!, 'sh/pip.ps1'), 'utf-8')
          content = content.replace('#APPDIR#', APPDIR)
          writeFileSync(sh, content)
          process.chdir(global.Server.Cache!)
          try {
            execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '${sh}'; & '${sh}'"`)
          } catch (e) {
            appendFileSync(
              join(global.Server.BaseDir!, 'debug.log'),
              `[python][pip-install][error]: ${e}\n`
            )
          }
          // unlinkSync(sh)
          await waitTime(1000)
          unlinkSync(tmpDir)
          return
        } else {
          try {
            await waitTime(500)
            rmSync(APPDIR, { recursive: true })
            rmSync(tmpDir, { recursive: true })
          } catch (e) {}
        }
        throw new Error('Python Install Fail')
      }

      const handleMemcached = async () => {
        const tmpDir = join(global.Server.Cache!, `memcached-${row.version}-tmp`)
        if (existsSync(tmpDir)) {
          rmSync(tmpDir, { recursive: true, force: true })
        }
        await zipUnPack(row.zip, tmpDir)
        let dir = join(tmpDir, `memcached-${row.version}`, 'libevent-2.1', 'x64')
        if (!existsSync(dir)) {
          dir = join(tmpDir, `memcached-${row.version}`, 'cygwin', 'x64')
        }
        if (existsSync(dir)) {
          const allFile = await getAllFileAsync(dir, false)
          if (!existsSync(row.appDir)) {
            mkdirSync(row.appDir, { recursive: true })
          }
          for (const f of allFile) {
            copyFileSync(join(dir, f), join(row.appDir, f))
          }
        }
        if (existsSync(tmpDir)) {
          rmSync(tmpDir, { recursive: true, force: true })
        }
      }

      const handleTwoLevDir = async () => {
        rmSync(row.appDir, { recursive: true, force: true })
        mkdirSync(row.appDir, { recursive: true })
        await zipUnPack(row.zip, row.appDir)
        await moveChildDirToParent(row.appDir)
      }

      const handleComposer = async () => {
        if (!existsSync(row.appDir)) {
          mkdirSync(row.appDir, { recursive: true })
        }
        copyFileSync(row.zip, join(row.appDir, 'composer.phar'))
        writeFileSync(
          join(row.appDir, 'composer.bat'),
          `@echo off
php "%~dp0composer.phar" %*`
        )
      }

      const handleMongoDB = async () => {
        await handleTwoLevDir()
        await waitTime(1000)
        // @ts-ignore
        await this.initMongosh()
      }

      const handleMeilisearch = async () => {
        await waitTime(500)
        mkdirSync(dirname(row.bin), { recursive: true })
        try {
          await new Promise((resolve, reject) => {
            copyFile(row.zip, row.bin, (err) => {
              if (err) return reject(err)
              resolve(true)
            })
          })
          await waitTime(500)
          await spawn(basename(row.bin), ['--version'], {
            shell: false,
            cwd: dirname(row.bin)
          })
        } catch (e: any) {
          if (existsSync(row.bin)) {
            unlinkSync(row.bin)
          }
          appendFileSync(
            join(global.Server.BaseDir!, 'debug.log'),
            `[handleMeilisearch][error]: ${e.toString()}\n`
          )
          throw e
        }
      }

      const handleRust = async () => {
        rmSync(row.appDir, { recursive: true, force: true })
        mkdirSync(row.appDir, { recursive: true })
        const cacheDir = join(global.Server.Cache!, uuid())
        mkdirSync(cacheDir, { recursive: true })
        await zipUnPack(row.zip, cacheDir)
        const files = readdirSync(cacheDir)
        const find = files.find((f) => f.includes('.tar'))
        if (!find) {
          throw new Error('UnZIP failed')
        }
        await zipUnPack(join(cacheDir, find), row.appDir)
        await moveChildDirToParent(row.appDir)
        rmSync(cacheDir, { recursive: true, force: true })
      }

      const doHandleZip = async () => {
        const two = [
          'java',
          'tomcat',
          'golang',
          'maven',
          'rabbitmq',
          'mariadb',
          'ruby',
          'elasticsearch'
        ]
        if (two.includes(row.type)) {
          await handleTwoLevDir()
        } else if (row.type === 'memcached') {
          await handleMemcached()
        } else if (row.type === 'composer') {
          await handleComposer()
        } else if (row.type === 'python') {
          await handlePython()
        } else if (row.type === 'mongodb') {
          await handleMongoDB()
        } else if (row.type === 'meilisearch') {
          await handleMeilisearch()
        } else if (row.type === 'rust') {
          await handleRust()
        } else {
          await zipUnPack(row.zip, row.appDir)
        }
      }

      if (existsSync(row.zip)) {
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.installFromZip', { service }))
        })
        row.progress = 100
        on(row)
        let success = false
        try {
          await doHandleZip()
          success = true
          refresh()
        } catch (e) {
          refresh()
          console.log('ERROR: ', e)
          on({
            'APP-On-Log': AppLog('error', I18nT('appLog.installFromZipFail', { error: e }))
          })
        }
        if (success) {
          row.downState = 'success'
          row.progress = 100
          on(row)
          if (row.installed) {
            on({
              'APP-On-Log': AppLog(
                'info',
                I18nT('appLog.installSuccess', { service, appDir: row.appDir })
              )
            })
          } else {
            on({
              'APP-On-Log': AppLog('error', I18nT('appLog.installFail', { service, error: 'null' }))
            })
          }
          resolve(true)
          return
        }
        unlinkSync(row.zip)
      }

      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.startDown', { service, url: row.url }))
      })

      axios({
        method: 'get',
        url: row.url,
        proxy: this.getAxiosProxy(),
        responseType: 'stream',
        onDownloadProgress: (progress) => {
          if (progress.total) {
            const percent = Math.round((progress.loaded * 100.0) / progress.total)
            row.progress = percent
            on(row)
          }
        }
      })
        .then(function (response) {
          const stream = createWriteStream(row.zip)
          response.data.pipe(stream)
          stream.on('error', (err: any) => {
            on({
              'APP-On-Log': AppLog('error', I18nT('appLog.downFail', { service, error: err }))
            })
            console.log('stream error: ', err)
            row.downState = 'exception'
            try {
              if (existsSync(row.zip)) {
                unlinkSync(row.zip)
              }
            } catch (e) {}
            refresh()
            on(row)
            setTimeout(() => {
              resolve(false)
            }, 1500)
          })
          stream.on('finish', async () => {
            on({
              'APP-On-Log': AppLog('info', I18nT('appLog.downSuccess', { service }))
            })
            row.downState = 'success'
            try {
              if (existsSync(row.zip)) {
                await doHandleZip()
              }
              refresh()
            } catch (e) {
              refresh()
              on({
                'APP-On-Log': AppLog('info', I18nT('appLog.installFail', { service, error: e }))
              })
            }
            on(row)
            if (row.installed) {
              on({
                'APP-On-Log': AppLog(
                  'info',
                  I18nT('appLog.installSuccess', { service, appDir: row.appDir })
                )
              })
            } else {
              on({
                'APP-On-Log': AppLog(
                  'error',
                  I18nT('appLog.installFail', { service, error: 'null' })
                )
              })
            }
            resolve(true)
          })
        })
        .catch((err) => {
          on({
            'APP-On-Log': AppLog('error', I18nT('appLog.downFail', { service, error: err }))
          })
          console.log('down error: ', err)
          row.downState = 'exception'
          try {
            if (existsSync(row.zip)) {
              unlinkSync(row.zip)
            }
          } catch (e) {}
          refresh()
          on(row)
          setTimeout(() => {
            resolve(false)
          }, 1500)
        })
    })
  }
}
