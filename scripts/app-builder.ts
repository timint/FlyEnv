import { build as viteBuild } from 'vite'
import { build as esbuild } from 'esbuild'
import { build as electronBuild, Platform, CliOptions } from 'electron-builder'
import esbuildConfig from '../configs/esbuild.config'
import viteConfig from '../configs/vite.config'
import electronBuilderConfig from '../configs/electron-builder'

async function packMain() {
  try {
    await esbuild(esbuildConfig.dist)
    await esbuild(esbuildConfig.distFork)
  } catch (err) {
    console.error('Failed to build main process', err)
    process.exit(1)
  }
}

async function packRenderer() {
  try {
    return viteBuild(viteConfig.buildConfig)
  } catch (err) {
    console.error('Failed to build renderer process', err)
    process.exit(1)
  }
}

const buildStart = Date.now()

Promise.all([packMain(), packRenderer()])
  .then(() => {
    const options: CliOptions = {
      targets: Platform.current().createTarget(),
      config: electronBuilderConfig
    }

    electronBuild(options)
      .then(() => {
        console.info('Build completed in', Math.floor((Date.now() - buildStart) / 1000) + ' s')
      })
      .catch((err) => {
        console.error(err)
      })
  })
  .catch((err) => console.error(err))
