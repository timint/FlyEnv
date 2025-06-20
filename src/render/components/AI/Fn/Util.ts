import { merge } from 'lodash'
import type BaseTask from '@/components/AI/Task/BaseTask'
import installedVersions from '@/util/InstalledVersions'
import IPC from '@/util/IPC'
import { AllAppModule } from '@/core/type'

const { exec } = require('child_process')

export function fixEnv(): { [k: string]: any } {
  const env = { ...process.env }
  const defaultPaths = [
    '/opt',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/opt/local/bin',
    '/opt/local/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin'
  ]
  if (!env['PATH']) {
    env['PATH'] = defaultPaths.join(':')
  } else {
    env['PATH'] = [
      ...defaultPaths,
      env['PATH']
    ].join(':')
  }
  if (global.Server.Proxy) {
    for (const k in global.Server.Proxy) {
      env[k] = global.Server.Proxy[k]
    }
  }
  return env
}

export function execPromise(
  command: string,
  opt?: { [k: string]: any }
): Promise<{
  stdout: string
  stderr: string
}> {
  return new Promise((resolve, reject) => {
    try {
      exec(
        command,
        merge(
          {
            env: fixEnv()
          },
          opt
        ),
        (error: any, stdout: string, stderr: string) => {
          if (!error) {
            resolve({
              stdout: stdout.toString(),
              stderr: stderr.toString()
            })
          } else {
            reject(error.toString())
          }
        }
      )
    } catch (err) {
      reject(err)
    }
  })
}

export function killPort(this: BaseTask, ports: Array<string>) {
  return new Promise(async (resolve) => {
    const pids: Set<string> = new Set()
    for (const port of ports) {
      let res: any = await execPromise(
        `echo '${global.Server.Password}' | sudo -S lsof -nP -i:${port} | grep '(LISTEN)' | awk '{print $1,$2,$3,$9,$10}'`
      )
      res = res?.stdout ?? ''
      const arr: Array<string> = res
        .split('\n')
        .filter((p: string) => p.includes(`:${port} (LISTEN)`))
        .map((a: any) => {
          const list = a.split(' ').filter((s: string) => {
            return s.trim().length > 0
          })
          console.info('list: ', list)
          list.shift()
          return list.shift()
        })
      arr.forEach((a: string) => pids.add(a))
    }
    if (pids.size > 0) {
      const pidStr: string = Array.from(pids).join(' ')
      try {
        await execPromise(`echo '${global.Server.Password}' | sudo -S kill -9 ${pidStr}`)
      } catch (err) {}
    }
    resolve(true)
  })
}

export function killPid(this: BaseTask, pids: Array<string>) {
  return new Promise(async (resolve) => {
    const pidStr: string = pids.join(' ')
    try {
      await execPromise(`echo '${global.Server.Password}' | sudo -S kill -9 ${pidStr}`)
    } catch (err) {}
    resolve(true)
  })
}

export function fetchInstalled(flags: Array<AllAppModule>) {
  return new Promise(async (resolve) => {
    installedVersions.allInstalledVersions(flags).then(() => {
      resolve(true)
    })
  })
}

export function wordSplit(txt: string) {
  return new Promise((resolve) => {
    IPC.send('app-fork:tools', 'wordSplit', txt).then((key: string, res: any) => {
      IPC.off(key)
      console.debug('wordSplit: ', res?.data)
      resolve(res?.data ?? [])
    })
  })
}
