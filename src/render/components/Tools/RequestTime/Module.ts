import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'RequestTime',
  type: 'Development',
  label: () => I18nT('tools.URLTimingAnalyzer'),
  icon: import('@/svg/time.svg?raw'),
  index: 2,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
