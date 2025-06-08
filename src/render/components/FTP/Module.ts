import type { AppModuleItem } from '@/core/type'

import { defineAsyncComponent } from 'vue'

const module: AppModuleItem = {
  moduleType: 'ftpServer',
  typeFlag: 'pure-ftpd',
  label: 'FTP',
  icon: import('@/svg/ftp.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 15,
  isService: true,
  isTray: true
}
export default module
