import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'dataQueue',
  typeFlag: 'memcached',
  label: 'Memcached',
  icon: import('@/svg/memcached.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 10,
  isService: true,
  isTray: true
}
export default module
