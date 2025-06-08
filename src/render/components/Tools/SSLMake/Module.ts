import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'SSLMake',
  type: 'Development',
  label: () => I18nT('util.toolSSL'),
  icon: import('@/svg/sslmake.svg?raw'),
  index: 2,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
