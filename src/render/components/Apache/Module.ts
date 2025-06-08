import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'webServer',
  typeFlag: 'apache',
  label: 'Apache',
  icon: import('@/svg/apache.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 1,
  isService: true,
  isTray: true
}
export default module
