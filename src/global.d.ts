import 'pinia'
import Launcher from './main/Launcher'

export interface ServerType {
  BrewCellar?: string
  Password?: string
  Proxy?: { [key: string]: string }
  BrewHome?: string
  Static?: string
  Cache?: string
  RedisDir?: string
  MongoDBDir?: string
  FTPDir?: string
  PhpDir?: string
  NginxDir?: string
  MysqlDir?: string
  PostgreSqlDir?: string
  MariaDBDir?: string
  MemcachedDir?: string
  BaseDir?: string
  ApacheDir?: string
  Lang?: string
  Local?: string
  MacPorts?: string
  ForceStart?: boolean
  AppDir?: string
  Licenses?: string
  UserHome?: string
  LangCustomer?: any
}

declare global {
   
  var Server: ServerType
   
  var application: any
   
  var __static: string
   
  var launcher: Launcher
}
export {}
