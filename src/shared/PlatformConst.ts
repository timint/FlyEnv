import path from 'node:path'

export const HostsFileMacOS = '/private/etc/hosts'
export const HostsFileWindows = path.join(process.env.WINDIR, '/System32/drivers/etc/hosts')
export const HostsFileLinux = '/etc/hosts'
