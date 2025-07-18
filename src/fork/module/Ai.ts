import { Base } from './Base'
import { ForkPromise } from '@shared/ForkPromise'
import { apiRequest } from '../util/WebApi'

class Ai extends Base {
  constructor() {
    super()
    this.type = 'ai'
  }

  allLang() {
    return new ForkPromise(async (resolve) => {
      let list: any = []
      try {
        const res = await apiRequest('POST', '/ai/lang_list_all')
        list = res?.[0] ?? []
      } catch (e) {
        console.log('allPrompt: err', e)
      }
      resolve(list)
    })
  }

  allPrompt() {
    return new ForkPromise(async (resolve) => {
      let list: any = []
      try {
        const res = await apiRequest('POST', '/ai/prompt_list_all')
        list = res?.[0] ?? []
      } catch (e) {
        console.log('allPrompt: err', e)
      }
      resolve(list)
    })
  }
}
export default new Ai()
