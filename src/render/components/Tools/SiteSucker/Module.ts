import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'SiteSucker',
  type: 'Development',
  label: () => I18nT('util.toolSiteSucker'),
  icon: import('@/svg/sucker.svg?raw'),
  index: 9,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
