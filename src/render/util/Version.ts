import Base from '@/core/Base'
import { I18nT } from '@lang/index'
import { shell } from '@electron/remote'
import { existsSync } from 'fs'

export const staticVersionDel = (dir: string) => {
  Base._Confirm(I18nT('service.staticDelAlert'), undefined, {
    customClass: 'confirm-del',
    type: 'warning'
  })
    .then(() => {
      if (existsSync(dir)) {
        shell.showItemInFolder(dir)
      }
    })
    .catch(() => {})
}
