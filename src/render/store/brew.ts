import { AllAppModule } from '@/core/type'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { AppStore } from '@/store/app'

export interface SoftInstalled {
  version: string | null
  bin: string
  path: string
  num: number | null
  error?: string
  enable: boolean
  run: boolean
  running: boolean
  phpBin?: string
  phpConfig?: string
  phpize?: string
  flag?: string
  isLocal7Z?: boolean
  pid?: string
  aliasEditing?: boolean
  alias?: string
}

export interface OnlineVersionItem {
  appDir: string
  zip: string
  bin: string
  downloaded: boolean
  installed: boolean
  url: string
  version: string
  mVersion: string
  downing?: boolean
}

export interface AppSoftInstalledItem {
  getListing: boolean
  installedInitiated: boolean
  installed: Array<SoftInstalled>
  list: OnlineVersionItem[]
  installing: Record<string, OnlineVersionItem>
}

type StateBase = Partial<Record<AllAppModule, AppSoftInstalledItem | undefined>>

interface State extends StateBase {
  cardHeadTitle: string
  brewRunning: boolean
  showInstallLog: boolean
  brewSrc: string
  log: Array<string>
  LibUse: { [k: string]: 'brew' | 'port' }
}

const state: State = {
  cardHeadTitle: '',
  brewRunning: false,
  showInstallLog: false,
  brewSrc: '',
  log: [],
  LibUse: {}
}

export const BrewStore = defineStore('brew', {
  state: (): State => state,
  getters: {},
  actions: {
    module(flag: AllAppModule): AppSoftInstalledItem {
      if (!this?.[flag]) {
        this[flag] = reactive({
          getListing: false,
          installedInitiated: false,
          installed: [],
          list: [],
          installing: {}
        })
      }
      return this[flag]!
    },
    currentVersion(flag: AllAppModule): SoftInstalled | undefined {
      const appStore = AppStore()
      const current = appStore.config.server?.[flag]?.current
      if (!current) {
        return undefined
      }
      const installed = this.module(flag).installed
      return installed?.find((i) => i.path === current?.path && i.version === current?.version)
    }
  }
})
