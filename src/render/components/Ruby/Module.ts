import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'language',
  typeFlag: 'ruby',
  label: 'Ruby',
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 19
}
export default module
