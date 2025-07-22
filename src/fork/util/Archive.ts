import { unpack, pack, list } from '7zip-min'
import fs from 'node:fs'
import path from 'node:path'

/*
 * Used to compress files/directories into an archive.
 * Supported extensions: 7z, zip, tar, gzip, bzip2
 * Usage: createArchive('path/to/folder/or/fil', 'path/to/destination.ext')
 */
export async function createArchive(src: string, dest: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('[createArchive] Start:', {
        source: src,
        destination: dest
      })

      // Validate source exists
      if (!fs.existsSync(src)) {
        throw new Error(`Source path does not exist: ${src}`)
      }

      // Validate destination directory exists
      const destDir = path.dirname(dest)
      if (!fs.existsSync(destDir)) {
        throw new Error(`Destination directory does not exist: ${destDir}`)
      }

      await pack(src, dest)
      resolve(true)
    } catch (err) {
      console.log('[createArchive] Error:', err)
      reject(err)
    }
  })
}

/*
 * Used to extract archives to a destination.
 * Supported formats: 7z, bzip2, cab, gzip, lzma, tar, tar.gz, tar.bz2, zip, Z
 */
export async function extractArchive(src: string, dest: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('[extractArchive] Start:', {
        source: src,
        destination: dest
      })

      // Validate source archive exists
      if (!fs.existsSync(src)) {
        throw new Error(`Source archive does not exist: ${src}`)
      }

      // Validate destination is not a file
      if (fs.existsSync(dest) && fs.statSync(dest).isFile()) {
        throw new Error(`Destination must be a directory, not a file: ${dest}`)
      }

      // Create destination directory if it doesn't exist
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }

      await unpack(src, dest)
      resolve(true)
    } catch (err) {
      console.log('[extractArchive] Error:', err)
      reject(err)
    }
  })
}

/*
 * Used to get the contents of an archive without extracting it.
 * Returns an array with file information including name, date, time, attr, size, compressed size, etc.
 * Supported formats: 7z, lzma, cab, zip, gzip, bzip2, Z and tar
 */
export async function getContents(src: string): Promise<any[]> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('[getContents] Start:', {
        source: src
      })

      // Validate source archive exists
      if (!fs.existsSync(src)) {
        throw new Error(`Source archive does not exist: ${src}`)
      }

      // Validate source is a file
      if (!fs.statSync(src).isFile()) {
        throw new Error(`Source must be a file, not a directory: ${src}`)
      }

      const contents = await list(src)
      console.log('[getContents] Found', contents.length, 'items in archive')
      resolve(contents)
    } catch (err) {
      console.log('[getContents] Error:', err)
      reject(err)
    }
  })
}
