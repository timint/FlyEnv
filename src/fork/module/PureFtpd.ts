import type { FtpItem, SoftInstalled } from '@shared/app'

import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { Base } from './Base'
import { ForkPromise } from '@shared/ForkPromise'
import FtpServer from 'ftp-srv'
import * as ip from 'neoip'
import { setDir777ToCurrentUser } from '../util/Filesystem'

class Manager extends Base {
  server?: FtpServer
  users: Array<{
    user: string
    pass: string
    dir: string
    id: string
  }> = []

  constructor() {
    super()
    this.type = 'pure-ftpd'
  }

  init() {}

  _stopServer(version: SoftInstalled): ForkPromise<{ 'APP-Service-Stop-PID': number[] }> {
    return new ForkPromise((resolve) => {
      this.server?.close()
      this.server = undefined
      resolve({ 'APP-Service-Stop-PID': [] })
    })
  }

  _startServer() {
    const resolverFunction = (clientIP: string) => {
      if (clientIP === '127.0.0.1' || clientIP === '::1') {
        // For local connections, directly return the loopback address
        return '127.0.0.1'
      }
      return ip.address()
    }

    return new ForkPromise(async (resolve, reject) => {
      const port = 21
      this.server = new FtpServer({
        url: 'ftp://0.0.0.0:' + port,
        anonymous: true,
        // @ts-expect-error: pasv_url is not in the type definition but is used by the library
        pasv_url: resolverFunction as any,
        pasv_min: 49152,
        pasv_max: 65535
      })

      this.server.on('login', async ({ connection, username, password }, resolve, reject) => {
        connection.on('client-error', (error: any) => {
          console.error('FTP Client Error:', error)
        })
        connection.on('STOR', (error: any) => {
          if (error) console.error('Upload failed:', error)
        })

        const json = join(global.Server.FTPDir!, 'pureftpd.json')
        const all: Array<any> = []
        if (existsSync(json)) {
          try {
            const txt = readFileSync(json, 'utf-8')
            const arr = JSON.parse(txt.toString())
            all.push(...arr)
          } catch (e) {}
        }

        const finduser = all.find((a) => a.user === username && a.pass === password)
        if (finduser) {
          const find = this.users.find((u) => u.user === username && u.pass === password)
          if (find) {
            find.id === connection.id
          } else {
            this.users.push({
              ...finduser,
              id: connection.id
            })
          }
          return resolve({ root: finduser.dir.split('\\').join('/') })
        }
        return reject(new Error('Invalid username or password'))
      })

      this.server
        .listen()
        .then(() => {
          console.log('Ftp server is starting...')
          resolve(true)
        })
        .catch(reject)
    })
  }

  getPort() {
    return new ForkPromise(async (resolve) => {
      const port: any = 21
      resolve(port)
    })
  }

  getAllFtp() {
    return new ForkPromise(async (resolve) => {
      const json = join(global.Server.FTPDir!, 'pureftpd.json')
      const all = []
      if (existsSync(json)) {
        try {
          const txt = readFileSync(json, 'utf-8')
          const arr = JSON.parse(txt.toString())
          all.push(...arr)
        } catch (e) {}
      }
      resolve(all)
    })
  }

  delFtp(item: FtpItem) {
    return new ForkPromise(async (resolve) => {
      const find = this.users.find((u) => u.user === item.user && u.pass === item.pass)
      if (find) {
        const id = find.id
        this.server?.disconnectClient(id)
      }
      const json = join(global.Server.FTPDir!, 'pureftpd.json')
      const all = []
      if (existsSync(json)) {
        try {
          const txt = readFileSync(json, 'utf-8')
          const arr = JSON.parse(txt.toString())
          all.push(...arr)
        } catch (e) {}
      }
      const findOld = all.findIndex((a) => a.user === item.user)
      if (findOld >= 0) {
        all.splice(findOld, 1)
      }
      mkdirSync(global.Server.FTPDir!, { recursive: true })
      writeFileSync(json, JSON.stringify(all))
      resolve(true)
    })
  }

  addFtp(item: FtpItem) {
    return new ForkPromise(async (resolve) => {
      if (item.dir && existsSync(item.dir)) {
        try {
          await setDir777ToCurrentUser(item.dir)
        } catch (e) {}
      }

      const json = join(global.Server.FTPDir!, 'pureftpd.json')
      const all = []
      if (existsSync(json)) {
        try {
          const txt = readFileSync(json, 'utf-8')
          const arr = JSON.parse(txt.toString())
          all.push(...arr)
        } catch (e) {}
      }
      const findOld = all.findIndex((a) => a.user === item.user)
      if (findOld >= 0) {
        all.splice(findOld, 1, item)
      } else {
        all.unshift(item)
      }
      mkdirSync(global.Server.FTPDir!, { recursive: true })
      writeFileSync(json, JSON.stringify(all))
      resolve(true)
    })
  }
}

export default new Manager()
