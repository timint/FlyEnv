import { reactive } from 'vue'
import { lang } from '@/util/NodeFn'
import { resolve } from '@/util/path-browserify'
import { shell } from '@/util/NodeFn'

export const LangSetup = reactive({
  loading: false,
  async doLoad() {
    if (this.loading) {
      return
    }
    this.loading = true
    await lang.loadCustomLang()
    this.loading = false
  },
  async openLangDir() {
    await lang.initCustomLang()
    const langDir = resolve(window.Server.BaseDir!, '../lang')
    shell.openPath(langDir).then().catch()
  }
})
