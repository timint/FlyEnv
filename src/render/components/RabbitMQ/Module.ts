import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'dataQueue',
  typeFlag: 'rabbitmq',
  label: 'RabbitMQ',
  icon: import('@/svg/rabbitmq.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 12,
  isService: true,
  isTray: true
}
export default module
