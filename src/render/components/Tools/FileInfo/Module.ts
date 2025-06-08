import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'FileInfo',
  type: 'Development',
  label: () => I18nT('util.toolFileInfo'),
  icon: import('@/svg/fileinfo.svg?raw'),
  index: 3,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
