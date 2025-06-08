import type { AppToolModuleItem } from '@/core/type'

import { defineAsyncComponent, markRaw } from 'vue'
import { I18nT } from '@lang/index'

const module: AppToolModuleItem = {
  id: 'mime-types',
  type: 'Web',
  label: () => I18nT('tools.mime-types-title'),
  icon: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3.6 9h16.8"></path><path d="M3.6 15h16.8"></path><path d="M11.5 3a17 17 0 0 0 0 18"></path><path d="M12.5 3a17 17 0 0 1 0 18"></path></g></svg>',
  index: 1,
  component: markRaw(defineAsyncComponent(() => import('./index.vue')))
}
export default module
