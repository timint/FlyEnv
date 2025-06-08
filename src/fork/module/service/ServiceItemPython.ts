import type { AppHost } from '@shared/app'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { getHostItemEnv, ServiceItem } from './ServiceItem'
import { ForkPromise } from '@shared/ForkPromise'
import { suExecPromise } from '../../Fn'
import { ProcessPidListByPid } from '../../Process'
import { EOL } from 'os'

export class ServiceItemPython extends ServiceItem {
  start(item: AppHost) {
    return new ForkPromise(async (resolve, reject) => {
      if (this.exit) {
        reject(new Error('Exit'))
        return
      }
      this.host = item
      await this.stop()

      if (!item.bin || !existsSync(item.bin)) {
        reject(new Error(`Run File not exists: ${item.bin}`))
        return
      }

      if (!item.root || !existsSync(item.root)) {
        reject(new Error(`Run Directory not exists: ${item.root}`))
        return
      }

      if (!item.pythonDir || !existsSync(item.pythonDir)) {
        reject(new Error(`Python not exists: ${item.pythonDir}`))
        return
      }

      const javaDir = join(global.Server.BaseDir!, 'python')
      mkdirSync(javaDir, { recursive: true })
      const pid = join(javaDir, `${item.id}.pid`)
      const log = join(javaDir, `${item.id}.log`)
      if (existsSync(pid)) {
        try {
          await suExecPromise(`del -Force ${pid}`)
        } catch (e) {}
      }

      const opt = await getHostItemEnv(item)
      const commands: string[] = ['@echo off', 'chcp 65001>nul']
      if (opt && opt?.env) {
        for (const k in opt.env) {
          const v = opt.env[k]
          if (v.includes(' ')) {
            commands.push(`set "${k}=${v}"`)
          } else {
            commands.push(`set ${k}=${v}`)
          }
        }
      }
      commands.push(`set PATH="${dirname(item.pythonDir!)};%PATH%"`)
      commands.push(`cd /d "${dirname(item.pythonDir!)}"`)
      commands.push(`start /B ${item.startCommand} > "${log}" 2>&1 &`)

      this.command = commands.join(EOL)
      console.log('command: ', this.command)
      const sh = join(global.Server.Cache!, `service-${this.id}.cmd`)
      writeFileSync(sh, this.command)
      process.chdir(global.Server.Cache!)
      try {
        await suExecPromise(
          `powershell.exe -Command "(Start-Process -FilePath ./service-${this.id}.cmd -PassThru -WindowStyle Hidden).Id" > "${pid}"`
        )
        const cpid = await this.checkPid()
        this.daemon()
        resolve({
          'APP-Service-Start-PID': cpid
        })
      } catch (e) {
        console.log('start e: ', e)
        reject(e)
      }
    })
  }
  async checkState() {
    const id = this.host?.id
    if (!id) {
      return []
    }
    const baseDir = join(global.Server.BaseDir!, 'python')
    const pidFile = join(baseDir, `${id}.pid`)
    this.pidFile = pidFile
    if (!existsSync(pidFile)) {
      return []
    }
    const pid = (readFileSync(pidFile, 'utf-8')).trim()
    return await ProcessPidListByPid(pid)
  }
}
