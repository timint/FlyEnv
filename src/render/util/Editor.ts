import { AppStore } from '@/store/app'
import { editor } from 'monaco-editor/esm/vs/editor/editor.api.js'
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css'
import 'monaco-editor/esm/vs/basic-languages/ini/ini.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution.js'

import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js'
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'

import { nativeTheme } from '@/util/NodeFn'

export const EditorConfigMake = async (
  value: string,
  readOnly: boolean,
  wordWrap: 'off' | 'on'
) => {
  const appStore = AppStore()
  const editorConfig = appStore.editorConfig
  let theme = editorConfig.theme
  if (theme === 'auto') {
    let appTheme = appStore?.config?.setup?.theme ?? ''
    if (!appTheme || appTheme === 'system') {
      const t = await nativeTheme.shouldUseDarkColors()
      appTheme = t ? 'dark' : 'light'
    }
    if (appTheme === 'light') {
      theme = 'vs-light'
    } else {
      theme = 'vs-dark'
    }
  }
  return {
    value,
    language: 'ini',
    readOnly,
    scrollBeyondLastLine: false,
    overviewRulerBorder: true,
    automaticLayout: true,
    wordWrap,
    theme: theme,
    fontSize: editorConfig.fontSize,
    lineHeight: editorConfig.lineHeight
  }
}

const Editors: WeakMap<HTMLElement, editor.IStandaloneCodeEditor> = new WeakMap()

export const EditorCreate = (input: HTMLElement, config: any) => {
  if (Editors.has(input)) {
    console.log('Editors.has DOM: ', input)
    const instance = Editors.get(input)
    instance?.setValue(config.value)
    return instance
  }
  console.log('EditorCreate config: ', config)
  const instance = editor.create(input, config)
  Editors.set(input, instance)
  return instance
}

export const EditorDestroy = (instance?: editor.IStandaloneCodeEditor) => {
  instance?.dispose()
  instance?.getModel()?.dispose()
  editor.getModels().forEach((model) => {
    model.dispose()
  })
}
