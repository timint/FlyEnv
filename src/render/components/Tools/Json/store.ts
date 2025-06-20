import { reactive } from 'vue'
import {
  javascriptToJson,
  jsonToGoBase,
  jsonToGoStruct,
  jsonToJava,
  jsonToJSDoc,
  jsonToJSON,
  jsonToKotlin,
  jsonToMySQL,
  jsonToPList,
  jsonToRust,
  jsonToTOML,
  jsonToTs,
  jsonToXML,
  jsonToYAML,
  phpToJson,
  plistToJson,
  tomlToJson,
  xmlToJson,
  yamlToJson
} from '@shared/transform'
import { JSONSort } from '@shared/JsonSort'
import { editor } from 'monaco-editor/esm/vs/editor/editor.api.js'
import { FormatHtml, FormatPHP, FormatTS, FormatYaml } from '@shared/FormatCode'
import { I18nT } from '@lang/index'

export class JSONStoreTab {
  value = ''
  json: any = null
  type = ''
  to = 'json'
  toValue = ''
  toLang = 'javascript'
  editor!: () => editor.IStandaloneCodeEditor
  constructor() {
    this.value = I18nT('tools.inputTips')
    this.type = I18nT('tools.noInputTips')
  }

  transformTo(sort?: 'asc' | 'desc') {
    if (!this.json) {
      this.editor().setValue(I18nT('tools.parseFailTips'))
      return
    }
    let json = JSON.parse(JSON.stringify(this.json))
    if (sort) {
      json = JSONSort(json, sort)
    }
    const model = this.editor().getModel()!
    let value = ''
    switch (this.to) {

      case 'goBson':
        this.toLang = 'go'
        editor.setModelLanguage(model, 'go')
        value = jsonToGoBase(json)
        break

      case 'goStruct':
        this.toLang = 'go'
        editor.setModelLanguage(model, 'go')
        value = jsonToGoStruct(json)
        break

      case 'Java':
        this.toLang = 'java'
        editor.setModelLanguage(model, 'java')
        value = jsonToJava(json)
        break

      case 'JSDoc':
        this.toLang = 'javascript'
        editor.setModelLanguage(model, 'javascript')
        value = jsonToJSDoc(json)
        break

      case 'js':
        this.toLang = 'javascript'
        editor.setModelLanguage(model, 'javascript')
        value = jsonToJSON(json)
        break

      case 'json':
        this.toLang = 'json'
        editor.setModelLanguage(model, 'json')
        value = JSON.stringify(json, null, 4)
        break

      case 'Kotlin':
        this.toLang = 'kotlin'
        editor.setModelLanguage(model, 'kotlin')
        value = jsonToKotlin(json)
        break

      case 'MySQL':
        this.toLang = 'mysql'
        editor.setModelLanguage(model, 'mysql')
        value = jsonToMySQL(json)
        break

      case 'php':
        this.toLang = 'php'
        editor.setModelLanguage(model, 'php')
        if (this.type !== 'PHP') {
          value = JSON.stringify(json, null, 4)
          value = value.replace(/": /g, `" => `).replace(/\{/g, '[').replace(/\}/g, ']')
        } else {
          value = this.value
        }
        if (!value.includes('<?php')) {
          value = '<?php\n' + value
        }
        FormatPHP(value)
          .then((php: string) => {
          this.editor().setValue(php)
          })
          .catch(() => {
          this.editor().setValue(value)
          })
        return

      case 'plist':
        this.toLang = 'xml'
        editor.setModelLanguage(model, 'xml')
        if (this.type === 'PList') {
          value = this.value
        } else {
          value = jsonToPList(json)
        }
        FormatHtml(value)
          .then((xml: string) => {
          this.editor().setValue(xml)
          })
          .catch(() => {
          this.editor().setValue(value)
          })
        return

      case 'rustSerde':
        this.toLang = 'rust'
        editor.setModelLanguage(model, 'rust')
        value = jsonToRust(json)
        break

      case 'toml':
        this.toLang = 'toml'
        editor.setModelLanguage(model, 'toml')
        value = jsonToTOML(json)
        break

      case 'ts':
        this.toLang = 'typescript'
        editor.setModelLanguage(model, 'typescript')
        value = jsonToTs(json)
        FormatTS(value)
          .then((ts) => {
          this.editor().setValue(ts)
          })
          .catch(() => {
          this.editor().setValue(value)
          })
        return

      case 'xml':
        this.toLang = 'xml'
        editor.setModelLanguage(model, 'xml')
        if (this.type === 'XML') {
          value = this.value
        } else {
          value = jsonToXML(json)
        }
        console.debug('xml value: ', value)
        FormatHtml(value)
          .then((xml: string) => {
          this.editor().setValue(xml)
          })
          .catch(() => {
          this.editor().setValue(value)
          })
        return

      case 'yaml':
        this.toLang = 'yaml'
        editor.setModelLanguage(model, 'yaml')
        if (this.type === 'YAML') {
          value = this.value
        } else {
          value = jsonToYAML(json)
        }
        FormatYaml(value)
          .then((xml: string) => {
          this.editor().setValue(xml)
          })
          .catch(() => {
          this.editor().setValue(value)
          })
        return
    }
    this.editor().setValue(value)
  }

  checkFrom() {
    let type = ''
    if (!this.value.trim()) {
      this.type = I18nT('tools.inputCheckFailTips')
      this.transformTo()
      return
    }

    try {
      const u = new URL(this.value)
      const obj: any = {}
      Object.entries(Object.fromEntries(u?.searchParams.entries() ?? [])).forEach(([k, v]) => {
        console.debug('k: ', k, v)
        obj[k] = v
      })
      this.json = {
        Protocol: u.protocol,
        Username: u.username,
        Password: u.password,
        Hostname: u.hostname,
        Port: u.port,
        Path: u.pathname,
        Params: u.search,
        ParamObject: obj
      }
      console.debug('this.json: ', this.json)
      type = 'JSON'
    } catch (err) {
      this.json = null
      type = ''
    }
    console.debug('type 000: ', type)
    if (type) {
      this.type = type
      this.transformTo()
      return
    }

    try {
      this.json = javascriptToJson(this.value)
      type = 'JSON'
    } catch (err) {
      this.json = null
      type = ''
    }
    console.debug('type 000: ', type)
    if (type) {
      this.type = type
      this.transformTo()
      return
    }

    try {
      this.json = phpToJson(this.value)
      type = 'PHP'
    } catch (err) {
      this.json = null
      type = ''
    }
    console.debug('type 111: ', type)
    if (type) {
      this.type = type
      this.transformTo()
      return
    }

    try {
      this.json = plistToJson(this.value)
      type = 'PList'
    } catch (err) {
      console.debug('e 222: ', e)
      this.json = null
      type = ''
    }
    console.debug('type 222: ', type)
    if (type) {
      this.type = type
      this.transformTo()
      return
    }

    try {
      this.json = xmlToJson(this.value)
      type = 'XML'
    } catch (err) {
      this.json = null
      type = ''
    }
    console.debug('type 333: ', type)
    if (type) {
      this.type = type
      this.transformTo()
      return
    }

    try {
      this.json = yamlToJson(this.value)
      type = 'YAML'
    } catch (err) {
      this.json = null
      type = ''
    }
    console.debug('type 444: ', type)
    if (type) {
      this.type = type
      this.transformTo()
      return
    }

    try {
      this.json = tomlToJson(this.value)
      type = 'TOML'
    } catch (err) {
      this.json = null
      type = ''
    }
    console.debug('type 555: ', type)
    if (type) {
      this.type = type
      this.transformTo()
      return
    }

    this.type = I18nT('tools.inputCheckFailTips')
    this.transformTo()
  }
}

export type JSONStoreType = {
  index: number
  currentTab: string
  style: any
  tabs: { [k: string]: JSONStoreTab }
}

let style: any = localStorage.getItem('PWS-JSON-LeftStle')
if (style) {
  style = JSON.parse(style)
}

const JSONStore: JSONStoreType = {
  index: 1,
  currentTab: 'tab-1',
  style: style,
  tabs: {
    'tab-1': new JSONStoreTab()
  }
}

export default reactive(JSONStore)
