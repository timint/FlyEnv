import type { GroupPermissions, Permissions } from './chmod-calculator.types'

export { computeChmodOctalRepresentation, computeChmodSymbolicRepresentation }

function computeChmodOctalRepresentation({ permissions }: { permissions: Permissions }): string {
  const permissionValue = { read: 4, write: 2, execute: 1 }

  const getGroupPermissionValue = (permission: GroupPermissions) =>
    (['read', 'write', 'execute'] as const).reduce(
      (acc: number, key) => acc + (permission[key] ? permissionValue[key] : 0),
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
    (['read', 'write', 'execute'] as const).reduce(
      (acc: string, key) => acc + (permission[key] ? permissionValue[key] : '-'),
      ''
    )

  return [
    getGroupPermissionValue(permissions.owner),
    getGroupPermissionValue(permissions.group),
    getGroupPermissionValue(permissions.public)
  ].join('')
}
