import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import type { AppHost } from '@shared/app'
import type { ServiceItem } from './ServiceItem'
import { ServiceItemJavaSpring } from './ServiceItemJavaSpring'
import { ServiceItemJavaTomcat } from './ServiceItemJavaTomcat'
import { ServiceItemNode } from './ServiceItemNode'
import { ServiceItemGo } from './ServiceItemGo'
import { ServiceItemPython } from './ServiceItemPython'

class Service extends Base {
  all: Record<string, ServiceItem> = {}
  start(host: AppHost) {
    return new ForkPromise(async (resolve, reject) => {
      if (this.all[`${host.id}`]) {
        const task = this.all[`${host.id}`]
        await task.stop()
      }
      let item!: ServiceItem
      if (host.type === 'java') {
        if (host?.subType === 'springboot') {
          item = new ServiceItemJavaSpring()
        } else {
          item = new ServiceItemJavaTomcat()
        }
      } else if (host.type === 'node') {
        item = new ServiceItemNode()
      } else if (host.type === 'go') {
        item = new ServiceItemGo()
      } else if (host.type === 'python') {
        item = new ServiceItemPython()
      }

      item.id = `${host.id}`
      item.watchDir = host.root
      item.start(host).then(resolve).catch(reject)
      this.all[`${host.id}`] = item
    })
  }
  stop(host: AppHost) {
    return new ForkPromise(async (resolve, reject) => {
      const task = this.all[`${host.id}`]
      if (task) {
        task
          .stop(true)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            delete this.all?.[`${host.id}`]
          })
      } else {
        reject(new Error('No Task'))
      }
    })
  }
}

export default new Service()
