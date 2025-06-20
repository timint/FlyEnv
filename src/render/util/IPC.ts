import { uuid } from './Index'

const { ipcRenderer } = require('electron')
class IPC {
  listens: { [key: string]: Function }

  constructor() {
    this.listens = {}
    ipcRenderer.on('command', (e, command, key, ...args) => {
      console.log('command on: ', command, key, args)
      if (this.listens[key]) {
        this.listens[key](key, ...args)
      } else if (this.listens[command]) {
        this.listens[command](command, ...args)
      }
    })
  }
  send(command: string, ...args: any) {
    const key = 'IPC-Key-' + uuid()
    console.info(`Sending IPC command: "${command}"`, {
      ipcKey: key,
      command: command,
      args: args
    })
    ipcRenderer.send('command', command, key, ...args)
    return {
      then: (callback: Function) => {
        this.listens[key] = callback
      }
    }
  }

  on(command: string) {
    return {
      then: (callback: Function) => {
        this.listens[command] = callback
      }
    }
  }

  off(command: string) {
    delete this.listens[command]
  }
}

export default new IPC()
