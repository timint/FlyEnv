import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'ProcessKill',
  type: 'Development',
  label: () => I18nT('util.toolProcessKill'),
  icon: import('@/svg/process.svg?raw'),
  index: 6,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
