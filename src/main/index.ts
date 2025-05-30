import path from 'path'
import Launcher from './Launcher'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

global.__static = path.resolve(__dirname, 'static/')
global.launcher = new Launcher()
