import { uuid } from './Fn'
import { join } from 'path'
import { readFile, remove } from 'fs-extra'
import { exec } from 'child-process-promise'
import { existsSync } from 'fs'
import JSON5 from 'json5'

export type PItem = {
  ProcessId: number
  ParentProcessId: number
  CommandLine: string
  children?: PItem[]
}

export const ProcessPidList = async (): Promise<PItem[]> => {
  console.info('ProcessPidList')
  const all: PItem[] = []
  const json = join(global.Server.Cache!, `${uuid()}.json`)
  const command = `powershell.exe -NoProfile -WindowStyle Hidden -command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;[Console]::InputEncoding = [System.Text.Encoding]::UTF8;Get-CimInstance Win32_Process | Select-Object CommandLine,ProcessId,ParentProcessId | ConvertTo-Json | Out-File -FilePath '${json}' -Encoding utf8"`
  try {
    await exec(command)
    const content = await readFile(json, 'utf8')
    const list = JSON5.parse(content)
    all.push(...list)
    if (existsSync(json)) {
      await remove(json)
    }
  } catch (err) {
    console.debug('ProcessPidList err0: ', err)
    if (existsSync(json)) {
      await remove(json)
    }
  }
  return all
}

export const ProcessPidListByPids = async (pids: (string | number)[]): Promise<number[]> => {
  const all: Set<number> = new Set()
  const arr = await ProcessPidList()
  const find = (ppid: string | number) => {
    ppid = Number(ppid)
    for (const item of arr) {
      if (item.ParentProcessId === ppid) {
        console.debug('find: ', ppid, item)
        all.add(item.ProcessId!)
        find(item.ProcessId!)
      }
    }
  }

  for (const pid of pids) {
    const pidNum = Number(pid)
    if (arr.find((a) => a.ProcessId === pidNum)) {
      all.add(pidNum)
      find(pidNum)
    }
    const item = arr.find((a) => a.ParentProcessId === pidNum)
    if (item) {
      all.add(pidNum)
      all.add(item.ProcessId)
      find(pidNum)
      find(item.ProcessId)
    }
  }
  return [...all]
}

export const ProcessPidListByPid = async (pid: string | number): Promise<number[]> => {
  pid = Number(pid)
  const all: Set<number> = new Set()
  const arr = await ProcessPidList()
  const find = (ppid: string | number) => {
    ppid = Number(ppid)
    for (const item of arr) {
      if (item.ParentProcessId === ppid) {
        console.debug('find: ', ppid, item)
        all.add(item.ProcessId!)
        find(item.ProcessId!)
      }
    }
  }
  if (arr.find((a) => a.ProcessId === pid)) {
    all.add(pid)
    find(pid)
  }
  const item = arr.find((a) => a.ParentProcessId === pid)
  if (item) {
    all.add(pid)
    all.add(item.ProcessId)
    find(pid)
    find(item.ProcessId)
  }
  return [...all]
}

export const ProcessListSearch = async (search: string, aA = true) => {
  const all: PItem[] = []
  if (!search) {
    return all
  }
  const arr = await ProcessPidList()
  const find = (ppid: string | number) => {
    ppid = Number(ppid)
    for (const item of arr) {
      if (item.ParentProcessId === ppid) {
        if (!all.find((f) => f.ProcessId === item.ProcessId)) {
          all.push(item)
          find(item.ProcessId!)
        }
      }
    }
  }
  for (const item of arr) {
    const b = `${item.ProcessId}` === `${search}`
    const c = `${item.ParentProcessId}` === `${search}`

    if (!aA) {
      search = search.toLowerCase()
      const a = item?.CommandLine && item.CommandLine.toLowerCase().includes(search)
      if (a || b || c) {
        if (!all.find((f) => f.ProcessId === item.ProcessId)) {
          all.push(item)
          find(item.ProcessId!)
        }
      }
    } else {
      const a = item?.CommandLine && item.CommandLine.includes(search)
      if (a || b || c) {
        if (!all.find((f) => f.ProcessId === item.ProcessId)) {
          all.push(item)
          find(item.ProcessId!)
        }
      }
    }
  }
  return all
}
