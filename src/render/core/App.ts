import type { AppModuleItem } from '@/core/type'

const modules = import.meta.glob('@/components/*/Module.ts', { eager: true })
console.debug('modules: ', modules)
const AppModules: AppModuleItem[] = []
for (const k in modules) {
  const m: any = modules[k]
  AppModules.push(m.default)
}
console.debug('arr: ', AppModules)
AppModules.sort((a, b) => {
  return a.asideIndex! - b.asideIndex!
})
export { AppModules }
