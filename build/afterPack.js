import { join } from 'path'
import { execSync } from 'child_process'
import { rmSync } from 'fs'

/**
 * Handle the node-pty Python library issue for the App Store
 * @param pack
 * @returns {Promise<boolean>}
 */
export default async function after(pack) {
  const dir = join(pack.appOutDir, 'PhpWebStudy.app/Contents/Resources')
  const optdefault = { env: process.env, cwd: dir }
  if (!optdefault.env['PATH']) {
    optdefault.env['PATH'] = [
      '/opt',
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/opt/local/bin',
      '/opt/local/sbin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin'
    ].join(':')
  } else {
    optdefault.env['PATH'] = [
      '/opt',
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/opt/local/bin',
      '/opt/local/sbin',
      '/usr/local/bin',
      optdefault.env['PATH']
    ].join(':')
  }
  execSync('asar e app.asar app', optdefault)
  rmSync(join(dir, 'app.asar'), { force: true })
  execSync('asar pack app app.asar', optdefault)
  rmSync(join(dir, 'app'), { recursive: true, force: true })
  console.log('afterPack handle end !!!!!!')
  return true
}
