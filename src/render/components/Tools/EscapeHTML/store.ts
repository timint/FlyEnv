import { reactive } from 'vue'
import { MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'

const { clipboard } = require('@electron/remote')
import { escape, unescape } from 'lodash-es'

const store = reactive({
  encodeInput: '<title>PhpWebStudy</title>',
  encodeOutput: '',
  doEncode() {
    this.encodeOutput = escape(this.encodeInput)
  },
  copyEncode() {
    clipboard.writeText(this.encodeOutput)
    MessageSuccess(I18nT('base.success'))
  },
  decodeInput: '&lt;title&gt;PhpWebStudy&lt;/title&gt;',
  decodeOutput: '',
  doDecode() {
    this.decodeOutput = unescape(this.decodeInput)
  },
  copyDecode() {
    clipboard.writeText(this.decodeOutput)
    MessageSuccess(I18nT('base.success'))
  }
})

export default store
