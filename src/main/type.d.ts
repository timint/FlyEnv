import type { IPty } from '@lydell/node-pty'

import { Server } from 'http'

export interface StaticHttpServe {
  server: Server
  port: number
  host: Array<string>
}
export interface PtyLast {
  command: string
  key: string
}

export interface PtyItem {
  pty: IPty
  data: string
  task: {
    command: string
    key: string
  }[]
  execFile?: string
}
