/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

/* eslint-disable */

// Install `electron-debug` with `devtron`
require('electron-debug')({
  // devToolsMode: 'right',
  showDevTools: true,
  logLevel: 'verbose', // Show debug logs in console
})

// Install `vue-devtools`
require('electron').app.on('ready', () => {
    console.info('✅ Electron ready!')
  let installExtension = require('electron-devtools-installer')
    const vue_devtools_beta = { id: "ljjemllljcmogpfapbkkighbhhppjdbg", electron: ">=1.2.1" }
    installExtension.default(vue_devtools_beta)
    .then(() => {
        console.info('✅ VUEJS_DEVTOOLS installed successfully')
    })
    .catch((err: Error) => {
      console.error('Unable to install `vue-devtools`: \n', err)
    })
})

// Require `main` process to boot app
require('./index')

export {}
