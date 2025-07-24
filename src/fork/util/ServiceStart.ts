import type { ModuleExecItem as customExecItem, SoftInstalled } from '@shared/app'
import { dirname, join } from 'path'
import { I18nT } from '@lang/index'
import Helper from '../Helper'
import { spawn } from 'child_process'
import { execPromiseSudo } from '@shared/child-process'
import { existsSync, remove, mkdirp, readFile, writeFile } from '@shared/fs-extra'
import { AppLog, waitPidFile } from '../Fn'
import { isWindows } from '@shared/utils'
import { isMacOS, isWindows } from '@shared/utils'

export type execItem = {
  version: SoftInstalled
  pidPath?: string
  baseDir: string
  bin: string
  execArgs?: string
  execEnv?: string
  on: (...args: any) => void
  maxTime?: number
  timeToWait?: number
  checkPidFile?: boolean
  cwd?: string
  root?: boolean
}

export async function serviceStartExec(item: execItem): Promise<{
  'APP-Service-Start-PID': string
}> {
  if (item.pidPath && existsSync(item.pidPath)) {
    try {
      await remove(item.pidPath)
    } catch {}
  }

  await mkdirp(item.baseDir)

  const errFile = join(item.baseDir, `${item.version.typeFlag}-${item.version.version!.trim()}-start-error.log`.replace(/ /g, ''))

  // Use simple logging that doesn't depend on AppLog/I18nT
  item.on({
    'APP-On-Log': { level: 'info', message: 'Starting command execution' }
  })

  // Parse environment variables
  const envVars: Record<string, string> = { ...process.env }
  if (item.execEnv) {
    const envPairs = item.execEnv.split(';').filter(Boolean)
    for (const pair of envPairs) {
      const [key, value] = pair.split('=')
      if (key && value !== undefined) {
        envVars[key.trim()] = value.trim()
      }
    }
  }

  // Parse arguments
  const execArgsArray = item.execArgs ? item.execArgs.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(arg =>
    arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg
  ) || [] : []

  process.chdir(item.baseDir)
  let pid = ''

  try {
    // Spawn the process directly with detached mode
    const child = spawn(item.bin, execArgsArray, {
      detached: true, // Make process independent of parent
      stdio: 'ignore',
      cwd: item.cwd ?? dirname(item.bin),
      env: envVars
    })

  process.chdir(baseDir)
  let res: any
  let error: any
  const shell = isMacOS() ? 'zsh' : 'bash'
  if (param?.root) {
    try {
      res = await Helper.send('apache', 'startService', `${shell} "${psPath}"`)
    } catch (e) {
      error = e
    }
  } else {
    try {
      res = await spawnPromiseWithEnv(shell, [psName], {
        cwd: baseDir
      })

      child.on('spawn', () => {
        resolve()
      })

      // Fallback timeout in case neither event fires
      setTimeout(() => {
        resolve()
      }, 100)
    })

    // Get the PID and decouple completely
    pid = child.pid?.toString() || ''
    child.unref()

    // Write PID to file if needed
    if (item.pidPath && pid) {
      await writeFile(item.pidPath, pid)
    }
  } catch (e) {
    const error = e as Error
    await writeFile(errFile, error.toString())
    throw error
  }
  }

  // Use simple logging that doesn't depend on AppLog/I18nT
  item.on({
    'APP-On-Log': { level: 'info', message: 'Command execution successful' }
  })
  item.on({
    'APP-Service-Start-Success': true
  })

  if (!(item.checkPidFile ?? true)) {
    item.on({
      'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: pid }))
    })
    return {
      'APP-Service-Start-PID': pid
    }
  }

  // Wait for PID file if checkPidFile is enabled
  const res = await waitPidFile(item.pidPath ?? '', 0, item.maxTime ?? 20, item.timeToWait ?? 500)
  if (res) {
    if (res?.pid) {
      try {
        await writeFile(pidPath, res.pid)
      } catch {
        if (!isWindows()) {
          try {
            await Helper.send('tools', 'writeFileByRoot', pidPath, res.pid)
          } catch {}
        }
      }
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: res.pid }))
      })
      return {
        'APP-Service-Start-PID': res.pid
      }
    }
    item.on({
      'APP-On-Log': AppLog(
        'error',
        I18nT('appLog.startServiceFail', {
          error: res?.error ?? 'Start Fail',
          service: `${item.version.typeFlag}-${item.version.version}`
        })
      )
    })
    throw new Error(res?.error ?? 'Start Fail')
  }

  let msg = 'Start Fail'
  if (existsSync(errFile)) {
    msg = await readFile(errFile, 'utf-8')
  }
  item.on({
    'APP-On-Log': AppLog(
      'error',
      I18nT('appLog.startServiceFail', {
        error: msg,
        service: `${item.version.typeFlag}-${item.version.version}`
      })
    )
  })
  throw new Error(msg)
}

export async function customServiceStartExec(
  item: customExecItem,
  isService: boolean
): Promise<{
  'APP-Service-Start-PID': string
}> {
  console.log('customServiceStartExec: ', item, isService)

  if (item?.pidPath && existsSync(item.pidPath)) {
    try {
      await remove(item.pidPath)
    } catch {}
  }

  await mkdirp(join(global.Server.BaseDir!, 'module-custom'))

  const outFile = join(global.Server.BaseDir!, 'module-custom', `${item.id}-out.log`)
  const errFile = join(global.Server.BaseDir!, 'module-custom', `${item.id}-error.log`)

  try {
    await Helper.send('tools', 'rm', errFile)
  } catch {}
  try {
    await Helper.send('tools', 'rm', outFile)
  } catch {}

  let spawnBin = ''
  let spawnArgs: string[] = []
  let cwd = join(global.Server.BaseDir!, 'module-custom')

  if (item.commandType === 'file') {
    // For file-based execution, use the file directly
    cwd = dirname(item.commandFile)

    if (isWindows()) {
      if (item.commandFile.endsWith('.bat') || item.commandFile.endsWith('.cmd')) {
        spawnBin = 'cmd.exe'
        spawnArgs = ['/c', item.commandFile]
      } else {
        spawnBin = item.commandFile
        spawnArgs = []
      }
    } else {
      spawnBin = item.commandFile
      spawnArgs = []
    }
  } else {
    // For command-based execution, parse and execute directly
    if (isWindows()) {
      // On Windows, use cmd.exe to execute the command
      spawnBin = 'cmd.exe'
      spawnArgs = ['/c', item.command.trim()]
    } else {
      // On Unix-like systems, parse the command into binary and arguments
      const commandParts = item.command.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || []
      if (commandParts.length > 0) {
        spawnBin = commandParts[0].replace(/^"(.*)"$/, '$1') // Remove quotes if present
        spawnArgs = commandParts.slice(1).map(arg => arg.replace(/^"(.*)"$/, '$1'))
      } else {
        throw new Error('Invalid command format')
      }
    }
  }

  process.chdir(join(global.Server.BaseDir!, 'module-custom'))
  let pid = ''
  let error: any

  try {
    if (item.isSudo) {
      // For sudo commands, we still need to use the existing sudo mechanism
      const fullCommand = item.commandType === 'file' ? `"${item.commandFile}"` : item.command

      const execRes = await execPromiseSudo(['zsh', '-c', fullCommand], {
        cwd: cwd
      })
      // Extract PID from output if available
      const output = (execRes.stdout + '\n' + execRes.stderr).trim()
      const regex = /FlyEnv-Process-ID(.*?)FlyEnv-Process-ID/g
      const match = regex.exec(output)
      if (match) {
        pid = match[1]
      }
    } else {
      // Use direct spawn for non-sudo commands
      const child = spawn(spawnBin, spawnArgs, {
        detached: true,
        stdio: 'ignore',
        cwd: cwd,
        env: process.env
      })

      // Handle spawn errors (e.g., binary not found)
      await new Promise<void>((resolve, reject) => {
        child.on('error', (error) => {
          reject(error)
        })

        child.on('spawn', () => {
          resolve()
        })

        // Fallback timeout in case neither event fires
        setTimeout(() => {
          resolve()
        }, 100)
      })

  const shell = isMacOS() ? 'zsh' : 'bash'

  process.chdir(baseDir)
  let res: any
  let error: any
  try {
    if (version.isSudo) {
      const execRes = await execPromiseSudo([shell, psName], {
        cwd: baseDir
      })
      res = (execRes.stdout + '\n' + execRes.stderr).trim()
    } else {
      res = await spawnPromiseWithEnv(shell, [psName], {
        cwd: baseDir,
        shell: `/bin/${shell}`
      })
    }
  } catch (e) {
    error = e
    if (!isService || !item.pidPath) {
      throw e
    }
  }

  await waitPidFile(errFile, 0, 6, 500)

  if (!isService) {
    let msg = ''
    if (existsSync(errFile)) {
      msg = await readFile(errFile, 'utf-8')
    }
    if (msg) {
      throw new Error(msg)
    }
    return {
      'APP-Service-Start-PID': '-1'
    }
  }

  if (!item.pidPath) {
    if (pid) {
      return {
        'APP-Service-Start-PID': pid
      }
    } else {
      throw new Error('Failed to get process ID')
    }
  }

  // If we have a pidPath and got a PID from direct spawn, write it and return
  if (pid && !item.isSudo) {
    await writeFile(item.pidPath, pid)
    return {
      'APP-Service-Start-PID': pid
    }
  }

  // Only wait for PID file if using sudo (which might create its own PID file)
  if (item.isSudo) {
    const res = await waitPidFile(item.pidPath, 0, 20, 500)
    if (res) {
      if (res?.pid) {
        await writeFile(item.pidPath, res.pid)
        return {
          'APP-Service-Start-PID': res.pid
        }
      }
    }
  }
  let msg = 'Start Fail: '
  if (error && error?.toString) {
    msg += '\n' + (error?.toString() ?? '')
  }
  if (existsSync(errFile)) {
    msg += '\n' + (await readFile(errFile, 'utf-8'))
  }
  throw new Error(msg)
}
