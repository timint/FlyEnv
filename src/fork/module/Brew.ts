import { join } from 'path'
import { existsSync } from 'fs'
import { Base } from './Base'
import { execPromiseWithEnv, spawnPromiseWithEnv, copyFile, unlink, chmod } from '../Fn'
import { ForkPromise } from '@shared/ForkPromise'

class Brew extends Base {
  constructor() {
    super()
  }

  addTap(name: string) {
    return new ForkPromise(async (resolve, reject) => {
      try {
        const stdout = (await spawnPromiseWithEnv('brew', ['tap'])).stdout
        if (!stdout.includes(name)) {
          await spawnPromiseWithEnv('brew', ['tap', name])
          resolve(2)
        } else {
          resolve(1)
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  currentSrc() {
    return new ForkPromise(async (resolve, reject) => {
      try {
        const src = (
          await spawnPromiseWithEnv('git', ['remote', '-v'], {
            cwd: global.Server.BrewHome
          })
        ).stdout
        let value = 'default'
        if (src.includes('tsinghua.edu.cn')) {
          value = 'tsinghua'
        } else if (src.includes('bfsu.edu.cn')) {
          value = 'bfsu'
        } else if (src.includes('cloud.tencent.com')) {
          value = 'tencent'
        } else if (src.includes('aliyun.com')) {
          value = 'aliyun'
        } else if (src.includes('ustc.edu.cn')) {
          value = 'ustc'
        }
        resolve(value)
      } catch (e) {
        reject(e)
      }
    })
  }

  changeSrc(srcFlag: string) {
    return new ForkPromise(async (resolve, reject) => {
      try {
        const sh = join(global.Server.Static!, 'sh/brew-src.sh')
        const copyfile = join(global.Server.Cache!, 'brew-src.sh')
        if (existsSync(copyfile)) {
          await unlink(copyfile)
        }
        await copyFile(sh, copyfile)
        await chmod(copyfile, '0777')
        await execPromiseWithEnv(`source brew-src.sh ${srcFlag} ${global.Server.BrewHome}`, {
          cwd: global.Server.Cache
        })
        resolve(true)
      } catch (e) {
        reject(e)
      }
    })
  }

  fetchAllPhpExtensions(num: string) {
    return new ForkPromise(async (resolve, reject) => {
      const names: { [k: string]: string } = {
        pecl_http: 'http.so',
        phalcon3: 'phalcon.so',
        phalcon4: 'phalcon.so',
        phalcon5: 'phalcon.so'
      }
      const zend = ['xdebug']
      try {
        const allTap = await execPromiseWithEnv('brew tap')
        if (!allTap.stdout.includes('shivammathur/extensions')) {
          await execPromiseWithEnv('brew tap shivammathur/extensions')
        }
        const command = `brew search --formula "/shivammathur\\/extensions\\/[\\s\\S]+${num}$/"`
        let content: any = await execPromiseWithEnv(command, {
          env: {
            HOMEBREW_NO_INSTALL_FROM_API: 1
          }
        })
        content = content.stdout
          .split('\n')
          .filter((s: string) => !!s.trim())
          .map((s: string) => {
            const name = s.replace('shivammathur/extensions/', '').replace(`@${num}`, '')
            const res: { [k: string]: any } = {
              name,
              libName: s,
              installed: false,
              status: false,
              soname: names[name] ?? `${name}.so`,
              flag: 'homebrew'
            }
            if (zend.includes(name)) {
              res['extendPre'] = 'zend_extension='
            }
            return res
          })
        resolve(content)
      } catch (err) {
        reject(err)
      }
    })
  }

  fetchAllPhpExtensionsByPort(num: string) {
    return new ForkPromise(async (resolve, reject) => {
      const names: { [k: string]: string } = {
        pecl_http: 'http.so',
        phalcon3: 'phalcon.so',
        phalcon4: 'phalcon.so',
        phalcon5: 'phalcon.so',
        tideways_xhprof: 'xhprof.so',
        postgresql: 'pgsql.so',
        mysql: 'mysqli.so'
      }
      const zend: Array<string> = ['xdebug']
      try {
        const numStr = `${num}`.split('.').join('')
        const command = `port search --name --line php${numStr}-`
        console.log('command: ', command)
        let res: any = await execPromiseWithEnv(command)
        res = res?.stdout.toString() ?? ''
        const arr = res
          .split('\n')
          .filter((f: string) => {
            return !!f.trim() && !f.includes('lang www')
          })
          .map((m: string) => {
            const a = m.split('\t').filter((f) => f.trim().length > 0)
            const libName = a.shift() ?? ''
            const name = libName.replace(`php${numStr}-`, '').toLowerCase()
            const item: { [k: string]: any } = {
              name,
              libName,
              installed: false,
              status: false,
              soname: names[name] ?? `${name}.so`,
              flag: 'macports'
            }
            if (zend.includes(name)) {
              item['extendPre'] = 'zend_extension='
            }
            return item
          })
        resolve(arr)
      } catch (err) {
        reject(err)
      }
    })
  }
}

export default new Brew()
