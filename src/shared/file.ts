import { appendFile, chmodSync, copyFileSync, createReadStream, existsSync, readdir, readdirSync, readFile, stat, statSync, writeFile } from 'fs'
import path from 'path'
import compressing from '7zip-min-electron'
import crypto from 'crypto'

export function getAllFile(fp: string, fullpath = true) {
  let arr: Array<string> = []
  if (!existsSync(fp)) {
    return arr
  }
  const state = statSync(fp)
  if (state.isFile()) {
    return [fp]
  }
  const files = readdirSync(fp)
  files.forEach(function (item: string) {
    const fPath = path.join(fp, item)
    if (existsSync(fPath)) {
      const stat = statSync(fPath)
      if (stat.isDirectory()) {
        const sub = getAllFile(fPath, fullpath)
        arr = arr.concat(sub)
      }
      if (stat.isFile()) {
        arr.push(fullpath ? fPath : item)
      }
    }
  })
  return arr
}

export function getAllFileAsync(fp: string, fullpath = true) {
  return new Promise<Array<string>>((resolve) => {
    stat(fp, (_: any, stat: any) => {
      if (stat.isFile()) {
        resolve([fp])
      } else if (stat.isDirectory()) {
        let arr: Array<string> = []
        const subs: Array<Promise<Array<string>>> = []
        readdir(fp, (_: any, paths: Array<string>) => {
          paths.forEach((item, index) => {
            const fPath = path.join(fp, item)
            stat(fPath, (_: any, stat: any) => {
              if (stat.isDirectory()) {
                subs.push(getAllFileAsync(fPath, fullpath))
              }
              if (stat.isFile()) {
                arr.push(fullpath ? fPath : item)
              }
              if (index === paths.length - 1) {
                if (subs.length > 0) {
                  Promise.all(subs).then((arrs) => {
                    arr = arr.concat(...arrs)
                    resolve(arr)
                  })
                } else {
                  resolve(arr)
                }
              }
            })
          })
        })
      }
    })
  })
}

export function getSubDir(fp: string, fullpath = true) {
  const arr: Array<string> = []
  if (!existsSync(fp)) {
    return arr
  }
  const stat = statSync(fp)
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    try {
      const files = readdirSync(fp)
      files.forEach(function (item: string) {
        const fPath = path.join(fp, item)
        if (existsSync(fPath)) {
          const stat = statSync(fPath)
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            arr.push(fullpath ? fPath : item)
          }
        }
      })
    } catch (e) {
      console.log(e)
    }
  }
  return arr
}

export function chmod(fp: string, mode: string) {
  if (statSync(fp).isFile()) {
    chmodSync(fp, mode)
    return
  }
  const files = readdirSync(fp)
  files.forEach(function (item: string) {
    const fPath = path.join(fp, item)
    chmodSync(fPath, mode)
    const stat = statSync(fPath)
    if (stat.isDirectory() === true) {
      chmod(fPath, mode)
    }
  })
}

export function writeFileAsync(fp: string, content: string) {
  return new Promise((resolve, reject) => {
    writeFile(fp, content, (err: Error) => {
      if (err) {
        reject(err)
      } else {
        resolve(true)
      }
    })
  })
}

export function readFileAsync(fp: string, encode = 'utf-8') {
  return new Promise<string>((resolve, reject) => {
    if (!existsSync(fp)) {
      reject(new Error(`File does not exist: ${fp}`))
    }
    readFile(fp, encode, (err: Error, data: string) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export function zipUnPack(fp: string, dist: string) {
  console.log('zipUnPack start: ', fp, dist, global.Server.Static!)
  return new Promise(async (resolve, reject) => {
    const info = {
      fp,
      dist,
      static: global.Server.Static,
      isIncludes: fp.includes(global.Server.Static!)
    }
    appendFileSync(
      path.join(global.Server.BaseDir!, 'debug.log'),
      `[zipUnPack][info]: ${JSON.stringify(info, undefined, 4)}\n`
    )
    if (fp.includes(global.Server.Static!)) {
      const cacheFP = path.join(global.Server.Cache!, path.basename(fp))
      if (!existsSync(cacheFP)) {
        try {
          copyFileSync(fp, cacheFP)
        } catch (e) {
          appendFileSync(
            path.join(global.Server.BaseDir!, 'debug.log'),
            `[zipUnPack][copyFileSync][error]: ${e}\n`
          )
        }
      }
      fp = cacheFP
      console.log('cacheFP: ', fp)
    }
    compressing.unpack(fp, dist, async (err: any, res: any) => {
      console.log('zipUnPack end: ', err, res)
      if (err) {
        appendFileSync(
          path.join(global.Server.BaseDir!, 'debug.log'),
          `[zipUnPack][unpack][error]: ${err}\n`
        )
        reject(err)
        return
      }
      resolve(true)
    })
  })
}

// Read a file and calculate MD5 and SHA256 checksums
export function getFileHashes(filePath: string, algorithm: 'sha1' | 'sha256' | 'md5' = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm)
    const stream = createReadStream(filePath)

    stream.on('error', (err: any) => {
      reject(err)
    })

    stream.on('data', (chunk: any) => {
      hash.update(chunk)
    })

    stream.on('end', () => {
      const md5 = hash.digest('hex')
      resolve(md5)
    })
  })
}
