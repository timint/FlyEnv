import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'language',
  typeFlag: 'node',
  label: 'NodeJS',
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 17
}
export default module
