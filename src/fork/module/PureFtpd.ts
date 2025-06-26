import { basename, dirname, join } from 'path'
import { existsSync, statSync } from 'fs'
import { Base } from './Base'
import { I18nT } from '@lang/index'
import type { FtpItem, SoftInstalled } from '@shared/app'
import {
  brewInfoJson,
  execPromise,
  portSearch,
  uuid,
  versionFilterSame,
  versionFixed,
  versionLocalFetch,
  versionSort,
  readFile,
  writeFile,
  mkdirp,
  chmod,
  remove,
  execPromiseSudo,
  spawnPromiseWithStdin
} from '../Fn'
import { ForkPromise } from '@shared/ForkPromise'
import TaskQueue from '../TaskQueue'

class Manager extends Base {
  constructor() {
    super()
    this.type = 'pure-ftpd'
  }

  init() {
    this.pidPath = join(global.Server.FTPDir!, 'pure-ftpd.pid')
  }

  initConf() {
    return this._initConf()
  }
  _initConf(): ForkPromise<string> {
    return new ForkPromise(async (resolve) => {
      await mkdirp(global.Server.FTPDir!)
      const confFile = join(global.Server.FTPDir!, 'pure-ftpd.conf')
      if (!existsSync(confFile)) {
        let content = await readFile(join(global.Server.Static!, 'tmpl/pure-ftpd.conf'), 'utf-8')
        content = content.replace(new RegExp('##DIR##', 'g'), global.Server.FTPDir!)
        await writeFile(confFile, content)
        await writeFile(join(global.Server.FTPDir!, 'pure-ftpd.conf.default'), content)
      }
      resolve(confFile)
    })
  }

  _startServer(version: SoftInstalled, openInTerminal?: boolean) {
    return new ForkPromise(async (resolve, reject) => {
      const confFile = await this._initConf()
      const bin = version.bin
      const pidfile = join(global.Server.FTPDir!, 'pure-ftpd.pid')
      let command = `cd "${dirname(bin)}" && sudo -S ./${basename(bin)} "${confFile}"`
      if (openInTerminal) {
        command = command.replace(/"/g, '\\"')
        const appleScript = `
        tell application "Terminal"
          if not running then
            activate
            do script "${command}" in front window
          else
            activate
            do script "${command}"
          end if
        end tell`
        const scptFile = join(global.Server.Cache!, `${uuid()}.scpt`)
        await writeFile(scptFile, appleScript)
        await chmod(scptFile, '0777')
        try {
          await execPromise(`osascript ./${basename(scptFile)}`, {
            cwd: global.Server.Cache!
          })
          await remove(scptFile)
        } catch (e) {
          await remove(scptFile)
          return reject(e)
        }
      } else {
        await execPromiseSudo(command)
      }
      const res = await this.waitPidFile(pidfile, undefined, openInTerminal ? 60 : 20)
      if (res && res?.pid) {
        resolve({
          'APP-Service-Start-PID': res.pid
        })
        return
      }
      const error = res ? res?.error : I18nT('fork.startFail')
      reject(new Error(error))
    })
  }

  getPort() {
    return new ForkPromise(async (resolve) => {
      let port: any = 21
      const conf = join(global.Server.FTPDir!, 'pure-ftpd.conf')
      if (existsSync(conf)) {
        const content = await readFile(conf, 'utf-8')
        const reg = new RegExp('Bind(.*?),(.*?)\n', 'g')
        let result
        if ((result = reg.exec(content)) != null) {
          port = result[2].trim()
        }
      }
      resolve(port)
    })
  }

  getAllFtp() {
    return new ForkPromise(async (resolve) => {
      const json = join(global.Server.FTPDir!, 'pureftpd.json')
      const all = []
      if (existsSync(json)) {
        try {
          const txt = await readFile(json, 'utf-8')
          const arr = JSON.parse(txt.toString())
          all.push(...arr)
        } catch {}
      }
      resolve(all)
    })
  }

  async _delFtp(item: FtpItem, version: SoftInstalled) {
    const cwd = join(version.path, 'bin')
    const user = item.user
    const pdb = join(global.Server.FTPDir!, 'pureftpd.pdb')
    const passwd = join(global.Server.FTPDir!, 'pureftpd.passwd')
    const command = `./pure-pw userdel ${user} -f ${passwd} -F ${pdb} -m`
    try {
      await execPromise(command, { cwd })
    } catch {}
  }

  delFtp(item: FtpItem, version: SoftInstalled) {
    return new ForkPromise(async (resolve, reject) => {
      const bin = join(version.path, 'bin/pure-pw')
      if (!existsSync(bin)) {
        reject(new Error(I18nT('fork.binNotFound')))
        return
      }
      await this._initConf()
      await this._delFtp(item, version)
      const json = join(global.Server.FTPDir!, 'pureftpd.json')
      const all = []
      if (existsSync(json)) {
        try {
          const txt = await readFile(json, 'utf-8')
          const arr = JSON.parse(txt.toString())
          all.push(...arr)
        } catch {}
      }
      const findOld = all.findIndex((a) => a.user === item.user)
      if (findOld >= 0) {
        all.splice(findOld, 1)
      }
      await writeFile(json, JSON.stringify(all))
      resolve(true)
    })
  }

  addFtp(item: FtpItem, version: SoftInstalled) {
    return new ForkPromise(async (resolve, reject) => {
      const bin = join(version.path, 'bin/pure-pw')
      if (!existsSync(bin)) {
        reject(new Error(I18nT('fork.binNotFound')))
        return
      }
      await this._initConf()
      await this._delFtp(item, version)

      const dir = item.dir
      const dirStat = statSync(dir)

      const cwd = join(version.path, 'bin')
      const user = item.user
      const pass = item.pass
      const pdb = join(global.Server.FTPDir!, 'pureftpd.pdb')
      const passwd = join(global.Server.FTPDir!, 'pureftpd.passwd')

      const stdout: Array<string> = []
      const promise = spawnPromiseWithStdin(
        './pure-pw',
        [
          'useradd',
          user,
          '-u',
          `${dirStat.uid}`,
          '-g',
          `${dirStat.gid}`,
          '-d',
          dir,
          '-F',
          pdb,
          '-f',
          passwd,
          '-m'
        ],
        {
          cwd
        }
      )

      promise
        .on((data, stdinFn: (txt: string) => void) => {
          stdout.push(data)
          const txt = data.toString().trim()
          if (txt === 'Password:' || txt === 'Enter it again:') {
            stdinFn(pass)
          }
        })
        .then(async () => {
          const json = join(global.Server.FTPDir!, 'pureftpd.json')
          const all = []
          if (existsSync(json)) {
            try {
              const txt = await readFile(json, 'utf-8')
              const arr = JSON.parse(txt.toString())
              all.push(...arr)
            } catch {}
          }
          const findOld = all.findIndex((a) => a.user === item.user)
          if (findOld >= 0) {
            all.splice(findOld, 1, item)
          } else {
            all.unshift(item)
          }
          await writeFile(json, JSON.stringify(all))
          resolve(true)
        })
        .catch(() => {
          reject(new Error(stdout.join('')))
        })
    })
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      const binVersion = (bin: string): Promise<{ version?: string; error?: string }> => {
        return new Promise(async (resolve) => {
          const reg = /(#Software: Pure-FTPd )(\d+(\.\d+){1,4})(.*?)/g
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
      Promise.all([versionLocalFetch(setup?.['pure-ftpd']?.dirs ?? [], 'pure-ftpd', 'pure-ftpd')])
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            return TaskQueue.run(binVersion, item.bin)
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

  brewinfo() {
    return new ForkPromise(async (resolve, reject) => {
      try {
        const all: Array<string> = ['pure-ftpd']
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
        `^pure-ftpd\\d*$`,
        (f) => {
          return f.includes(
            'Pure-FTPd is a fast, production-quality, standard-conformant FTP (SSL/TLS) server, based upon Troll-FTPd.'
          )
        },
        () => {
          return (
            existsSync(join('/opt/local/bin', 'pure-pw')) ||
            existsSync(join('/opt/local/sbin', 'pure-ftpd'))
          )
        }
      )
      resolve(Info)
    })
  }
}

export default new Manager()
