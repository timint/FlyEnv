import { execPromiseWithEnv } from '@shared/child-process'
import { spawnPromiseWithEnv } from '@shared/child-process'

export const brewInfoJson = async (names: string[]) => {
  const info: any = []
  const command = ['brew', 'info', ...names, '--json', '--formula'].join(' ')
  console.log('brewinfo doRun: ', command)
  try {
    const res = await execPromiseWithEnv(command, {
      env: {
        HOMEBREW_NO_INSTALL_FROM_API: 1
      }
    })
    const arr = JSON.parse(res.stdout)
    arr.forEach((item: any) => {
      info.push({
        version: item?.versions?.stable ?? '',
        installed: item?.installed?.length > 0,
        name: item.full_name,
        flag: 'brew'
      })
    })
  } catch {}
  return info
}

export const brewSearch = async (
  all: string[],
  command: string,
  handleContent?: (content: string) => string
) => {
  try {
    const res = await execPromiseWithEnv(command, {
      env: {
        HOMEBREW_NO_INSTALL_FROM_API: 1
      }
    })
    let content: any = res.stdout
    console.log('brewinfo content: ', content)
    if (handleContent) {
      content = handleContent(content)
    }
    content = content
      .split('\n')
      .map((s: string) => s.trim())
      .filter((s: string) => s && !s.includes(' '))
    all.push(...content)
  } catch (e) {
    console.log('brewSearch err: ', e)
  }
  return all
}

export const portSearch = async (reg: string, filter: (f: string) => boolean, isInstalled: (name: string, version?: string) => boolean) => {
  try {
    let arr = []
    const info = await spawnPromiseWithEnv('port', ['search', '--name', '--line', '--regex', reg])
    arr = info.stdout
      .split('\n')
      .filter(filter)
      .map((m: string) => {
        const a = m.split('\t').filter((f) => f.trim().length > 0)
        const name = a.shift() ?? ''
        const version = a.shift() ?? ''
        const installed = isInstalled(name, version)
        return {
          name,
          version,
          installed,
          flag: 'port'
        }
      })
    return arr
  } catch (e) {
    console.log('portSearch err: ', e)
  }
  return []
}
