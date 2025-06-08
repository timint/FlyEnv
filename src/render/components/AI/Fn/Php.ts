import type BaseTask from '@/components/AI/Task/BaseTask'
import type { SoftInstalled } from '@shared/app'

import { startService } from '@/util/Service'
import { AIStore } from '@/components/AI/store'
import { I18nT } from '@lang/index'

export function startPhp(this: BaseTask, version: SoftInstalled) {
  return new Promise(async (resolve, reject) => {
    const res = await startService('php', version)
    if (res === true) {
      const aiStore = AIStore()
      aiStore.chatList.push({
        user: 'ai',
        content: I18nT('ai.phpServiceStarted', { num: version.num })
      })
      resolve(true)
    } else if (typeof res === 'string') {
      reject(new Error(res))
    }
  })
}
