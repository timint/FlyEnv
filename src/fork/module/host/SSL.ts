import { ForkPromise } from '@shared/ForkPromise'
import { copyFile, execPromise, hostAlias, mkdirp, remove, writeFile, zipUnpack } from '../../Fn'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { EOL } from 'os'
import type { AppHost } from '@shared/app'
import Helper from '../../Helper'
import { isWindows } from '@shared/utils'

const initCARoot = () => {
  return new Promise(async (resolve) => {
    const CARoot = join(global.Server.BaseDir!, 'CA/PhpWebStudy-Root-CA.crt')
    const command = `certutil -addstore root "${CARoot}"`
    try {
      const res = await execPromise(command)
      console.log('initCARoot res111: ', res)
    } catch {}
    resolve(true)
  })
}

export const makeAutoSSL = (host: AppHost): ForkPromise<{ crt: string; key: string } | false> => {
  return new ForkPromise(async (resolve) => {
    try {
      const alias = hostAlias(host)
      const CARoot = join(global.Server.BaseDir!, 'CA/PhpWebStudy-Root-CA.crt')
      const CADir = dirname(CARoot)

      if (isWindows()) {
        if (!existsSync(CARoot)) {
          await mkdirp(CADir)
          await zipUnpack(join(global.Server.Static!, `zip/CA.7z`), CADir)
          await initCARoot()
        }

        const openssl = join(global.Server.AppDir!, 'openssl/bin/openssl.exe')
        if (!existsSync(openssl)) {
          await zipUnpack(join(global.Server.Static!, `zip/openssl.7z`), global.Server.AppDir!)
        }

        const hostCAName = `CA-${host.id}`
        const hostCADir = join(CADir, `${host.id}`)
        if (existsSync(hostCADir)) {
          await remove(hostCADir)
        }
        await mkdirp(hostCADir)
        let ext = `authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName=@alt_names

[alt_names]${EOL}`
        alias.forEach((item, index) => {
          ext += `DNS.${index + 1} = ${item}${EOL}`
        })
        ext += `IP.1 = 127.0.0.1${EOL}`
        await writeFile(join(hostCADir, `${hostCAName}.ext`), ext)

        const rootCA = join(CADir, 'PhpWebStudy-Root-CA')

        const opensslCnf = join(global.Server.AppDir!, 'openssl/openssl.cnf')
        if (!existsSync(opensslCnf)) {
          await copyFile(join(global.Server.Static!, 'tmpl/openssl.cnf'), opensslCnf)
        }

        process.chdir(dirname(openssl))
        const caKey = join(hostCADir, `${hostCAName}.key`)
        const caCSR = join(hostCADir, `${hostCAName}.csr`)
        let command = `openssl.exe req -new -newkey rsa:2048 -nodes -keyout "${caKey}" -out "${caCSR}" -sha256 -subj "/CN=${hostCAName}" -config "${opensslCnf}"`
        console.log('command: ', command)
        await execPromise(command)

        process.chdir(dirname(openssl))
        const caCRT = join(hostCADir, `${hostCAName}.crt`)
        const caEXT = join(hostCADir, `${hostCAName}.ext`)
        command = `openssl.exe x509 -req -in "${caCSR}" -out "${caCRT}" -extfile "${caEXT}" -CA "${rootCA}.crt" -CAkey "${rootCA}.key" -CAcreateserial -sha256 -days 3650`
        console.log('command: ', command)
        await execPromise(command)

        const crt = join(hostCADir, `${hostCAName}.crt`)
        if (!existsSync(crt)) {
          resolve(false)
          return
        }
        resolve({
          crt,
          key: join(hostCADir, `${hostCAName}.key`)
        })
      } else {
        const caFileName = 'PhpWebStudy-Root-CA'
        if (!existsSync(CARoot)) {
          await mkdirp(CADir)
          let command = `openssl genrsa -out ${caFileName}.key 2048;`
          command += `openssl req -new -key ${caFileName}.key -out ${caFileName}.csr -sha256 -subj "/CN=${caFileName}";`
          command += `echo "basicConstraints=CA:true" > ${caFileName}.cnf;`
          command += `openssl x509 -req -in ${caFileName}.csr -signkey ${caFileName}.key -out ${caFileName}.crt -extfile ${caFileName}.cnf -sha256 -days 3650;`
          await execPromise(command, {
            cwd: CADir
          })
          if (!existsSync(CARoot)) {
            resolve(false)
            return
          }
          await Helper.send('host', 'sslAddTrustedCert', CADir)
          const res: any = await Helper.send('host', 'sslFindCertificate', CADir)
          if (
            !res.stdout.includes('PhpWebStudy-Root-CA') &&
            !res.stderr.includes('PhpWebStudy-Root-CA')
          ) {
            resolve(false)
            return
          }
        }
        const hostCAName = `CA-${host.id}`
        const hostCADir = join(CADir, `${host.id}`)
        if (existsSync(hostCADir)) {
          await remove(hostCADir)
        }
        await mkdirp(hostCADir)
        let ext = `authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName=@alt_names

[alt_names]${EOL}`
        alias.forEach((item, index) => {
          ext += `DNS.${index + 1} = ${item}${EOL}`
        })
        ext += `IP.1 = 127.0.0.1${EOL}`
        await writeFile(join(hostCADir, `${hostCAName}.ext`), ext)

        const rootCA = join(CADir, 'PhpWebStudy-Root-CA')

        let command = `openssl req -new -newkey rsa:2048 -nodes -keyout ${hostCAName}.key -out ${hostCAName}.csr -sha256 -subj "/CN=${hostCAName}";`
        command += `openssl x509 -req -in ${hostCAName}.csr -out ${hostCAName}.crt -extfile ${hostCAName}.ext -CA "${rootCA}.crt" -CAkey "${rootCA}.key" -CAcreateserial -sha256 -days 3650;`
        await execPromise(command, {
          cwd: hostCADir
        })
        const crt = join(hostCADir, `${hostCAName}.crt`)
        if (!existsSync(crt)) {
          resolve(false)
          return
        }
        resolve({
          crt,
          key: join(hostCADir, `${hostCAName}.key`)
        })
      }
    } catch {
      resolve(false)
    }
  })
}
