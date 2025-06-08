import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'dataBaseServer',
  typeFlag: 'postgresql',
  label: 'PostgreSQL',
  icon: import('@/svg/postgresql.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 9,
  isService: true,
  isTray: true
}
export default module
