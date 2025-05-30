import { join } from 'path'
import { isEqual } from 'lodash'
import type { AppHost } from '@shared/app'
import { chmod, existsSync, readFileSync } from 'fs'
import { hostAlias } from '../../Fn'
import { makeAutoSSL } from './SSL'

type VhostTmplType = {
  nginx: string
  apache: string
  nginxSSL: string
  apacheSSL: string
  caddy: string
  caddySSL: string
}

let _tmpl: VhostTmplType | undefined
export const vhostTmpl = async () => {
  if (_tmpl) {
    return _tmpl
  }
  let nginxtmpl = join(global.Server.Static!, 'tmpl/nginx.vhost')
  let custom = join(global.Server.BaseDir!, 'VhostTemplate/nginx.vhost')
  if (existsSync(custom)) {
    nginxtmpl = custom
  }

  let nginxSSLtmpl = join(global.Server.Static!, 'tmpl/nginxSSL.vhost')
  custom = join(global.Server.BaseDir!, 'VhostTemplate/nginxSSL.vhost')
  if (existsSync(custom)) {
    nginxSSLtmpl = custom
  }

  let apachetmpl = join(global.Server.Static!, 'tmpl/apache.vhost')
  custom = join(global.Server.BaseDir!, 'VhostTemplate/apache.vhost')
  if (existsSync(custom)) {
    apachetmpl = custom
  }

  let apacheSSLtmpl = join(global.Server.Static!, 'tmpl/apacheSSL.vhost')
  custom = join(global.Server.BaseDir!, 'VhostTemplate/apacheSSL.vhost')
  if (existsSync(custom)) {
    apacheSSLtmpl = custom
  }

  let caddytmpl = join(global.Server.Static!, 'tmpl/CaddyfileVhost')
  custom = join(global.Server.BaseDir!, 'VhostTemplate/caddy.vhost')
  if (existsSync(custom)) {
    caddytmpl = custom
  }

  let caddySSLtmpl = join(global.Server.Static!, 'tmpl/CaddyfileVhostSSL')
  custom = join(global.Server.BaseDir!, 'VhostTemplate/caddySSL.vhost')
  if (existsSync(custom)) {
    caddySSLtmpl = custom
  }

  const nginx = readFileSync(nginxtmpl, 'utf-8')
  const apache = readFileSync(apachetmpl, 'utf-8')
  const nginxSSL = readFileSync(nginxSSLtmpl, 'utf-8')
  const apacheSSL = readFileSync(apacheSSLtmpl, 'utf-8')
  const caddy = readFileSync(caddytmpl, 'utf-8')
  const caddySSL = readFileSync(caddySSLtmpl, 'utf-8')

  _tmpl = {
    nginx,
    apache,
    nginxSSL,
    apacheSSL,
    caddy,
    caddySSL
  }
  return _tmpl
}

export const updateAutoSSL = async (host: AppHost, old: AppHost) => {
  const oldAliasArr = hostAlias(old)
  const newAliasArr = hostAlias(host)
  if (host?.useSSL && host?.autoSSL) {
    if (host?.autoSSL !== old?.autoSSL || !isEqual(oldAliasArr, newAliasArr)) {
      const ssl = await makeAutoSSL(host)
      if (ssl) {
        host.ssl.cert = ssl.crt
        host.ssl.key = ssl.key
      } else {
        host.autoSSL = false
      }
    }
  }
}

export const setDirRole = async (dir: string, depth = 0) => {
  console.log('#setDirRole: ', dir, depth)
  if (!dir || dir === '/') {
    return
  }
  if (existsSync(dir)) {
    try {
      if (existsSync(dir)) {
        await chmod(dir, 0o755)
      }
      console.log('#setDirRole success !!!')
    } catch (e) {
      console.log('#setDirRole err: ', e)
    }
  }
}

export const updateRootRule = async (host: AppHost, old: AppHost) => {
  if (host.root !== old.root) {
    await setDirRole(host.root)
  }
}
