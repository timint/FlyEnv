import { defineStore } from 'pinia'
import IPC from '@/util/IPC'
import { reactive } from 'vue'
import { MessageError, MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import { getLocalIp } from '@helper/net'

export interface DNSLogItem {
  host: string
  ip: string
  ttl: number
}

interface State {
  running: boolean
  ip: string
  fetching: boolean
  log: Array<DNSLogItem>
}

const state: State = {
  running: false,
  ip: '',
  fetching: false,
  log: []
}

export const DnsStore = defineStore('dns', {
  state: (): State => state,
  getters: {},
  actions: {
    getIP() {
      this.ip = getLocalIp()
    },
    init() {
      IPC.on('App_DNS_Log').then((key: string, res: DNSLogItem) => {
        this.log.unshift(reactive(res))
        this.log.splice(1000)
      })
    },
    deinit() {
      IPC.off('App_DNS_Log')
    },
    dnsStop(): Promise<boolean> {
      return new Promise((resolve, reject) => {
        if (!this.running) {
          resolve(true)
          return
        }
        this.fetching = true
        IPC.send('app-fork:dns', 'stopService').then((key: string, res: boolean | string) => {
          IPC.off(key)
          this.fetching = false
          if (typeof res === 'string') {
            MessageError(res)
          } else if (res) {
            this.running = false
            MessageSuccess(I18nT('base.success'))
            resolve(true)
            return
          } else if (!res) {
            MessageError(I18nT('base.fail'))
          }
          reject(new Error('fail'))
        })
      })
    },
    dnsStart(): Promise<boolean> {
      return new Promise((resolve, reject) => {
        if (this.running) {
          resolve(true)
          return
        }
        this.fetching = true
        IPC.send('app-fork:dns', 'startService').then((key: string, res: any) => {
          IPC.off(key)
          this.fetching = false
          console.log('resres: ', res)
          if (typeof res?.data === 'string') {
            MessageError(res.data)
          } else if (res?.data) {
            this.running = true
            MessageSuccess(I18nT('base.success'))
            resolve(true)
            return
          }
          reject(new Error('fail'))
        })
      })
    },
    dnsRestart() {
      this.dnsStop()
        .then(() => this.dnsStart())
        .catch()
    }
  }
})
