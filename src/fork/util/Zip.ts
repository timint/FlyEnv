import { unpack } from '7zip-min'

export async function zipUnpack(src: string, dest: string): Promise<boolean> {
  console.log('[zipUnpack] start:', {
    source: src,
    destination: dest
  })

  // Perform unpack operation
  return new Promise((resolve, reject) => {
    unpack(src, dest, async err => {
      console.log('[zipUnpack] end:', err ? 'error' : 'success')
      if (err) return reject(err)
      resolve(true)
    })
  })
}
