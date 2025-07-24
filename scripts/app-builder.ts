import { build as viteBuild } from 'vite'
import { build as electronBuild, Platform } from 'electron-builder'

import viteConfig from '../configs/vite.config'
import { DoFix } from './fix'
import { isLinux, isMacOS, isWindows } from '../src/shared/utils'

async function packMain() {
  try {
    await DoFix()
    if (isMacOS() || isLinux()) {
      const config = viteConfig.vite.mac
      await viteBuild(config.dist)
      await viteBuild(config.distFork)
      await viteBuild(config.distHelper)
    } else if (isWindows()) {
      console.log('packMain isWindows !!!')
      const config = viteConfig.vite.win
      await viteBuild(config.dist)
      await viteBuild(config.distFork)
    }
  } catch (err) {
    console.log('\nfailed to build main process')
    console.error(`\n${err}\n`)
    process.exit(1)
  }
}

async function packRenderer() {
  try {
    return viteBuild(viteConfig.buildConfig)
  } catch (err) {
    console.log('\nfailed to build renderer process')
    console.error(`\n${err}\n`)
    process.exit(1)
  }
}

const buildStart = Date.now()

Promise.all([packMain(), packRenderer()])
  .then(async () => {
    const options: any = {
      targets: Platform.current().createTarget()
    }
    if (isMacOS()) {
      console.log('electron-builder isMacOS !!!')
      const config = (await import('../configs/electron-builder')).default
      options.config = config as any
    } else if (isWindows()) {
      console.log('electron-builder isWindows !!!')
      const config = (await import('../configs/electron-builder.win')).default
      options.config = config as any
    } else if (isLinux()) {
      console.log('electron-builder isLinux !!!')
      const config = (await import('../configs/electron-builder.linux')).default
      options.config = config as any
    }

    electronBuild(options)
      .then(() => {
        console.log('\nBuild completed in', Math.floor((Date.now() - buildStart) / 1000) + ' s.')
      })
      .catch((e) => {
        console.error(e)
      })
  })
  .catch((e) => console.log(e))
