import { reactive } from 'vue'
import IPC from '@/util/IPC'
import { SoftInstalled } from '@/store/brew'
import { I18nT } from '@lang/index'
import { MessageError, MessageSuccess } from '@/util/Element'
import Base from '@/core/Base'
import { reGetInstalled, stopService } from '@/util/Service'
import { AppStore } from '@/store/app'
import { AllAppModule } from '@/core/type'
import { staticVersionDel } from '@/util/Version'
import { AppServiceAliasItem } from '@shared/app'
import { AsyncComponentShow } from '@/util/AsyncComponent'
import { isEqual } from 'lodash'
import localForage from 'localforage'

type ServiceActionType = {
  versionDeling: Record<string, boolean>
  pathSetting: Record<string, boolean>
  allPath: string[]
  appPath: string[]
  fetchPathing: boolean
  fetchPath: () => void
  cleanAlias: () => void
  showAlias: (item: SoftInstalled) => void
  setAlias: (
    service: SoftInstalled,
    item?: AppServiceAliasItem,
    old?: AppServiceAliasItem
  ) => Promise<boolean>
  updatePath: (item: SoftInstalled, typeFlag: string) => Promise<boolean>
  delVersion: (item: SoftInstalled, typeFlag: string) => void
}

let time = 0

export const ServiceActionStore: ServiceActionType = reactive({
  versionDeling: {},
  pathSetting: {},
  allPath: [],
  appPath: [],
  fetchPathing: false,
  showAlias(item: SoftInstalled) {
    import('./alias.vue').then((res) => {
      AsyncComponentShow(res.default, {
        item
      }).then()
    })
  },
  setAlias(service: SoftInstalled, item?: AppServiceAliasItem, old?: AppServiceAliasItem) {
    return new Promise((resolve, reject) => {
      const store = AppStore()
      IPC.send(
        'app-fork:tools',
        'setAlias',
        JSON.parse(JSON.stringify(service)),
        item ? JSON.parse(JSON.stringify(item)) : undefined,
        old ? JSON.parse(JSON.stringify(old)) : undefined,
        JSON.parse(JSON.stringify(store.config.setup?.alias ?? {}))
      ).then((key: string, res: any) => {
        IPC.off(key)
        if (res?.code === 0) {
          const setup = JSON.parse(JSON.stringify(store.config.setup))
          setup.alias = res.data
          store.config.setup = reactive(setup)
          store.saveConfig().then().catch()
          resolve(true)
        } else {
          MessageError(res?.msg ?? I18nT('base.fail'))
          reject(new Error('fail'))
        }
      })
    })
  },
  cleanAlias() {
    console.trace('cleanAlias !!!')
    if (time > 5) {
      return
    }
    time += 1
    const store = AppStore()
    IPC.send(
      'app-fork:tools',
      'cleanAlias',
      JSON.parse(JSON.stringify(store.config.setup?.alias ?? {}))
    ).then((key: string, res: any) => {
      IPC.off(key)
      if (res?.code === 0) {
        if (!isEqual(res.data, store.config.setup?.alias)) {
          const setup = JSON.parse(JSON.stringify(store.config.setup))
          setup.alias = res.data
          store.config.setup = reactive(setup)
          store.saveConfig().then().catch()
        }
      }
    })
  },
  fetchPath() {
    if (ServiceActionStore.fetchPathing) {
      return
    }
    ServiceActionStore.fetchPathing = true
    IPC.send('app-fork:tools', 'fetchPATH').then((key: string, res: any) => {
      IPC.off(key)
      if (res?.code === 0 && res?.data?.allPath) {
        const all = res?.data?.allPath ?? []
        const app = res?.data?.appPath ?? []
        ServiceActionStore.allPath = reactive([...all])
        ServiceActionStore.appPath = reactive([...app])

        localForage
          .getItem(`flyenv-app-env-dir`)
          .then((res: Record<string, string>) => {
            const list = res || {}
            const set = new Set([...Object.values(list), ...app])
            const appList = Array.from(set)
            ServiceActionStore.appPath = reactive([...appList])
          })
          .catch()

        setTimeout(() => {
          ServiceActionStore.fetchPathing = false
        }, 60000)
      }
    })
  },
  updatePath(item: SoftInstalled, typeFlag: string) {
    return new Promise((resolve, reject) => {
      if (ServiceActionStore.pathSetting?.[item.bin]) {
        return resolve(true)
      }
      ServiceActionStore.pathSetting[item.bin] = true

      const action = ServiceActionStore.appPath.includes(item.path) ? 'removePATH' : 'updatePATH'
      IPC.send('app-fork:tools', action, JSON.parse(JSON.stringify(item)), typeFlag).then(
        (key: string, res: any) => {
          IPC.off(key)
          delete ServiceActionStore.pathSetting?.[item.bin]
          if (res?.code === 0) {
            const all = res?.data?.allPath ?? []
            const app = res?.data?.appPath ?? []
            ServiceActionStore.allPath = reactive([...all])
            ServiceActionStore.appPath = reactive([...app])

            localForage
              .getItem(`flyenv-app-env-dir`)
              .then((res: Record<string, string>) => {
                const list = res || {}
                if (action === 'removePATH') {
                  delete list?.[typeFlag]
                } else {
                  list[typeFlag] = item.path
                }

                const set = new Set([...Object.values(list), ...app])
                const appList = Array.from(set)
                localForage.setItem(`flyenv-app-env-dir`, list).then().catch()
                ServiceActionStore.appPath = reactive([...appList])
              })
              .catch()

            MessageSuccess(I18nT('base.success'))
            resolve(true)
          } else {
            const msg = res?.msg ?? I18nT('base.fail')
            MessageError(msg)
            reject(new Error(msg))
          }
        }
      )
    })
  },
  delVersion(item: SoftInstalled, type: AllAppModule) {
    if (ServiceActionStore.versionDeling?.[item.bin]) {
      return
    }
    ServiceActionStore.versionDeling[item.bin] = true
    const store = AppStore()
    if (item.isLocal7Z) {
      Base._Confirm(I18nT('service.bundleinVersionDelTips'), undefined, {
        customClass: 'confirm-del',
        type: 'warning'
      })
        .then(async () => {
          if (item.run) {
            stopService(type, item).then().catch()
          }
          const setup = JSON.parse(JSON.stringify(store.config.setup))
          if (!setup.excludeLocalVersion) {
            setup.excludeLocalVersion = []
          }
          const arr: Set<string> = new Set(setup.excludeLocalVersion)
          arr.add(`${type}-${item.version}`)
          setup.excludeLocalVersion = [...arr]
          store.config.setup = reactive(setup)
          await store.saveConfig()
          await reGetInstalled(type as any)
        })
        .catch()
        .finally(() => {
          delete ServiceActionStore.versionDeling[item.bin]
        })
    } else if (store.config.setup?.[type]?.dirs?.some((d) => item.bin.includes(d))) {
      Base._Confirm(I18nT('service.customDirVersionDelTips'), undefined, {
        customClass: 'confirm-del',
        type: 'warning'
      })
        .then(async () => {
          if (item.run) {
            stopService(type, item).then().catch()
          }
          const setup = JSON.parse(JSON.stringify(store.config.setup))
          const index = setup?.[type]?.dirs?.findIndex((d: string) => item.bin.includes(d))
          if (index >= 0) {
            setup?.[type]?.dirs?.splice(index, 1)
          }
          store.config.setup = reactive(setup)
          await store.saveConfig()
          await reGetInstalled(type as any)
        })
        .catch()
        .finally(() => {
          delete ServiceActionStore.versionDeling[item.bin]
        })
    } else {
      staticVersionDel(item.path)
    }
  }
} as ServiceActionType)
