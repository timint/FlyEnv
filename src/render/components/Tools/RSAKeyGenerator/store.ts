import { reactive } from 'vue'
import { MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import { pki } from 'node-forge'
import { clipboard } from '@electron/remote'

function generateRawPairs({ bits = 2048 }) {
  return new Promise<{ privateKey: string; publicKey: string }>((resolve, reject) => {
    if (bits % 8 !== 0 || bits < 256 || bits > 16384) {
      reject(new Error('Bits should be 256 <= bits <= 16384 and be a multiple of 8'))
      return
    }
    pki.rsa.generateKeyPair(
      { bits, workers: 2 },
      (err: any, keyPair: { privateKey: any; publicKey: any }) => {
        if (err) {
          reject(err)
          return
        }
        resolve({
          privateKey: pki.privateKeyToPem(keyPair.privateKey),
          publicKey: pki.publicKeyToPem(keyPair.publicKey)
        })
      }
    )
  })
}

const store = reactive({
  bits: 2048,
  publicKeyPem: '',
  privateKeyPem: '',
  timer: undefined,
  debounce: 350,
  async generateKeyPair() {
    this.privateKeyPem = ''
    this.publicKeyPem = ''
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(async () => {
      try {
        const { privateKey, publicKey } = await generateRawPairs({ bits: this.bits })
        this.privateKeyPem = privateKey
        this.publicKeyPem = publicKey
      } catch (e) {}
      this.timer = undefined
    }, this.debounce) as any
  },
  copyPublicKey() {
    clipboard.writeText(this.publicKeyPem)
    MessageSuccess(I18nT('base.success'))
  },
  copyPrivateKey() {
    clipboard.writeText(this.privateKeyPem)
    MessageSuccess(I18nT('base.success'))
  }
})

export default store
