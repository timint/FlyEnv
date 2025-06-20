import type { AppToolModuleItem } from '@/core/type'

const modules = import.meta.glob('@/components/Tools/*/Module.ts', { eager: true })
console.debug('modules: ', modules)
const AppToolModules: AppToolModuleItem[] = []
for (const k in modules) {
  const m: any = modules[k]
  AppToolModules.push(m.default)
}
AppToolModules.sort((a, b) => {
  return a.index! - b.index!
})
export { AppToolModules }
