import { nextTick, onMounted, onUnmounted, ref, watch, Ref } from 'vue'
import { MessageError, MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import type { FSWatcher } from 'fs'
import { editor } from 'monaco-editor/esm/vs/editor/editor.api.js'
import { EditorConfigMake, EditorCreate } from '@/util/Editor'
import { existsSync, writeFileSync, readFileSync, watch as fsWatch } from 'fs'
import { shell } from '@electron/remote'

export const LogSetup = (file: Ref<string>) => {
  const logRef = ref()
  const log = ref('')
  let watcher: FSWatcher | null
  let monacoInstance: editor.IStandaloneCodeEditor | null

  const isDisabled = () => {
    return !file.value || !existsSync(file.value)
  }

  const getLog = () => {
    if (existsSync(file.value)) {
      const watchLog = () => {
        if (watcher) {
          watcher.close()
          watcher = null
        }
        if (!watcher) {
          watcher = fsWatch(file.value, () => {
            read().then()
          })
        }
      }
      const read = () => {
        return new Promise((resolve) => {
          readFileSync(file.value, 'utf-8')
            .then((str: string) => {
              log.value = str
              resolve(true)
            })
            .catch((e: any) => {
              MessageError(e.toString())
            })
        })
      }
      read().then(() => {
        watchLog()
      })
    } else {
      log.value = I18nT('base.noLogs')
    }
  }

  const logDo = (action: 'open' | 'refresh' | 'clean') => {
    if (!existsSync(file.value)) {
      MessageError(I18nT('base.noFoundLogFile'))
      return
    }
    switch (action) {
      case 'open':
        shell.showItemInFolder(file.value)
        break
      case 'refresh':
        getLog()
        break
      case 'clean':
        writeFileSync(file.value, '')
          .then(() => {
            log.value = ''
            MessageSuccess(I18nT('base.success'))
          })
          .catch((e: any) => {
            MessageError(`${e}`)
          })
        break
    }
  }

  const initEditor = () => {
    if (!monacoInstance) {
      const inputDom: HTMLElement = logRef.value as HTMLElement
      if (!inputDom || !inputDom?.style) {
        return
      }
      monacoInstance = EditorCreate(inputDom, EditorConfigMake(log.value, true, 'on'))
    } else {
      monacoInstance.setValue(log.value)
    }
  }

  watch(log, () => {
    nextTick().then(() => {
      initEditor()
    })
  })

  onMounted(() => {
    nextTick().then(() => {
      initEditor()
    })
  })

  onUnmounted(() => {
    monacoInstance && monacoInstance.dispose()
    monacoInstance = null
    if (watcher) {
      watcher.close()
      watcher = null
    }
  })

  getLog()

  watch(file, () => {
    getLog()
  })

  return {
    isDisabled,
    logDo,
    logRef
  }
}
