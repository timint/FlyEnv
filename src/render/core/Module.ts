import { computed, reactive } from 'vue'
import { AppStore } from '@/store/app'
import type { AllAppModule } from '@/core/type'
import localForage from 'localforage'
import { CustomModule, CustomModuleExecItem } from '@/core/CustomModule'

export const AppModuleTab: Record<AllAppModule, number> = reactive({}) as any

export const AppModuleSetup = (flag: AllAppModule) => {
  const appStore = AppStore()

  const currentVersion = computed(() => {
    return appStore.config.server?.[flag]?.current?.version
  })
  if (!AppModuleTab[flag]) {
    AppModuleTab[flag] = 0
  }
  const tab = computed({
    get() {
      console.log('tab get: ', AppModuleTab, AppModuleTab[flag])
      return AppModuleTab[flag] ?? 0
    },
    set(v) {
      AppModuleTab[flag] = v
      console.log('tab set: ', v, AppModuleTab)
    }
  })

  const checkVersion = () => {
    if (!currentVersion.value) {
      AppModuleTab[flag] = 1
    }
  }

  return {
    tab,
    checkVersion
  }
}

export type CustomModuleCateItem = {
  id: string
  label: string
  moduleType: string
}

export type CustomModuleExecItem = {
  id: string
  name: string
  comment: string
  command: string
  commandFile: string
  commandType: 'command' | 'file'
  isSudo?: boolean
  pidPath?: string
  configPath?: Array<{
    name: string
    path: string
  }>
  logPath?: Array<{
    name: string
    path: string
  }>
}

export type CustomModuleItem = {
  isCustom: boolean
  id: string
  typeFlag: string
  label: string
  isService?: boolean
  isOnlyRunOne?: boolean
  icon: string
  moduleType: string
  configPath: Array<{
    name: string
    path: string
  }>
  logPath: Array<{
    name: string
    path: string
  }>
  item: CustomModuleExecItem[]
}

const APPCustomModuleCateKey = 'flyenv-custom-module-cate'
const APPCustomModuleKey = 'flyenv-custom-module'

export const AppCustomModule: {
  index: number
  moduleCate: CustomModuleCateItem[]
  module: CustomModule[]
  init: () => void
  saveModuleCate: () => void
  saveModule: () => Promise<any>
  addModuleCate: (item: CustomModuleCateItem) => void
  delModuleCate: (item: CustomModuleCateItem) => void
  currentModule?: CustomModule
} = reactive({
  index: 1,
  currentModule: undefined,
  moduleCate: [],
  module: [],
  init() {
    localForage
      .getItem(APPCustomModuleCateKey)
      .then((res: CustomModuleCateItem[]) => {
        if (res) {
          AppCustomModule.moduleCate = reactive(res)
        }
      })
      .catch()
    localForage
      .getItem(APPCustomModuleKey)
      .then((res: CustomModuleItem[]) => {
        if (res) {
          const list = reactive(
            res.map((r) => {
              const module = reactive(new CustomModule(r))
              module.onExecStart = module.onExecStart.bind(module)
              module.start = module.start.bind(module)
              module.stop = module.stop.bind(module)
              module.watchShowHide = module.watchShowHide.bind(module)
              module.watchShowHide()
              return module
            })
          )
          AppCustomModule.module = reactive(list)
        }
      })
      .catch()
  },
  saveModuleCate() {
    localForage
      .setItem(APPCustomModuleCateKey, JSON.parse(JSON.stringify(AppCustomModule.moduleCate)))
      .then()
      .catch()
  },
  saveModule() {
    return localForage.setItem(
      APPCustomModuleKey,
      JSON.parse(JSON.stringify(AppCustomModule.module))
    )
  },
  addModuleCate(item: CustomModuleCateItem) {
    AppCustomModule.moduleCate.unshift(item)
    AppCustomModule.saveModuleCate()
  },
  delModuleCate(item: CustomModuleCateItem) {
    const service = AppCustomModule.module.filter((f) => f.moduleType !== item.moduleType)
    AppCustomModule.module = reactive(service)
    const findIndex = AppCustomModule.moduleCate.findIndex((f) => f.id === item.id)
    if (findIndex >= 0) {
      AppCustomModule.moduleCate.splice(findIndex, 1)
    }
    AppCustomModule.saveModuleCate()
    AppCustomModule.saveModule().then().catch()
  }
})
