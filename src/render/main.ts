import { VueExtend } from './core/VueExtend'
import App from './App.vue'
import '@/components/Theme/Index.scss'
import IPC from '@/util/IPC'
import { AppI18n } from '@lang/index'
import { AppStore } from '@/store/app'
import { SiteSuckerStore } from '@/components/Tools/SiteSucker/store'
import { DnsStore } from '@/components/DNS/dns'
import { ThemeInit } from '@/util/Theme'
import { AppToolStore } from '@/components/Tools/store'
import { SetupStore } from '@/components/Setup/store'
import { AppLogStore } from '@/components/AppLog/store'
import { loadCustomerLang } from '@lang/loader'
import { AppCustomerModule } from '@/core/Module'
import { getGlobal } from '@electron/remote'

global.Server = getGlobal('Server')

const app = VueExtend(App)
loadCustomerLang().then().catch()

let inited = false
IPC.on('APP-Ready-To-Show').then(() => {
  console.log('APP-Ready-To-Show !!!!!!')
  if (!inited) {
    inited = true
    const store = AppStore()
    AppCustomerModule.init()
    store
      .initConfig()
      .then(() => {
        ThemeInit()
        const config = store.config.setup
        AppI18n(config?.lang)
        return store.initHost()
      })
      .then(() => {
        app.mount('#app')
      })
    SiteSuckerStore().init()
    DnsStore().init()
    AppToolStore.init()
    SetupStore().init()
    AppLogStore.init().then().catch()
    store.chechAutoHide()
  } else {
    console.log('has inited !!!!')
  }
})

IPC.on('APP-License-Need-Update').then(() => {
  SetupStore().init()
})
