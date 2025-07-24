import { describe, it, expect } from 'vitest'
import { apiRequest } from '../src/fork/util/Api'

describe('apiRequest', () => {
  it('should perform a POST request and return data', async () => {
    // Use a public API endpoint for test
    const data = await apiRequest('POST', '/version/fetch', { app: 'php', os: 'win', arch: 'x86' })
    // Should fallback to [] or return some data
    expect(data).toBeDefined()
  })

  it('should perform a POST request and return data', async () => {
    // Use a public API endpoint for test
    const data = await apiRequest('POST', '/version/php_extension', { app: 'php', os: 'win', arch: 'x86' })
    // Should fallback to [] or return some data
    expect(data).toBeDefined()
  })

  it('should handle errors gracefully', async () => {
    await expect(apiRequest('GET', '/invalid')).rejects.toBeDefined()
  })
})
