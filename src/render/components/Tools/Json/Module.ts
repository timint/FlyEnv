import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'JsonParse',
  type: 'Development',
  label: () => I18nT('tools.jsonParseTitle'),
  icon: import('@/svg/json1.svg?raw'),
  index: 0,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
