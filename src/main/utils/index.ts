import { app } from 'electron'
import { cpus } from 'os'
import {
  createWriteStream,
  unlinkSync,
  stat,
  existsSync,
  copyFile,
  appendFile,
  chmod,
  remove,
  mkdirp,
  readFile,
  writeFile
} from '@shared/fs-extra'

export {
  createWriteStream,
  unlinkSync,
  stat,
  existsSync,
  copyFile,
  appendFile,
  chmod,
  remove,
  mkdirp,
  readFile,
  writeFile
}

export function uuid(length = 32) {
  const num = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
  let str = ''
  for (let i = 0; i < length; i++) {
    str += num.charAt(Math.floor(Math.random() * num.length))
  }
  return str
}

export function getLanguage(locale?: string) {
  if (locale) {
    return locale
  }
  return app?.getLocale()?.split('-')?.[0] ?? 'en'
}

export const wait = (time = 2000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}

export function isAppleSilicon() {
  const cpuCore = cpus()
  return cpuCore[0].model.includes('Apple')
}
