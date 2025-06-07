import type { AppHost, SoftInstalled } from '@shared/app'
import { ForkPromise } from '@shared/ForkPromise'
import { join } from 'path'
import { existsSync, copyFileSync, readdirSync, readdir, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { setDirRole } from './Host'
import { I18nT } from '@lang/index'
import { downFile, moveDirToDir, waitTime } from '../../Fn'
import { zipUnPack } from '@shared/file'
import { fetchHostList } from './HostFile'

export function TaskAddRandaSite(this: any, version?: SoftInstalled, write = true, ipv6 = true) {
  return new ForkPromise(async (resolve, reject) => {
    const baseName = join(global.Server.BaseDir!, 'www')
    let host = `www.test.com`
    let i = 0
    let dir = `${baseName}/${host}`
    while (existsSync(dir)) {
      i += 1
      host = `www.test${i}.com`
      dir = `${baseName}/${host}`
    }
    mkdirSync(dir, { recursive: true })
    const hostItem: any = {
      id: new Date().getTime(),
      name: host,
      alias: '',
      useSSL: false,
      ssl: {
        cert: '',
        key: ''
      },
      port: {
        nginx: 80,
        apache: 80,
        nginx_ssl: 443,
        apache_ssl: 443,
        caddy: 80,
        caddy_ssl: 443
      },
      nginx: {
        rewrite: ''
      },
      url: '',
      root: dir,
      mark: 'Created by FlyEnv AI',
      phpVersion: undefined
    }
    if (version?.num) {
      hostItem.phpVersion = version.num
    }
    try {
      await this.handleHost(hostItem, 'add')
      await this.writeHosts(write, ipv6)
      if (version?.num) {
        const file = join(dir, 'index.php')
        writeFileSync(
          file,
          `<?php
        phpinfo();
        `
        )
      } else {
        const file = join(dir, 'index.html')
        writeFileSync(
          file,
          `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FlyEnv AI Created</title>
  </head>
  <body>
    FlyEnv AI Created
  </body>
</html>
`
        )
      }
      await setDirRole(dir)
      resolve({
        host,
        dir,
        version
      })
    } catch (e) {
      reject(e)
    }
  })
}

export function TaskAddPhpMyAdminSite(this: any, phpVersion?: number, write = true, ipv6 = true) {
  return new ForkPromise(async (resolve, reject, on) => {
    const zipFile = join(global.Server.Cache!, 'phpMyAdmin.zip')
    const siteDir = join(global.Server.BaseDir!, 'www/phpMyAdmin')
    let hostList: Array<AppHost> = []
    try {
      hostList = await fetchHostList()
    } catch (e) {}
    const find = hostList.find((h) => h.name === 'phpmyadmin.test')
    if (find) {
      resolve(true)
      return
    }

    const doMake = async () => {
      if (!existsSync(siteDir) || readdirSync(siteDir).length === 0) {
        if (!existsSync(zipFile)) {
          reject(new Error(I18nT('fork.downFileFail')))
          return
        }
        if (existsSync(siteDir)) {
          rmSync(siteDir)
        }
        mkdirSync(siteDir, { recursive: true })
        const tmplDir = join(global.Server.Cache!, 'phpMyAdmin-tmpl')
        try {
          await zipUnPack(zipFile, tmplDir)
          const subDirs = await readdir(tmplDir)
          const subDir = subDirs.pop()
          if (subDir) {
            await moveDirToDir(join(tmplDir, subDir), siteDir)
            await waitTime(300)
            rmSync(tmplDir)
          }
        } catch (e) {
          reject(e)
          return
        }
        if (readdirSync(siteDir).length === 0) {
          reject(new Error(I18nT('fork.downFileFail')))
          return
        }

        const ini = join(siteDir, 'config.sample.inc.php')
        if (existsSync(ini)) {
          let content = readFileSync(ini, 'utf-8')
          content = content.replace(
            `$cfg['Servers'][$i]['host'] = 'localhost';`,
            `$cfg['Servers'][$i]['host'] = '127.0.0.1';`
          )
          const cpFile = join(siteDir, 'config.inc.php')
          writeFileSync(cpFile, content)
        }
      }

      let useSSL = false
      let autoSSL = false
      const CARoot = join(global.Server.BaseDir!, 'CA/PhpWebStudy-Root-CA.crt')
      if (existsSync(CARoot)) {
        useSSL = true
        autoSSL = true
      }

      const hostItem: any = {
        id: new Date().getTime(),
        name: 'phpmyadmin.test',
        alias: '',
        useSSL: useSSL,
        autoSSL: autoSSL,
        ssl: {
          cert: '',
          key: ''
        },
        port: {
          nginx: 80,
          apache: 80,
          nginx_ssl: 443,
          apache_ssl: 443,
          caddy: 80,
          caddy_ssl: 443
        },
        nginx: {
          rewrite: ''
        },
        url: '',
        root: siteDir,
        mark: 'PhpMyAdmin (Auto Created)',
        phpVersion: undefined
      }
      if (phpVersion) {
        hostItem.phpVersion = phpVersion
      }
      try {
        await this.handleHost(hostItem, 'add')
        await this.writeHosts(write, ipv6)
        await setDirRole(siteDir)
        resolve(true)
      } catch (e) {
        reject(e)
      }
    }
    if (existsSync(zipFile)) {
      doMake().then()
      return
    }

    const zipTmpFile = join(global.Server.Cache!, 'phpMyAdmin-Cache')
    if (existsSync(zipTmpFile)) {
      rmSync(zipTmpFile)
    }
    const url = 'https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.zip'
    downFile(url, zipTmpFile)
      .on(on)
      .then(async () => {
        return copyFileSync(zipTmpFile, zipFile)
      })
      .then(() => {
        if (existsSync(zipFile)) {
          doMake().then()
          return
        } else {
          reject(new Error(I18nT('fork.downFileFail')))
        }
      })
      .catch(reject)
  })
}
