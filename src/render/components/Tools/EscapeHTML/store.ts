import { reactive } from 'vue'
import { MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import { escapeHtml, unescapeHtml } from '@/core/Helpers/Escape'
import { clipboard } from '@electron/remote'

const store = reactive({
  encodeInput: '<title>FlyEnv</title>',
  encodeOutput: '',
  doEncode() {
    this.encodeOutput = escapeHtml(this.encodeInput)
  },
  copyEncode() {
    clipboard.writeText(this.encodeOutput)
    MessageSuccess(I18nT('base.success'))
  },
  decodeInput: '&lt;title&gt;FlyEnv&lt;/title&gt;',
  decodeOutput: '',
  doDecode() {
    this.decodeOutput = unescapeHtml(this.decodeInput)
  },
  copyDecode() {
    clipboard.writeText(this.decodeOutput)
    MessageSuccess(I18nT('base.success'))
  }
})

export default store
