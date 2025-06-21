import { defineStore } from 'pinia'
import type { MysqlGroupItem } from '@shared/app'
import IPC from '@/util/IPC'

const { existsSync, readFile, writeFile, mkdirp } = require('fs-extra')
const { join } = require('path')

interface State {
  initiated: boolean
  all: Array<MysqlGroupItem>
}

const state: State = {
  initiated: false,
  all: []
}

export const MysqlStore = defineStore('mysqlGroup', {
  state: (): State => state,
  getters: {},
  actions: {
    async init() {
      if (this.initiated) {
        return
      }
      this.initiated = true
      const file = join(global.Server.MysqlDir, 'group/group.json')
      if (existsSync(file)) {
        const arr: Array<any> = []
        try {
          const json = await readFile(file, 'utf-8')
          const jsonArr: any = JSON.parse(json)
          jsonArr.forEach((j: any) => {
            delete j?.version?.fetching
            delete j?.version?.running
          })
          arr.push(...jsonArr)
        } catch (err) {}
        this.all.push(...arr)
      }
    },
    async save() {
      const json = JSON.parse(JSON.stringify(this.all))
      json.forEach((j: any) => {
        delete j?.version?.fetching
        delete j?.version?.running
      })
      const groupDir = join(global.Server.MysqlDir, 'group')
      await mkdirp(groupDir)
      const file = join(groupDir, 'group.json')
      await writeFile(file, JSON.stringify(json))
    },
    start(item: MysqlGroupItem): Promise<true | string> {
      return new Promise((resolve) => {
        item.version.fetching = true
        const log: string[] = []
        IPC.send(`app-fork:mysql`, 'startGroupServer', JSON.parse(JSON.stringify(item))).then(
          (key: string, res: any) => {
            switch (res.code) {
              case 0:
                IPC.off(key)
                item.version.running = true
                item.version.fetching = false
                resolve(true)
                break
              case 1:
                IPC.off(key)
                log.push(res.msg)
                item.version.running = false
                item.version.fetching = false
                resolve(log.join('\n'))
                break
              case 200:
                log.push(res.msg)
                break
            }
          }
        )
      })
    },
    stop(item: MysqlGroupItem): Promise<true | string> {
      return new Promise((resolve) => {
        item.version.fetching = true
        const log: string[] = []
        IPC.send(`app-fork:mysql`, 'stopGroupService', JSON.parse(JSON.stringify(item))).then(
          (key: string, res: any) => {
            if (res.code === 0) {
              IPC.off(key)
              item.version.running = false
              item.version.fetching = false
              resolve(true)
            } else if (res.code === 1) {
              IPC.off(key)
              log.push(res.msg)
              item.version.running = false
              item.version.fetching = false
              resolve(log.join('\n'))
            } else if (res.code === 200) {
              log.push(res.msg)
            }
          }
        )
      })
    },
    groupStart(): Promise<true | string> {
      return new Promise(async (resolve) => {
        await this.init()
        if (this.all.length === 0) {
          resolve(true)
          return
        }
        const err: string[] = []
        const all: Array<Promise<boolean | string>> = []
        this.all.forEach((a) => {
          all.push(this.start(a))
        })
        Promise.all(all).then((res) => {
          res.forEach((r) => {
            if (typeof r === 'string') {
              err.push(r)
            }
          })
          resolve(err.length === 0 ? true : err.join('\n'))
        })
      })
    },
    groupStop(): Promise<true | string> {
      return new Promise((resolve) => {
        if (this.all.length === 0) {
          resolve(true)
          return
        }
        const err: string[] = []
        const all: Array<Promise<boolean | string>> = []
        this.all.forEach((a) => {
          all.push(this.stop(a))
        })
        Promise.all(all).then((res) => {
          res.forEach((r) => {
            if (typeof r === 'string') {
              err.push(r)
            }
          })
          resolve(err.length === 0 ? true : err.join('\n'))
        })
      })
    }
  }
})
