import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'webServer',
  typeFlag: 'nginx',
  label: 'Nginx',
  icon: import('@/svg/nginx.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 2,
  isService: true,
  isTray: true
}
export default module
