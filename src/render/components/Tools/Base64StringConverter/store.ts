import { reactive } from 'vue'
import { MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import { textToBase64, base64ToText } from '@shared/base64'

const { clipboard } = require('@electron/remote')

const store = reactive({
  encodeUrlSafe: false,
  decodeUrlSafe: false,
  textInput: '',
  textOutput: '',
  textToBase64() {
    this.textOutput = textToBase64(this.textInput, { makeUrlSafe: this.encodeUrlSafe })
  },
  copyTextOutput() {
    clipboard.writeText(this.textOutput)
    MessageSuccess(I18nT('base.success'))
  },
  base64Input: '',
  base64Output: '',
  error: false,
  base64ToText() {
    this.error = false
    this.base64Output = ''
    try {
      this.base64Output = base64ToText(this.base64Input, { makeUrlSafe: this.decodeUrlSafe })
    } catch (err) {
      this.error = true
    }
  },
  copyBase64Output() {
    clipboard.writeText(this.base64Output)
    MessageSuccess(I18nT('base.success'))
  }
})

export default store
