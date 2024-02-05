import { createApp, toRaw, markRaw } from 'vue'
import router from '../router/index'
import Base from './Base'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// import 'element-plus/theme-chalk/dark/css-vars.css'
import SVGIcons from '../components/YbSvgIcon/index'
import PoperFix from './directive/PoperFix/index'
import { AppStore } from '@/store/app'
import { AppI18n } from '@shared/lang'
import { createPinia } from 'pinia'

const baseStore = createPinia()

export function VueExtend(App: any, data?: any) {
  const app = createApp(App, data)
  app.use(router)
  app.use(PoperFix)
  app.use(SVGIcons, 'ybIcon')
  app.use(ElementPlus, { size: 'default' })
  app.use(baseStore)
  const appStore = AppStore()
  app.use(AppI18n(appStore?.config?.setup?.lang))
  app.mixin({
    beforeCreate() {
      this.$children = new Set()
      if (this?.$parent?.$children) {
        this.$parent.$children.add(this)
      }
    },
    created() {
      this._uid = this.$.uid
    },
    beforeUnmount() {
      if (this?.$parent?.$children && this.$parent.$children.has(this)) {
        this.$parent.$children.delete(this)
      }
      if (this?.$children && this?.$children?.clear) {
        this?.$children?.clear()
        this.$children = null
      }
    },
    unmounted() {},
    methods: {
      markRaw,
      toRaw
    }
  })
  Base.init(app)
  return app
}
