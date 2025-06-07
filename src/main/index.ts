import Launcher from './Launcher'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

global.__static = resolve(__dirname, 'static/')
global.launcher = new Launcher()
