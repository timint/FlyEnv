import BaseTask from '@/components/AI/Task/BaseTask'
import { AIStore } from '@/components/AI/store'
import { startNginx } from '@/components/AI/Fn/Nginx'
import { I18nT } from '@lang/index'

export class NginxStartFail extends BaseTask {
  constructor() {
    super()
    this.task = [
      {
        content: () => {
          const aiStore = AIStore()
          aiStore.chatList.push({
            user: 'ai',
            content: I18nT('ai.tryingToStartNginxService')
          })
        },
        run: startNginx.bind(this)
      }
    ]
  }
}
