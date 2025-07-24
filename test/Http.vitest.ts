
import { describe, it, expect } from 'vitest'
import { httpRequest, httpStreamDownload } from '../src/fork/util/Http'

describe('httpRequest', () => {
  it('should perform a GET request and return data', async () => {
    // Use a public API for test
    const response = await httpRequest('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    expect(response).toHaveProperty('id', 1)
  })

  it('should handle errors gracefully', async () => {
    await expect(httpRequest('GET', 'https://invalid.url')).rejects.toBeDefined()
  })
})

describe('httpStreamDownload', () => {
  it('should download a file and report progress', async () => {
    // Use a small public file for test
    let lastProgress = 0
    const response = await httpStreamDownload('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', {}, (percent) => {
      lastProgress = percent
    })
    expect(response).toBeDefined()
    expect(lastProgress).toBeGreaterThan(0)
  })
})
