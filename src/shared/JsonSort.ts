const copySymbolsToObj = (src: any, dest: any) => {
  const srcSymbols = Object.getOwnPropertySymbols(src)
  for (const srcSymbol of srcSymbols) {
    dest[srcSymbol] = src[srcSymbol]
  }
}

export const JSONSort = (obj: any, order: 'desc' | 'asc' = 'asc') => {

  if (Array.isArray(obj)) {
    const array: any[] = obj.map(function (value) {
      if (typeof value !== 'number' && typeof value !== 'function' && typeof value === 'object' && value !== null) {
        return JSONSort(value, order)
      } else {
        return value
      }
    })
    copySymbolsToObj(obj, array)
    return array
  }

  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj).sort((a, b) => {
      if (order === 'asc') return a.localeCompare(b)
      else return b.localeCompare(a)
    })
    const newObj: any = {}
    for (const key of keys) {
      if (typeof obj[key] !== 'number' && typeof obj[key] !== 'function' && typeof obj[key] === 'object' && obj[key] !== null) {
        newObj[key] = JSONSort(obj[key], order)
      } else {
        newObj[key] = obj[key]
      }
    }
    copySymbolsToObj(obj, newObj)
    return newObj
  }

  return obj
}
