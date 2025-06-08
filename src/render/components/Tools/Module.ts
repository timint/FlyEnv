import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'
import { I18nT } from '@lang/index'

const module: AppModuleItem = {
  typeFlag: 'tools',
  label: () => I18nT('base.leftTools'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 30
}
export default module
