import { join } from 'path'
import { chmod, copyFile } from './fs-extra'
import { appDebugLog, isWindows } from '@shared/utils'
import { execPromise } from '@shared/child-process'
import { existsSync } from 'fs'

class EnvSync {
  AppEnv: Record<string, any> | undefined
  constructor() {}

  async sync() {
    if (this.AppEnv) {
      return this.AppEnv
    }
    if (isWindows()) {
      const path = [
        process.env['PATH'],
        '%SYSTEMROOT%\\System32\\WindowsPowerShell\\v1.0\\'
      ].filter(Boolean).join(';')
      this.AppEnv = { ...process.env, PATH: path, ...(global.Server.Proxy || {}) }
      return this.AppEnv
    }
    const file = join(global.Server.Cache!, 'env.sh')
    await copyFile(join(global.Server.Static!, 'sh/env.sh'), file)
    let text = ''
    const shells = ['/bin/zsh', '/bin/bash', '/bin/sh']
    const shell = shells.find((s) => existsSync(s))
    try {
      await chmod(file, '0777')
      const res = await execPromise(`./env.sh`, {
        cwd: global.Server.Cache!,
        shell
      })
      text = res.stdout
    } catch (e: any) {
      appDebugLog('[env][sync][error]', e.toString()).catch()
    }

    this.AppEnv = process.env
    text
      .toString()
      .trim()
      .split('\n')
      .forEach((l: string) => {
        const arr = l.split('=')
        const k = arr.shift()
        const v = arr.join('')
        if (k) {
          this.AppEnv![k] = v
        }
      })
    this.AppEnv!['PATH'] = [
      this.AppEnv!['PATH'],
      '/opt',
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/Homebrew/bin',
      '/opt/local/bin',
      '/opt/local/sbin',
      '/usr/local/bin',
      '/usr/bin',
      '/usr/sbin'
    ].filter(Boolean).join(':')
    if (global.Server.Proxy) {
      for (const k in global.Server.Proxy) {
        this.AppEnv![k] = global.Server.Proxy[k]
      }
    }
    return this.AppEnv!
  }
}

export default new EnvSync()
