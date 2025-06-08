import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'searchEngine',
  typeFlag: 'elasticsearch',
  label: 'Elasticsearch',
  icon: import('@/svg/elasticsearch.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 3,
  isService: true,
  isTray: true
}
export default module
