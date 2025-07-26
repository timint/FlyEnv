import { ForkPromise } from '@shared/ForkPromise'
import { httpRequest } from './Http'

/**
 * Makes an API request to the One-Env API with robust error handling and logging.
 * @param method HTTP method (GET, POST, etc)
 * @param path API endpoint path (relative)
 * @param data Request body data
 * @param options Additional Axios options
 * @returns ForkPromise resolving to the API response data or []
 */
export const apiRequest = async (method: string, path: string, data: any = {}, options: any = {}): Promise<any> => {
  // Ensure path starts with a slash
  if (path.startsWith('/')) {
    path = path.substring(1)
  }

  const url = `https://api.one-env.com/api/${path}`

  return new ForkPromise(async (resolve, reject) => {
    try {
      const response = await httpRequest(method, url, data, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(options.headers || {})
        },
        ...options
      })
      let result: any = []
      if (response) {
        const contentType = response.headers?.['content-type'] ?? ''
        // Try to parse JSON if needed
        if (typeof response.data === 'string' && contentType.includes('application/json')) {
          const parsed = JSON.parse(response.data)
          result = parsed?.data ?? parsed ?? []
        } else {
          result = response.data?.data ?? response.data ?? response ?? []
        }
      }
      console.log('[apiRequest] Response: ', result)
      resolve(result)
    } catch (err: any) {
      reject(err)
    }
  })
}
