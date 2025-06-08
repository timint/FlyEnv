import type { SoftInstalled } from '@shared/app'

import { Base } from './Base'
import { ForkPromise } from '@shared/ForkPromise'
import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, realpathSync, readFileSync, statSync, unlinkSync, writeFile, writeFileSync } from 'fs'
import { TaskItem, TaskQueue, TaskQueueProgress } from '@shared/TaskQueue'
import { basename, dirname, isAbsolute, join, resolve as pathResolve } from 'path'
import { zipUnPack } from '@shared/file'
import { EOL } from 'os'
import { PItem, ProcessListSearch, ProcessPidList } from '../Process'
import { AppServiceAliasItem } from '@shared/app'
import { execSync } from 'child_process'
import RequestTimer from '@shared/requestTimer'
import {
  addPath,
  fetchRawPATH,
  getAllFileAsync,
  handleWinPathArr,
  isNTFS,
  setDir777ToCurrentUser,
  uuid,
  writePath
} from '../Fn'

class BomCleanTask implements TaskItem {
  path = ''
  constructor(path: string) {
    this.path = path
  }
  run(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const path = this.path
      try {
        let handled = false
        const stream = createReadStream(path, {
          start: 0,
          end: 3
        })
        stream.on('data', (chunk) => {
          handled = true
          stream.close()
          let buff: any = chunk
          if (
            buff &&
            buff.length >= 3 &&
            buff[0].toString(16).toLowerCase() === 'ef' &&
            buff[1].toString(16).toLowerCase() === 'bb' &&
            buff[2].toString(16).toLowerCase() === 'bf'
          ) {
            buff = readFileSync(path)
            buff = buff.slice(3)
            writeFile(path, buff, 'binary', (err) => {
              buff = null
              if (err) {
                reject(err)
              } else {
                resolve(true)
              }
            })
          } else {
            resolve(false)
          }
        })
        stream.on('error', (err) => {
          handled = true
          stream.close()
          reject(err)
        })
        stream.on('close', () => {
          if (!handled) {
            handled = true
            resolve(false)
          }
        })
      } catch (err) {
        reject(err)
      }
    })
  }
}

class Manager extends Base {
  constructor() {
    super()
  }

  getAllFile(fp: string, fullpath = true) {
    return new ForkPromise((resolve, reject) => {
      getAllFileAsync(fp, fullpath).then(resolve).catch(reject)
    })
  }

  cleanBom(files: Array<string>) {
    return new ForkPromise((resolve, reject, on) => {
      const taskQueue = new TaskQueue()
      taskQueue
        .progress((progress: TaskQueueProgress) => {
          on(progress)
        })
        .end(() => {
          resolve(true)
        })
        .initQueue(
          files.map((p) => {
            return new BomCleanTask(p)
          })
        )
        .run()
    })
  }

  wordSplit(txt: string) {
    return new ForkPromise(async (resolve) => {
      if (!txt.trim()) {
        return resolve([])
      }
      resolve(txt.trim().split(''))
    })
  }

  sslMake(param: { domains: string; root: string; savePath: string }) {
    return new ForkPromise(async (resolve, reject) => {
      const openssl = join(global.Server.AppDir!, 'openssl/bin/openssl.exe')
      if (!existsSync(openssl)) {
        await zipUnPack(join(global.Server.Static!, `zip/openssl.7z`), global.Server.AppDir!)
      }
      const opensslCnf = join(global.Server.AppDir!, 'openssl/openssl.cnf')
      if (!existsSync(opensslCnf)) {
        copyFileSync(join(global.Server.Static!, 'tmpl/openssl.cnf'), opensslCnf)
      }
      const domains = param.domains
        .split('\n')
        .map((item) => {
          return item.trim()
        })
        .filter((item) => {
          return item && item.length > 0
        })
      const saveName = uuid(6) + '.' + domains[0].replace('*.', '')
      let caFile = param.root
      let caFileName = basename(caFile)
      if (caFile.length === 0) {
        caFile = join(param.savePath, uuid(6) + '.RootCA.crt')
        caFileName = basename(caFile)
      }
      caFile = caFile.replace('.crt', '')
      caFileName = caFileName.replace('.crt', '')

      if (!existsSync(caFile + '.crt')) {
        const caKey = join(param.savePath, `${caFileName}.key`)

        process.chdir(dirname(openssl))
        let command = `${basename(openssl)} genrsa -out "${caKey}" 2048`
        execSync(command)

        const caCSR = join(param.savePath, `${caFileName}.csr`)

        process.chdir(dirname(openssl))
        command = `${basename(openssl)} req -new -key "${caKey}" -out "${caCSR}" -sha256 -subj "/CN=Dev Root CA ${caFileName}" -config "${opensslCnf}"`
        execSync(command)

        process.chdir(param.savePath)
        command = `echo basicConstraints=CA:true > "${caFileName}.cnf"`
        execSync(command)

        const caCRT = join(param.savePath, `${caFileName}.crt`)
        const caCnf = join(param.savePath, `${caFileName}.cnf`)

        process.chdir(dirname(openssl))
        command = `${basename(openssl)} x509 -req -in "${caCSR}" -signkey "${caKey}" -out "${caCRT}" -extfile "${caCnf}" -sha256 -days 3650`
        execSync(command)
      }

      let ext = `authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName=@alt_names

[alt_names]${EOL}`
      domains.forEach((item, index) => {
        ext += `DNS.${index + 1} = ${item}${EOL}`
      })
      ext += `IP.1 = 127.0.0.1${EOL}`
      writeFileSync(join(param.savePath, `${saveName}.ext`), ext)

      const saveKey = join(param.savePath, `${saveName}.key`)
      const saveCSR = join(param.savePath, `${saveName}.csr`)
      const saveCrt = join(param.savePath, `${saveName}.crt`)
      const saveExt = join(param.savePath, `${saveName}.ext`)

      process.chdir(dirname(openssl))
      let command = `${basename(openssl)} req -new -newkey rsa:2048 -nodes -keyout "${saveKey}" -out "${saveCSR}" -sha256 -subj "/CN=${saveName}" -config "${opensslCnf}"`
      execSync(command)

      process.chdir(dirname(openssl))
      command = `${basename(openssl)} x509 -req -in "${saveCSR}" -out "${saveCrt}" -extfile "${saveExt}" -CA "${caFile}.crt" -CAkey "${caFile}.key" -CAcreateserial -sha256 -days 3650`
      execSync(command)

      const crtFile = join(param.savePath, `${saveName}.crt`)
      if (existsSync(crtFile)) {
        resolve(true)
      } else {
        reject(new Error('SSL Make Failed!'))
      }
    })
  }

  processFind(name: string) {
    return new ForkPromise(async (resolve) => {
      let list: PItem[] = []
      try {
        list = await ProcessListSearch(name, false)
      } catch (e) {}

      const arrs: PItem[] = []

      const findSub = (item: PItem) => {
        const sub: PItem[] = []
        for (const s of list) {
          if (s.ParentProcessId === item.ProcessId) {
            sub.push(s)
          }
        }
        if (sub.length > 0) {
          item.children = sub
        }
      }

      for (const item of list) {
        findSub(item)
        const p = list.find((s: PItem) => s.ProcessId === item.ParentProcessId)
        if (!p) {
          arrs.push(item)
        }
      }

      resolve(arrs)
    })
  }

  processKill(pids: string[]) {
    return new ForkPromise(async (resolve) => {
      const str = pids.map((s) => `/pid ${s}`).join(' ')
      try {
        execSync(`taskkill /f /t ${str}`)
      } catch (e) {}
      resolve(true)
    })
  }

  portFind(name: string) {
    return new ForkPromise(async (resolve) => {
      const command = `netstat -ano | findstr :${name}`
      let res: any
      try {
        res = execSync(command)
      } catch (e) {}
      const lines = res?.stdout?.trim()?.split('\n') ?? []
      const list = lines
        .filter((s: string) => !s.includes(`findstr `))
        .map((i: string) => {
          const all = i
            .split(' ')
            .filter((s: string) => {
              return !!s.trim()
            })
            .map((s) => s.trim())
          if (all[1].endsWith(`:${name}`)) {
            const PID = all.pop()
            return PID
          } else {
            return undefined
          }
        })
        .filter((p: string) => !!p)
      const arr: any[] = []
      const pids = Array.from(new Set(list))
      if (pids.length === 0) {
        return resolve(arr)
      }
      console.log('pids: ', pids)
      const all = await ProcessPidList()
      for (const pid of pids) {
        const find = all.find((a) => `${a.ProcessId}` === `${pid}`)
        if (find) {
          arr.push({
            PID: find.ProcessId,
            COMMAND: find.CommandLine
          })
        }
      }
      resolve(arr)
    })
  }

  fetchPATH(): ForkPromise<string[]> {
    return new ForkPromise(async (resolve) => {
      const res: any = {
        allPath: [],
        appPath: []
      }
      const pathArr = await fetchRawPATH()
      const allPath = pathArr
        .filter((f) => existsSync(f))
        .map((f) => realpathSync(f))
        .filter((f) => existsSync(f) && statSync(f).isDirectory())
      res.allPath = Array.from(new Set(allPath))

      const dir = join(dirname(global.Server.AppDir!), 'env')
      if (existsSync(dir)) {
        let allFile = readdirSync(dir)
        allFile = allFile
          .filter((f) => existsSync(join(dir, f)))
          .map((f) => realpathSync(join(dir, f)))
          .filter((f) => existsSync(f) && statSync(f).isDirectory())
        res.appPath = Array.from(new Set(allFile))
      }
      resolve(res)
    })
  }

  removePATH(item: SoftInstalled, typeFlag: string) {
    return new ForkPromise(async (resolve, reject) => {
      let oldPath: string[] = []
      try {
        oldPath = await fetchRawPATH()
      } catch (e) {}
      if (oldPath.length === 0) {
        reject(new Error('Fail'))
        return
      }

      console.log('removePATH oldPath 0: ', oldPath)

      const envDir = join(dirname(global.Server.AppDir!), 'env')
      const flagDir = join(envDir, typeFlag)
      try {
        execSync(`rmdir /S /Q "${flagDir}"`)
      } catch (e) {
        console.log('rmdir err: ', e)
      }
      console.log('removePATH flagDir: ', flagDir)

      oldPath = oldPath.filter((p) => {
        const a = p.includes(flagDir)
        const b = p.includes(item.path)
        if (a || b) {
          return false
        }
        let res = true
        if (isAbsolute(p)) {
          try {
            const rp = realpathSync(p)
            if (rp.includes(flagDir) || rp.includes(item.path)) {
              res = false
            }
          } catch (error) {}
        }
        return res
      })

      console.log('removePATH oldPath 1: ', oldPath)

      oldPath = oldPath.filter((p) => !p.startsWith(item.path))

      console.log('removePATH oldPath 2: ', oldPath)

      const dirIndex = oldPath.findIndex((s) => isAbsolute(s))
      const varIndex = oldPath.findIndex((s) => !isAbsolute(s))
      if (varIndex < dirIndex && dirIndex > 0) {
        const dir = oldPath[dirIndex]
        oldPath.splice(dirIndex, 1)
        oldPath.unshift(dir)
      }

      if (typeFlag === 'composer') {
        oldPath = oldPath.filter(
          (s) =>
            !s.includes('%COMPOSER_HOME%\\vendor\\bin') &&
            !s.includes('%APPDATA%\\Composer\\vendor\\bin')
        )
      }

      oldPath = handleWinPathArr(oldPath)

      console.log('removePATH oldPath 3: ', oldPath)

      const pathString = oldPath
      try {
        await writePath(pathString, '')
      } catch (e) {
        return reject(e)
      }

      const allPath = await this.fetchPATH()
      resolve(allPath)
    })
  }

  updatePATH(item: SoftInstalled, typeFlag: string) {
    return new ForkPromise(async (resolve, reject) => {
      let oldPath: string[] = []
      let rawOldPath: string[] = []
      try {
        oldPath = await fetchRawPATH()
        rawOldPath = oldPath.map((s) => {
          if (existsSync(s)) {
            return realpathSync(s)
          }
          return s
        })
      } catch (e) {}
      if (oldPath.length === 0) {
        reject(new Error('Fail'))
        return
      }
      console.log('oldPath: ', oldPath)
      console.log('rawOldPath: ', rawOldPath)

      const binDir = dirname(item.bin)
      /**
       * Initialize the env directory
       * Delete the marker folder
       * If it didn't exist before, recreate the symbolic link folder
       */
      const envDir = join(dirname(global.Server.AppDir!), 'env')
      if (!existsSync(envDir)) {
        mkdirSync(envDir, { recursive: true })
      }
      const flagDir = join(envDir, typeFlag)
      console.log('flagDir: ', flagDir)
      try {
        execSync(`rmdir /S /Q "${flagDir}"`)
      } catch (e) {
        console.log('rmdir err: ', e)
      }
      if (!rawOldPath.includes(binDir)) {
        try {
          execSync(`mklink /J "${flagDir}" "${item.path}"`)
        } catch (e) {
          console.log('updatePATH mklink err: ', e)
        }
      }

      oldPath = oldPath.filter((o) => {
        const a = existsSync(o) && realpathSync(o) === binDir
        return !a
      })

      /**
       * Retrieve all subfolders under the env directory
       */
      let allFile = readdirSync(envDir)
      allFile = allFile
        .filter((f) => existsSync(join(envDir, f)))
        .map((f) => join(envDir, f))
        .filter((f) => {
          let check = false
          try {
            const rf = realpathSync(f)
            check = existsSync(rf) && statSync(rf).isDirectory()
          } catch (e) {
            check = false
          }
          return check
        })

      console.log('oldPath: ', oldPath)
      console.log('allFile: ', allFile)

      /**
       * Remove all env folders from the original PATH
       */
      oldPath = oldPath.filter((o) => !o.includes(envDir))

      if (!(await isNTFS(envDir)) || !(await isNTFS(item.path))) {
        allFile.push(item.path)
      }

      for (const envPath of allFile) {
        const rawEnvPath = realpathSync(envPath)
        oldPath = oldPath.filter((p) => {
          const a = p.includes(envPath)
          const b = p.includes(rawEnvPath)
          if (a || b) {
            return false
          }
          let res = true
          if (isAbsolute(p)) {
            try {
              const rp = realpathSync(p)
              if (rp.includes(envPath) || rp.includes(rawEnvPath)) {
                res = false
              }
            } catch (error) {}
          }
          return res
        })

        oldPath.unshift(envPath)
        if (existsSync(join(envPath, 'bin'))) {
          oldPath.unshift(join(envPath, 'bin'))
        }
        if (existsSync(join(envPath, 'sbin'))) {
          oldPath.unshift(join(envPath, 'sbin'))
        }
        if (existsSync(join(envPath, 'python.exe'))) {
          const pip = join(envPath, 'Scripts/pip.exe')
          if (existsSync(pip)) {
            oldPath.unshift(dirname(pip))
          }
        }
        // Handle Rust
        if (existsSync(join(rawEnvPath, 'cargo/bin/cargo.exe'))) {
          const dirs = readdirSync(rawEnvPath)
          for (const f of dirs) {
            const binDir = join(rawEnvPath, f, 'bin')
            if (existsSync(binDir)) {
              const state = statSync(binDir)
              if (state.isDirectory()) {
                oldPath.unshift(binDir)
              }
            }
          }
        }
      }

      if (typeFlag === 'composer') {
        const bat = join(binDir, 'composer.bat')
        if (!existsSync(bat)) {
          writeFileSync(bat, [
            '@echo off',
            `php "%~dp0composer.phar" %*`
          ].join('\n'))
        }
        let composer_bin_dir = ''
        try {
          const d = execSync(`echo %COMPOSER_HOME%\\Composer`).toString().trim()
          composer_bin_dir = d
          console.log('d: ', d)
        } catch (e) {}
        if (composer_bin_dir && isAbsolute(composer_bin_dir)) {
          oldPath.push(`%COMPOSER_HOME%\\vendor\\bin`)
        } else {
          try {
            const d = execSync(`echo %APPDATA%\\Composer`).toString().trim()
            composer_bin_dir = d
            console.log('d: ', d)
          } catch (e) {}
          if (composer_bin_dir && isAbsolute(composer_bin_dir)) {
            oldPath.push(`%APPDATA%\\Composer\\vendor\\bin`)
          }
        }
      }

      oldPath = handleWinPathArr(oldPath)

      console.log('oldPath: ', oldPath)

      const filePath = oldPath
      let content = ''
      if (typeFlag === 'java') {
        content = `"JAVA_HOME" = "${flagDir}"`
      } else if (typeFlag === 'erlang') {
        content = `"ERLANG_HOME" = "${flagDir}"`
        const f = join(global.Server.Cache!, `${uuid()}.ps1`)
        writeFileSync(
          f,
          `New-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`
        )
        process.chdir(global.Server.Cache!)
        try {
          execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '${f}'; & '${f}'"`)
        } catch (e) {}
        unlinkSync(f)
      }

      try {
        const pathStr = Array.isArray(filePath) ? filePath.join(';') : filePath
        writeFileSync(pathStr, content)
      } catch (e) {
        return reject(e)
      }

      if (typeFlag === 'php') {
        const phpModule = (await import('./Php')).default
        try {
          await phpModule.getIniPath(item)
        } catch (e) {}
      }

      const allPath = await this.fetchPATH()
      resolve(allPath)
    })
  }

  setAlias(
    service: SoftInstalled,
    item: AppServiceAliasItem | undefined,
    old: AppServiceAliasItem | undefined,
    alias: Record<string, AppServiceAliasItem[]>
  ) {
    return new ForkPromise(async (resolve) => {
      await this.initLocalApp(service, service.typeFlag)
      const aliasDir = pathResolve(global.Server.BaseDir!, '../alias')
      mkdirSync(aliasDir, { recursive: true })
      if (old?.id) {
        const oldFile = join(aliasDir, `${old.name}.bat`)
        if (existsSync(oldFile)) {
          unlinkSync(oldFile)
        }
        const index = alias?.[service.bin]?.findIndex((a) => a.id === old.id)
        if (index >= 0) {
          alias[service.bin].splice(index, 1)
        }
      }

      if (item) {
        const file = join(aliasDir, `${item.name}.bat`)
        if (item?.php?.bin) {
          const bin = item?.php?.bin?.replace('php-cgi.exe', 'php.exe')
          const content = `@echo off
chcp 65001>nul
"${bin}" "${service.bin}" %*`
          writeFileSync(file, content)
        } else {
          const bin = service.bin.replace('php-cgi.exe', 'php.exe')
          const content = `@echo off
chcp 65001>nul
"${bin}" %*`
          writeFileSync(file, content)
        }
        if (!item.id) {
          item.id = uuid(8)
          if (!alias[service.bin]) {
            alias[service.bin] = []
          }
          alias[service.bin].unshift(item)
        } else {
          const index = alias?.[service.bin]?.findIndex((a) => a.id === item.id)
          if (index >= 0) {
            alias[service.bin].splice(index, 1, item)
          } else {
            alias[service.bin].unshift(item)
          }
        }
      }

      try {
        execSync(`setx /M FLYENV_ALIAS "${aliasDir}"`)
      } catch (e) {}

      await addPath('%FLYENV_ALIAS%')

      const res = await this.cleanAlias(alias)

      resolve(res)
    })
  }

  cleanAlias(alias: Record<string, AppServiceAliasItem[]>) {
    return new ForkPromise(async (resolve) => {
      const aliasDir = pathResolve(global.Server.BaseDir!, '../alias')
      for (const bin in alias) {
        const item = alias[bin]
        if (!existsSync(bin)) {
          for (const i of item) {
            const file = join(aliasDir, `${i.name}.bat`)
            if (existsSync(file)) {
              unlinkSync(file)
            }
          }
          delete alias[bin]
        } else {
          const arr: AppServiceAliasItem[] = []
          for (const i of item) {
            if (i?.php?.bin && !existsSync(i?.php?.bin)) {
              const file = join(aliasDir, `${i.name}.bat`)
              if (existsSync(file)) {
                unlinkSync(file)
              }
              continue
            }
            arr.push(i)
          }
          alias[bin] = arr
        }
      }
      resolve(alias)
    })
  }

  envPathList() {
    return new ForkPromise(async (resolve, reject) => {
      let oldPath: string[] = []
      try {
        oldPath = await fetchRawPATH()
      } catch (e) {}
      if (oldPath.length === 0) {
        reject(new Error('Fail'))
        return
      }
      const list: any = []
      for (const p of oldPath) {
        let raw = ''
        let error = false
        if (isAbsolute(p)) {
          try {
            raw = realpathSync(p)
            error = !existsSync(raw)
          } catch (e) {
            error = true
          }
        } else if (p.includes('%') || p.includes('$env:')) {
          try {
            raw = execSync(`echo ${p}`).toString().trim() ?? ''
            error = !raw || !existsSync(raw)
          } catch (e) {
            error = true
          }
        }
        list.push({
          path: p,
          raw,
          error
        })
      }
      resolve(list)
    })
  }

  envPathString() {
    return new ForkPromise(async (resolve) => {
      let cmdRes = ''
      let psRes = ''
      try {
        cmdRes = execSync(`set PATH`).toString().trim() ?? ''
      } catch (e) {
        cmdRes = `${e}`
      }
      try {
        psRes = execSync(`$env:PATH`, {
          shell: 'powershell.exe'
        }).toString().trim() ?? ''
      } catch (e) {
        psRes = `${e}`
      }
      resolve({
        cmd: cmdRes,
        ps: psRes
      })
    })
  }

  envPathUpdate(arr: string[]) {
    return new ForkPromise(async (resolve, reject) => {
      try {
        await writePath(arr)
      } catch (e) {
        console.log('envPathUpdate err: ', e)
        return reject(e)
      }
      resolve(true)
    })
  }

  requestTimeFetch(url: string) {
    return new ForkPromise(async (resolve, reject) => {
      const timer = new RequestTimer({
        timeout: 10000,
        retries: 2,
        followRedirects: true,
        maxRedirects: 10,
        keepAlive: true,
        strictSSL: false // Set to false to ignore SSL errors
      })
      try {
        const results = await timer.measure(url)
        const res = RequestTimer.formatResults(results)
        resolve(res)
      } catch (error) {
        reject(error)
      }
    })
  }

  runInTerminal(command: string) {
    return new ForkPromise(async (resolve, reject) => {
      command = JSON.stringify(command).slice(1, -1)
      console.log('command: ', command)
      try {
        execSync(`start powershell -NoExit -Command "${command}"`)
      } catch (e) {
        return reject(e)
      }
      resolve(true)
    })
  }

  openPathByApp(
    dir: string,
    app:
      | 'PowerShell'
      | 'PowerShell7'
      | 'PhpStorm'
      | 'WebStorm'
      | 'IntelliJ'
      | 'PyCharm'
      | 'RubyMine'
      | 'GoLand'
      | 'HBuilderX'
      | 'RustRover'
  ) {
    return new ForkPromise(async (resolve, reject) => {
      const JetBrains = [
        'PhpStorm',
        'WebStorm',
        'IntelliJ',
        'PyCharm',
        'RubyMine',
        'GoLand',
        'RustRover'
      ]
      if (JetBrains.includes(app)) {
        const findIdePath = async (ideName: string) => {
          try {
            // Define all possible registry paths
            const registryPaths = [
              `HKLM\\SOFTWARE\\JetBrains\\${ideName}`,
              `HKLM\\SOFTWARE\\WOW6432Node\\JetBrains\\${ideName}`,
              `HKCU\\SOFTWARE\\JetBrains\\${ideName}`
            ]

            for (const regPath of registryPaths) {
              try {
                // Use the /s parameter to query all subkeys and values
                const stdout = execSync(`reg query "${regPath}" /s`).toString()
                const lines = stdout.split('\n').map((line: string) => line.trim())

                let basePath = null

                for (const line of lines) {
                  if (line.includes('InstallPath') || line.includes('(Default)')) {
                    const pathMatch = line.match(/(InstallPath|\(Default\))\s+REG_SZ\s+(.+)/i)
                    if (pathMatch) {
                      basePath = pathMatch[2].trim()
                      break // Exit the loop once the path is found
                    }
                  }
                }

                if (basePath) {
                  return formatExePath(basePath, ideName)
                }
              } catch (e) {
                continue
              }
            }

            return null
          } catch (error) {
            console.error(`Error finding IDE path: ${error}`)
            return null
          }
        }

        const findToolboxIdePath = async (ideName: string) => {
          try {
            // Attempt to get the Toolbox installation directory
            const stdout = execSync(
              `reg query "HKCU\\SOFTWARE\\JetBrains\\Toolbox" /v "InstallDir"`
            ).toString()
            const match = stdout.match(/InstallDir\s+REG_SZ\s+(.+)/i)
            if (!match) return null

            const toolboxPath = match[1].trim()
            const appsPath = `${toolboxPath}\\apps\\${ideName}\\ch-0`

            // Get the latest version directory (sorted by modification time in descending order)
            const dirs = execSync(`dir "${appsPath}" /AD /B /O-N`).toString()
            const latestVersionDir = dirs.split('\r\n')[0].trim()
            if (!latestVersionDir) return null

            return formatExePath(`${appsPath}\\${latestVersionDir}`, ideName)
          } catch (error) {
            console.error(`Error finding Toolbox IDE path: ${error}`)
            return null
          }
        }

        // Unified formatting of executable file paths
        const formatExePath = (basePath: string, ideName: string) => {
          const exeMap: Record<string, string> = {
            phpstorm: 'phpstorm64.exe',
            pycharm: 'pycharm64.exe',
            intellijidea: 'idea64.exe',
            webstorm: 'webstorm64.exe',
            clion: 'clion64.exe',
            rider: 'rider64.exe',
            goland: 'goland64.exe',
            datagrip: 'datagrip64.exe',
            rubymine: 'rubymine64.exe',
            appcode: 'appcode64.exe'
          }

          const normalizedName = ideName.toLowerCase()
          const exeName = exeMap[normalizedName] || `${normalizedName}64.exe`
          const exePath = `${basePath}\\bin\\${exeName}`

          if (existsSync(exePath)) {
            return exePath
          }
          return null
        }

        const openWithIde = async (ideName: string, folderPath: string) => {
          try {
            let idePath = await findIdePath(ideName)
            if (!idePath) {
              idePath = await findToolboxIdePath(ideName)
            }

            if (!idePath) {
              console.error(`${ideName} not found`)
              return false
            }

            execSync(`"${idePath}" "${folderPath}"`)
            console.log(`Opened ${folderPath} with ${ideName}`)
            return true
          } catch (error) {
            console.error(`Error opening IDE: ${error}`)
            return false
          }
        }

        const res = await openWithIde(app, dir)
        if (res) {
          return resolve(true)
        }
        return reject(new Error(`${app} Not Found`))
      }
      if (app === 'HBuilderX') {
        const getHBuilderXPath = async (): Promise<string | null> => {
          try {
            // 查询注册表
            const stdout = execSync(`reg query "HKCR\\hbuilderx\\shell\\open\\command" /ve`).toString()

            // 提取路径（示例输出: "(Default) REG_SZ \"D:\\Program Files\\HBuilderX\\HBuilderX.exe\" \"%1\""）
            const match = stdout.match(/"(.*?HBuilderX\.exe)"/i)
            if (match && match[1]) {
              return match[1] // 返回可执行文件完整路径
            }
            return null
          } catch (error) {
            return null
          }
        }
        const openWithHBuilderX = async (targetPath: string): Promise<boolean> => {
          try {
            const hbuilderxPath = await getHBuilderXPath()
            if (!hbuilderxPath) {
              return false
            }
            execSync(`"${hbuilderxPath}" "${targetPath}"`)
            return true
          } catch (error: any) {
            return false
          }
        }

        const resHBuilderX = await openWithHBuilderX(dir)
        if (resHBuilderX) {
          return resolve(true)
        }
        return reject(new Error(`HBuilderX Not Found`))
      }
      let cmd = ''
      if (app === 'PowerShell') {
        cmd = `cd "${dir}"`
        cmd = JSON.stringify(cmd).slice(1, -1)
        cmd = `start powershell -NoExit -Command "${cmd}"`
      } else if (app === 'PowerShell7') {
        cmd = `cd "${dir}"`
        cmd = JSON.stringify(cmd).slice(1, -1)
        cmd = `start pwsh.exe -NoExit -Command "${cmd}"`
      }
      try {
        execSync(cmd)
      } catch (e) {
        return reject(e)
      }
      resolve(true)
    })
  }

  initAllowDir(json: string) {
    return new ForkPromise(async (resolve) => {
      const jsonFile = join(dirname(global.Server.AppDir!), 'bin/.flyenv.dir')
      mkdirSync(dirname(jsonFile), { recursive: true })
      writeFileSync(jsonFile, json)
      resolve(true)
    })
  }

  envAllowDirUpdate(dir: string, action: 'add' | 'del') {
    return new ForkPromise(async (resolve) => {
      const jsonFile = join(dirname(global.Server.AppDir!), 'bin/.flyenv.dir')
      let json: string[] = []
      if (existsSync(jsonFile)) {
        try {
          const content = readFileSync(jsonFile, 'utf-8')
          json = JSON.parse(content)
        } catch (e) {}
      }
      if (action === 'add') {
        if (!json.includes('dir')) {
          json.push(dir)
        }
      } else {
        const index = json.indexOf(dir)
        if (index >= 0) {
          json.splice(index, 1)
        }
      }
      writeFileSync(jsonFile, JSON.stringify(json))
      resolve(true)
    })
  }

  initFlyEnvSH() {
    return new ForkPromise(async (resolve) => {
      const psVersions = [
        { name: 'PowerShell 5.1', exe: 'powershell.exe', profileType: 'CurrentUserCurrentHost' },
        { name: 'PowerShell 7+', exe: 'pwsh.exe', profileType: 'CurrentUserAllHosts' }
      ]

      const flyenvScriptPath = join(dirname(global.Server.AppDir!), 'bin/flyenv.ps1')
      mkdirSync(dirname(flyenvScriptPath), { recursive: true });
      copyFileSync(join(global.Server.Static!, 'sh/fly-env.ps1'), flyenvScriptPath)

      for (const version of psVersions) {
        try {
          const stdout = execSync(`Write-Output $PROFILE.${version.profileType}`, { shell: version.exe }).toString()
          const profilePath = stdout.trim();

          if (!profilePath || profilePath === '') continue

          // Write configuration (if it does not exist)
          mkdirSync(dirname(profilePath), { recursive: true })
          const loadCommand = `. "${flyenvScriptPath.replace(/\\/g, '/')}"\n`

          if (!existsSync(profilePath)) {
            writeFileSync(profilePath, `# FlyEnv Auto-Load\n${loadCommand}`)
          } else {
            const content = readFileSync(profilePath, 'utf-8')
            if (!content.includes(loadCommand.trim())) {
              writeFileSync(
                profilePath,
                `${content.trim()}\n\n# FlyEnv Auto-Load\n${loadCommand}`
              );
            }
          }
        } catch (err: any) {
          console.log('initFlyEnvSH err: ', err)
        }
      }
      try {
        execSync([
          "if ((Get-ExecutionPolicy -Scope CurrentUser) -eq 'Restricted') {",
          '  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force',
          '}',
        ].join('\n'), { shell: 'powershell.exe' })
      } catch (e) {}

      resolve(true);
    })
  }

  fixDirRole(dir: string) {
    return new ForkPromise(async (resolve) => {
      try {
        await setDir777ToCurrentUser(dir)
      } catch (e) {}
      resolve(true)
    });
  }
}

export default new Manager()
