import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'PortKill',
  type: 'Development',
  label: () => I18nT('util.toolPortKill'),
  icon: import('@/svg/portkill.svg?raw'),
  index: 5,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
