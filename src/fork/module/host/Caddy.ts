import type { AppHost } from '@shared/app'
import { join } from 'path'
import { chmod, copyFile, mkdirp, readFile, remove, writeFile } from 'fs-extra'
import { hostAlias } from '../../Fn'
import { vhostTmpl } from './Host'
import { existsSync } from 'fs'
import { isEqual } from 'lodash'
import Helper from '../../Helper'

const handleReverseProxy = (host: AppHost, content: string) => {
  let x: any = content.match(/(#PWS-REVERSE-PROXY-BEGIN#)([\s\S]*?)(#PWS-REVERSE-PROXY-END#)/g)
  if (x && x[0]) {
    x = x[0]
    content = content.replace(`\n${x}`, '').replace(`${x}`, '')
  }
  if (host?.reverseProxy && host?.reverseProxy?.length > 0) {
    const arr = ['#PWS-REVERSE-PROXY-BEGIN#']
    host.reverseProxy.forEach((item) => {
      const path = item.path
      const url = item.url
      arr.push(`    reverse_proxy ${path} {
        to ${url}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }`)
    })
    arr.push('#PWS-REVERSE-PROXY-END#')
    arr.push('    file_server')
    const replace = arr.join('\n')
    content = content.replace('file_server', `\n${replace}`)
  }
  return content
}

export const makeCaddyConf = async (host: AppHost) => {
  const caddyvpath = join(global.Server.BaseDir!, 'vhost/caddy')
  await mkdirp(caddyvpath)
  const httpNames: string[] = []
  const httpsNames: string[] = []
  hostAlias(host).forEach((h) => {
    if (!host?.port?.caddy || host.port.caddy === 80) {
      httpNames.push(`http://${h}`)
    } else {
      httpNames.push(`http://${h}:${host.port.caddy}`)
    }
    if (host.useSSL) {
      httpsNames.push(`https://${h}:${host?.port?.caddy_ssl ?? 443}`)
    }
  })

  const tmpl = await vhostTmpl()

  const contentList: string[] = []

  const hostName = host.name
  const root = host.root
  const phpv = host.phpVersion
  const logFile = join(global.Server.BaseDir!, `vhost/logs/${hostName}.caddy.log`)

  const httpHostNameAll = httpNames.join(',\n')
  let content = tmpl.caddy
    .replace('{ServerNames}', httpHostNameAll)
    .replace('{LogFile}', logFile)
    .replace('{ServerRoot}', root)
  if (phpv) {
    content = content.replace('{PHPVersion}', `${phpv}`)
  } else {
    content = content.replace('import enable-php-select {PHPVersion}', `##Static Site Caddy##`)
  }
  content = handleReverseProxy(host, content)
  contentList.push(content)

  if (host.useSSL) {
    let tls = 'internal'
    if (host.ssl.cert && host.ssl.key) {
      tls = `"${host.ssl.cert}" "${host.ssl.key}"`
    }
    const httpHostNameAll = httpsNames.join(',\n')
    let content = tmpl.caddySSL
      .replace('{ServerNames}', httpHostNameAll)
      .replace('{LogFile}', logFile)
      .replace('{SSLCertAndKey}', tls)
      .replace('{ServerRoot}', root)
    if (phpv) {
      content = content.replace('{PHPVersion}', `${phpv}`)
    } else {
      content = content.replace('import enable-php-select {PHPVersion}', `##Static Site Caddy##`)
    }
    content = handleReverseProxy(host, content)
    contentList.push(content)
  }

  const confFile = join(caddyvpath, `${host.name}.conf`)
  await writeFile(confFile, contentList.join('\n'))
}

export const updateCaddyConf = async (host: AppHost, old: AppHost) => {
  const logpath = join(global.Server.BaseDir!, 'vhost/logs')
  const caddyvpath = join(global.Server.BaseDir!, 'vhost/caddy')
  await mkdirp(caddyvpath)
  await mkdirp(logpath)

  if (host.name !== old.name) {
    const cvhost = {
      oldFile: join(caddyvpath, `${old.name}.conf`),
      newFile: join(caddyvpath, `${host.name}.conf`)
    }
    const arr = [cvhost]
    for (const f of arr) {
      if (existsSync(f.oldFile)) {
        let hasErr = false
        try {
          await copyFile(f.oldFile, f.newFile)
        } catch (e) {
          hasErr = true
        }
        if (hasErr) {
          try {
            const content = await Helper.send('tools', 'readFileByRoot', f.oldFile)
            await writeFile(f.newFile, content)
          } catch (e) {}
        }
        hasErr = false
        try {
          await remove(f.oldFile)
        } catch (e) {
          hasErr = true
        }
        if (hasErr) {
          try {
            await Helper.send('tools', 'rm', f.oldFile)
          } catch (e) {}
        }
      }
      if (existsSync(f.newFile)) {
        await chmod(f.newFile, '0777')
      }
    }
  }
  const caddyConfPath = join(caddyvpath, `${host.name}.conf`)
  let hasChanged = false

  if (!existsSync(caddyConfPath)) {
    await makeCaddyConf(host)
  }

  let contentCaddyConf = await readFile(caddyConfPath, 'utf-8')

  const find: Array<string> = []
  const replace: Array<string> = []
  if (host.name !== old.name) {
    hasChanged = true
    find.push(...[join(logpath, `${old.name}.caddy.log`)])
    replace.push(...[join(logpath, `${host.name}.caddy.log`)])
  }
  const oldAliasArr = hostAlias(old)
  const newAliasArr = hostAlias(host)

  if (
    !isEqual(oldAliasArr, newAliasArr) ||
    old.port.caddy !== host.port.caddy ||
    old.port.caddy_ssl !== host.port.caddy_ssl
  ) {
    hasChanged = true
    const oldHttpNames: string[] = []
    const oldHttpsNames: string[] = []
    const hostHttpNames: string[] = []
    const hostHttpsNames: string[] = []

    oldAliasArr.forEach((h) => {
      if (!old?.port?.caddy || old.port.caddy === 80) {
        oldHttpNames.push(`http://${h}`)
      } else {
        oldHttpNames.push(`http://${h}:${old.port.caddy}`)
      }
      if (old.useSSL) {
        oldHttpsNames.push(`https://${h}:${old?.port?.caddy_ssl ?? 443}`)
      }
    })

    newAliasArr.forEach((h) => {
      if (!host?.port?.caddy || host.port.caddy === 80) {
        hostHttpNames.push(`http://${h}`)
      } else {
        hostHttpNames.push(`http://${h}:${host.port.caddy}`)
      }
      if (host.useSSL) {
        hostHttpsNames.push(`https://${h}:${host?.port?.caddy_ssl ?? 443}`)
      }
    })

    find.push(...[oldHttpNames.join(',\n'), oldHttpsNames.join(',\n')])
    replace.push(...[hostHttpNames.join(',\n'), hostHttpsNames.join(',\n')])
  }

  if (host.ssl.cert !== old.ssl.cert || host.ssl.key !== old.ssl.key) {
    hasChanged = true
    find.push(`tls (.*?)\\n`)
    replace.push(`tls "${host.ssl.cert}" "${host.ssl.key}"\n`)
  }
  if (host.root !== old.root) {
    hasChanged = true
    find.push(`root * (.*?)\\n`)
    replace.push(`root * "${host.root}"\n`)
  }
  if (host.phpVersion !== old.phpVersion) {
    hasChanged = true
    if (old.phpVersion) {
      find.push(...[`import(\\s+)enable-php-select(.*?)\\r\\n`])
      find.push(...[`import(\\s+)enable-php-select(.*?)\\n`])
    } else {
      find.push(...[`import(\\s+)enable-php-select(.*?)\\r\\n`])
      find.push(...[`import(\\s+)enable-php-select(.*?)\\n`])
      find.push(...['##Static Site Caddy##'])
    }
    if (host.phpVersion) {
      if (old.phpVersion) {
        replace.push(...[`import enable-php-select ${host.phpVersion}\r\n`])
        replace.push(...[`import enable-php-select ${host.phpVersion}\n`])
      } else {
        replace.push(...[`import enable-php-select ${host.phpVersion}\r\n`])
        replace.push(...[`import enable-php-select ${host.phpVersion}\n`])
        replace.push(...[`import enable-php-select ${host.phpVersion}`])
      }
    } else {
      if (old.phpVersion) {
        replace.push(...['##Static Site Caddy##\r\n'])
        replace.push(...['##Static Site Caddy##\n'])
      } else {
        replace.push(...['##Static Site Caddy##\r\n'])
        replace.push(...['##Static Site Caddy##\n'])
        replace.push(...['##Static Site Caddy##'])
      }
    }
  }
  if (!isEqual(host?.reverseProxy, old?.reverseProxy)) {
    hasChanged = true
  }
  if (hasChanged) {
    find.forEach((s, i) => {
      contentCaddyConf = contentCaddyConf.replace(new RegExp(s, 'g'), replace[i])
      contentCaddyConf = contentCaddyConf.replace(s, replace[i])
    })
    contentCaddyConf = handleReverseProxy(host, contentCaddyConf)
    await writeFile(caddyConfPath, contentCaddyConf)
  }
}
