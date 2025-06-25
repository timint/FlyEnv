import { resolve as pathResolve } from 'path'
import Launcher from './Launcher'
import { runMigrations } from './migrate'

global.__static = pathResolve(__dirname, 'static/')

;(async () => {
  await runMigrations()
  global.launcher = new Launcher()
})()
