import * as _ from 'lodash-es'
import type { GroupPermissions, Permissions } from './chmod-calculator.types'

export { computeChmodOctalRepresentation, computeChmodSymbolicRepresentation }

function computeChmodOctalRepresentation({ permissions }: { permissions: Permissions }): string {
  const permissionValue = { read: 4, write: 2, execute: 1 }

  const getGroupPermissionValue = (permission: GroupPermissions) =>
    _.reduce(
      permission,
      (acc: number, isPermSet: boolean, key: string) => acc + (isPermSet ? _.get(permissionValue, key, 0) : 0),
      0
    )

  return [
    getGroupPermissionValue(permissions.owner),
    getGroupPermissionValue(permissions.group),
    getGroupPermissionValue(permissions.public)
  ].join('')
}

function computeChmodSymbolicRepresentation({ permissions }: { permissions: Permissions }): string {
  const permissionValue = { read: 'r', write: 'w', execute: 'x' }

  const getGroupPermissionValue = (permission: GroupPermissions) =>
    _.reduce(
      permission,
      (acc: string, isPermSet: boolean, key: string) => acc + (isPermSet ? _.get(permissionValue, key, '') : '-'),
      ''
    )

  return [
    getGroupPermissionValue(permissions.owner),
    getGroupPermissionValue(permissions.group),
    getGroupPermissionValue(permissions.public)
  ].join('')
}
