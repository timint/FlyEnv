/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

/* eslint-disable */

import { installExtension } from 'electron-devtools-installer';
import electronDebug from 'electron-debug';
import { app } from 'electron'

electronDebug({
  // devToolsMode: 'right',
  showDevTools: true
})

app.on('ready', async () => {
  console.log('electron ready !!!!!!')
  const vue_devtools_beta = { id: 'ljjemllljcmogpfapbkkighbhhppjdbg', electron: '>=1.2.1' };
  installExtension.default(vue_devtools_beta)
    .then(() => {
      console.log('VUEJS_DEVTOOLS !!!')
    })
    .catch((err: Error) => {
      console.log('Unable to install `vue-devtools`: \n', err)
    })
})

// Require `main` process to boot app
import './index'

export {}
