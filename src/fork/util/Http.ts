import axios from 'axios'
import http from 'http'
import https from 'https'
import { ForkPromise } from '@shared/ForkPromise'

/**
 * Makes an API request to the One-Env API with robust error handling and logging.
 * @param method HTTP method (GET, POST, etc)
 * @param url Url to request
 * @param data Request body data
 * @param options Additional Axios options
 * @returns ForkPromise resolving to the API response data or []
 */
export const httpRequest = async (method: string, url: string, data: any = {}, options: any = {}): Promise<any> => {
  return new ForkPromise(async (resolve, reject) => {
    try {
      console.log(`[httpRequest] ${method} ${url}`, data)
      const result = await axios({
        url: url,
        method,
        data,
        timeout: 30e3,
        httpAgent: new http.Agent({ keepAlive: false }),
        httpsAgent: new https.Agent({ keepAlive: false }),
        proxy: getProxyFromGlobal(),
        ...options
      })
      // If responseType is 'stream', return the full response so .pipe works
      if (options.responseType === 'stream') {
        resolve(result)
      } else {
        resolve(result.data)
      }
    } catch (err: any) {
      console.error(`[httpRequest] Error during ${method} ${url}:`, err?.message || err)
      reject(err)
    }
  })
}

/**
 * Makes an API request to the One-Env API with robust error handling and logging.
 * @param url Url to request
 * @param options Additional Axios options
 * @returns ForkPromise resolving to the API response data or []
 */
export function httpStreamDownload(url: string, options: any = {}, onProgress?: (percent: number) => void): ForkPromise {
  return new ForkPromise(async (resolve, reject) => {
    try {
      const response = await httpRequest('GET', url, undefined, {
        responseType: 'stream',
        ...options
      })
      const total = Number(response.headers['content-length']) || 0
      let loaded = 0
      if (onProgress && response.data && typeof response.data.on === 'function') {
        response.data.on('data', (chunk: Buffer) => {
          loaded += chunk.length
          if (total > 0) {
            const percent = Math.round((loaded * 100.0) / total)
            onProgress(percent)
          }
        })
      }
      resolve(response)
    } catch (err) {
      reject(err)
    }
  })
}

// Extract proxy settings from global.Server.Proxy
function getProxyFromGlobal(): any {
  try {
    const proxies = Object.values(global?.Server?.Proxy ?? {})
    const proxyUrl = proxies.find((s: string) => typeof s === 'string' && s.includes('://'))
    if (proxyUrl) {
      const u = new URL(proxyUrl)
      return {
        protocol: u.protocol.replace(':', ''),
        host: u.hostname,
        port: u.port ? Number(u.port) : undefined
      }
    }
  } catch (err) {
    console.warn('[getProxyFromGlobal] Invalid proxy config:', err)
  }
  return undefined
}
