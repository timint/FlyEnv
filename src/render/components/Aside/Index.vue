<template>
  <el-aside width="280px" class="aside">
    <div class="aside-inner">
      <ul class="top-tool mt-3 pt-2" :style="topToolStyle as any">
        <el-popover
          width="auto"
          :show-after="800"
          placement="right"
          popper-class="app-popover-min-w-auto"
        >
          <template #default>
            <span>{{ I18nT('aside.groupStart') }}</span>
          </template>
          <template #reference>
            <li :class="groupClass" @click="groupDo">
              <yb-icon :svg="import('@/svg/switch.svg?raw')" width="24" height="24" />
            </li>
          </template>
        </el-popover>
        <el-popover
          width="auto"
          :show-after="800"
          placement="right"
          popper-class="app-popover-min-w-auto"
        >
          <template #default>
            <span>{{ I18nT('aside.appLog') }}</span>
          </template>
          <template #reference>
            <li class="cursor-pointer" @click.stop="showLog()">
              <Notebook class="w-5 h-5 p-0.5" />
            </li>
          </template>
        </el-popover>
        <el-popover
          width="auto"
          :show-after="800"
          placement="right"
          popper-class="app-popover-min-w-auto"
        >
          <template #default>
            <span>{{ I18nT('base.settings') }}</span>
          </template>
          <template #reference>
            <li class="cursor-pointer" @click.stop="nav('/setup')">
              <yb-icon
                :svg="import('@/svg/settings.svg?raw')"
                width="18"
                height="18"
              />
            </li>
          </template>
        </el-popover>
        <el-popover
          width="auto"
          :show-after="800"
          placement="right"
          popper-class="app-popover-min-w-auto"
        >
          <template #default>
            <span>{{ I18nT('aside.appExit') }}</span>
          </template>
          <template #reference>
            <li class="cursor-pointer" @click.stop="appExit()">
              <yb-icon
                :svg="import('@/svg/exit.svg?raw')"
                width="16"
                height="16"
              />
            </li>
          </template>
        </el-popover>
      </ul>
      <el-scrollbar>
        <ul class="menu top-menu">
          <template v-for="(item, _index) in allModule" :key="_index">
            <div
              :style="
                {
                  marginTop: _index === 0 ? '15px' : null
                } as any
              "
              class="module-type pb-3 pl-1 text-sm mb-3 mt-5 text-zinc-600 dark:text-gray-300 border-b border-zinc-200 dark:border-zinc-700"
              >{{ item.label }}</div
            >
            <template v-for="(i, _j) in item.sub" :key="_j">
              <template v-if="i?.isCustom">
                <CustomModule :item="i as any" />
              </template>
              <template v-else>
                <component :is="i.aside"></component>
              </template>
            </template>
          </template>
        </ul>
      </el-scrollbar>
    </div>
  </el-aside>
</template>

<script lang="ts" setup>
  import { computed, watch } from 'vue'
  import IPC from '@/util/IPC'
  import { AppStore } from '@/store/app'
  import { BrewStore } from '@/store/brew'
  import { I18nT } from '@lang/index'
  import Router from '@/router/index'
  import { MessageError, MessageSuccess } from '@/util/Element'
  import { AppModules } from '@/core/App'
  import { AppServiceModule, type AppServiceModuleItem } from '@/core/ASide'
  import { type AllAppModule, AppModuleTypeList } from '@/core/type'
  import { AsyncComponentShow } from '@/util/AsyncComponent'
  import { EventBus } from '@/global'
  import { AppCustomModule } from '@/core/Module'
  import CustomModule from '@/components/CustomModule/aside.vue'
  import type { CallbackFn } from '@shared/app'
  import { ElMessageBox } from 'element-plus'
  import { Notebook } from '@element-plus/icons-vue'

  let lastTray = ''

  const appStore = AppStore()
  const brewStore = BrewStore()

  const currentPage = computed(() => {
    return appStore.currentPage
  })

  const topToolStyle = computed(() => {
    if (window.Server.isMacOS) {
      return null
    }
    return {
      paddingTop: '11px'
    }
  })

  const platformAppModules = computed(() => {
    let platform: any = ''
    if (window.Server.isMacOS) {
      platform = 'macOS'
    } else if (window.Server.isWindows) {
      platform = 'Windows'
    } else if (window.Server.isLinux) {
      platform = 'Linux'
    }
    if (!platform) {
      return []
    }
    return AppModules.filter((a) => !a.platform || a.platform.includes(platform))
  })

  const showItem = computed(() => {
    return appStore.config.setup.common.showItem
  })

  const firstItem = computed(() => {
    const m = 'site'
    const sub = platformAppModules.value
      .filter((a) => a?.moduleType === m)
      .filter((a) => showItem.value?.[a.typeFlag] !== false)
    sub.sort((a, b) => {
      const lowerA = a.typeFlag.toLowerCase()
      const lowerB = b.typeFlag.toLowerCase()
      if (lowerA < lowerB) return -1
      if (lowerA > lowerB) return 1
      return 0
    })
    const custom: any = AppCustomModule.module
      .filter((f) => f.moduleType === m)
      .filter((a) => showItem.value?.[a.typeFlag] !== false)
    console.log('custom: ', custom, m)
    sub.unshift(...custom)
    return sub.length
      ? {
          label: I18nT(`aside.site`),
          sub
        }
      : undefined
  })

  const allList = computed(() => {
    return AppModuleTypeList.filter((f) => f !== 'site')
      .map((m) => {
        const sub = platformAppModules.value
          .filter((a) => showItem.value?.[a.typeFlag] !== false)
          .filter((a) => a?.moduleType === m || (!a?.moduleType && m === 'other'))
        sub.sort((a, b) => {
          const lowerA = a.typeFlag.toLowerCase()
          const lowerB = b.typeFlag.toLowerCase()
          if (lowerA < lowerB) return -1
          if (lowerA > lowerB) return 1
          return 0
        })
        const custom: any = AppCustomModule.module
          .filter((f) => f.moduleType === m)
          .filter((a) => showItem.value?.[a.typeFlag] !== false)
        sub.unshift(...custom)
        return {
          label: I18nT(`aside.${m}`),
          sub
        }
      })
      .filter((s) => s.sub.length > 0)
  })

  const customList = computed(() => {
    return AppCustomModule.moduleCate
      .map((m) => {
        const sub = AppCustomModule.module
          .filter((s) => {
            return s.moduleType === m.moduleType
          })
          .filter((a) => showItem.value?.[a.typeFlag] !== false)
        return {
          ...m,
          sub
        }
      })
      .filter((s) => s.sub.length > 0)
  })

  const allModule = computed(() => {
    return [firstItem.value, ...customList.value, ...allList.value].filter((f) => !!f)
  })

  const isRouteCurrent = computed(() => {
    const current = appStore.currentPage
    if (current === '/setup') {
      return true
    }
    const find = allModule.value
      .map((m) => m.sub)
      .flat()
      .some((m) => `/${m.typeFlag}` === current)
    console.log('isRouteCurrent: ', current, find)
    return find
  })

  const routeWatchObj = computed(() => {
    return {
      current: isRouteCurrent.value,
      module: allModule.value.length
    }
  })

  watch(
    routeWatchObj,
    (v) => {
      console.log('isRouteCurrent watch: ', v)
      if (!v.current && v.module > 0) {
        const item = allModule.value[0]
        if (item) {
          const sub: any = item?.sub?.[0]
          if (!sub) {
            return
          }
          console.log('sub: ', sub)
          if (sub?.isCustom) {
            const path = `/${sub.typeFlag}`
            AppCustomModule.currentModule = AppCustomModule.module.find(
              (f) => f.id === sub.typeFlag
            )
            Router.push({
              path: '/custom-module'
            })
              .then()
              .catch()
            appStore.currentPage = path
          } else {
            const path = `/${sub.typeFlag}`
            Router.push({
              path
            })
              .then()
              .catch()
            appStore.currentPage = path
          }
        }
      }
    },
    {
      immediate: true
    }
  )

  const allShowTypeFlag = computed(() => {
    return platformAppModules.value
      .filter((f) => f.isService && showItem.value?.[f.typeFlag] !== false)
      .map((f) => f.typeFlag)
  })

  /**
   * Aside service vue component
   */
  const asideServiceShowModule = computed(() => {
    return allShowTypeFlag.value.map((f) => AppServiceModule?.[f]).filter((f) => !!f)
  })

  const serviceShowSystem = computed(() => {
    return platformAppModules.value
      .filter((f) => f.isService && showItem.value?.[f.typeFlag] !== false)
      .map((f) => brewStore.module(f.typeFlag).installed)
      .flat()
  })

  const serviceShowCustom = computed(() => {
    return AppCustomModule.module
      .filter((f) => f.isService && showItem.value?.[f.typeFlag] !== false)
      .map((f) => f.item)
      .flat()
  })

  /**
   * All Aside service is set not group start. And no custom service exists
   */
  const noGroupStart = computed(() => {
    const a = allShowTypeFlag.value.every((typeFlag) => {
      const v = brewStore.currentVersion(typeFlag)
      if (!v) {
        return true
      }
      return appStore.phpGroupStart?.[v.bin] === false
    })
    const b = serviceShowCustom.value.length === 0
    return a && b
  })

  const groupIsRunning = computed(() => {
    return (
      asideServiceShowModule.value.some((m) => !!m?.serviceRunning) ||
      serviceShowSystem.value.some((m) => m.run) ||
      serviceShowCustom.value.some((s) => s.run)
    )
  })

  const groupDisabled = computed(() => {
    const asideModules = asideServiceShowModule.value
    const allDisabled = asideModules.every((m) => !!m?.serviceDisabled)
    const running = asideModules.some((m) => !!m?.serviceFetching)
    console.log('groupDisabled', allDisabled, running, appStore.versionInitiated)
    return (
      allDisabled ||
      running ||
      !appStore.versionInitiated ||
      noGroupStart.value ||
      serviceShowCustom.value.some((s) => s.running)
    )
  })

  const groupClass = computed(() => {
    return {
      'non-draggable': true,
      'swith-power': true,
      on: groupIsRunning.value,
      disabled: groupDisabled.value
    }
  })

  const customModule = computed(() => {
    return AppCustomModule.module
      .filter((f) => f.isService)
      .filter((a) => showItem.value?.[a.typeFlag] !== false)
      .map((m) => {
        return {
          id: m.id,
          label: m.label,
          icon: m.icon,
          show: true,
          disabled: false,
          run: m.item.some((s) => s.run),
          running: m.item.some((s) => s.running)
        }
      })
  })

  const trayStore = computed(() => {
    const dict: any = {}
    let k: AllAppModule
    for (k in AppServiceModule) {
      const m: AppServiceModuleItem = AppServiceModule[k]!
      dict[k] = {
        show: m.showItem,
        disabled: m.serviceDisabled,
        run: m.serviceRunning,
        running: m.serviceFetching
      }
    }
    return {
      ...dict,
      password: appStore?.config?.password,
      lang: appStore?.config?.setup?.lang,
      theme: appStore?.config?.setup?.theme,
      groupDisabled: groupDisabled.value,
      groupIsRunning: groupIsRunning.value,
      customModule: customModule.value
    }
  })

  watch(groupIsRunning, (val) => {
    IPC.send('Application:tray-status-change', val).then((key: string) => {
      IPC.off(key)
    })
  })

  watch(
    trayStore,
    (v) => {
      const current = JSON.stringify(v)
      if (lastTray !== current) {
        lastTray = current
        console.log('trayStore changed: ', current)
        IPC.send('APP:Tray-Store-Sync', JSON.parse(current)).then((key: string) => {
          IPC.off(key)
        })
      }
    },
    {
      immediate: true,
      deep: true
    }
  )

  let LogVM: any
  import('@/components/AppLog/log.vue').then((res) => {
    LogVM = res.default
  })
  const showLog = () => {
    AsyncComponentShow(LogVM).then()
  }

  const appExit = () => {
    ElMessageBox.confirm(I18nT('aside.appExit') + '?', I18nT('host.warning'), {
      confirmButtonText: I18nT('base.confirm'),
      cancelButtonText: I18nT('base.cancel'),
      type: 'warning'
    })
      .then(() => {
        IPC.send('application:exit').then((key: string) => {
          IPC.off(key)
        })
      })
      .catch()
  }

  const groupDo = () => {
    if (groupDisabled.value) {
      return
    }
    const isRun = groupIsRunning.value
    const asideModules = asideServiceShowModule.value
    const all: Array<Promise<string | boolean>> = []
    asideModules.forEach((m) => {
      const arr = m?.groupDo(isRun) ?? []
      all.push(...arr)
    })
    const customModule = AppCustomModule.module
      .filter((a) => a.isService && showItem.value?.[a.typeFlag] !== false)
      .map((m) => {
        return isRun ? m.stop() : m.start()
      })
    all.push(...customModule)
    if (all.length > 0) {
      const err: Array<string> = []
      const run = () => {
        const task = all.pop()
        if (task) {
          task
            .then((s: boolean | string) => {
              if (typeof s === 'string') {
                err.push(s)
              }
              run()
            })
            .catch((e: any) => {
              err.push(e.toString())
              run()
            })
        } else {
          if (err.length === 0) {
            MessageSuccess(I18nT('base.success'))
          } else {
            MessageError(err.join('<br/>'))
          }
        }
      }
      run()
    }
  }

  const switchChange = (flag: AllAppModule) => {
    AppServiceModule?.[flag]?.switchChange()
  }

  const nav = (page: string) => {
    return new Promise((resolve) => {
      if (currentPage.value === page) {
        resolve(true)
      }
      Router.push({
        path: page
      })
        .then()
        .catch()
      appStore.currentPage = page
    })
  }

  IPC.on('APP:Tray-Command').then((key: string, fn: string, arg: any) => {
    console.log('on APP:Tray-Command', key, fn, arg)
    const find = AppCustomModule.module.find((m) => m.id === arg)
    if (find) {
      const run = find.item.some((s) => s.run)
      if (run) {
        find.stop()
      } else {
        find.start()
      }
      return
    }
    if (fn === 'switchChange' && arg === 'php') {
      AppServiceModule.php?.switchChange()
      return
    }
    const fns: { [k: string]: CallbackFn } = {
      groupDo,
      switchChange
    }
    fns?.[fn]?.(arg)
  })

  let autoStarted = false
  let helperInitiated = false
  watch(
    groupDisabled,
    (v) => {
      if (!v) {
        if (autoStarted || !helperInitiated) {
          return
        }
        if (appStore.config.setup?.autoStartService === true) {
          autoStarted = true
          groupDo()
        }
      }
    },
    {
      immediate: true
    }
  )

  EventBus.on('APP-Helper-Check-Success', () => {
    console.log('EventBus on APP-Helper-Check-Success !!!')
    helperInitiated = true
    if (appStore.config.setup?.autoStartService === true && !autoStarted && !groupDisabled.value) {
      autoStarted = true
      groupDo()
    }
  })
</script>
