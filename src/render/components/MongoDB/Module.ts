import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'dataBaseServer',
  typeFlag: 'mongodb',
  label: 'MongoDB',
  icon: import('@/svg/MongoDB.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 8,
  isService: true,
  isTray: true
}
export default module
