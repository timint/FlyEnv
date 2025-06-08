import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'PhpObfuscator',
  type: 'Development',
  label: () => I18nT('util.toolPhpObfuscator'),
  icon: import('@/svg/jiami.svg?raw'),
  index: 7,
  component: markRaw(defineAsyncComponent(() => import('./Index.vue')))
}
export default module
