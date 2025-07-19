import path from 'path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve('src/render'),
      '@shared': path.resolve('src/shared'),
      '@lang': path.resolve('src/lang')
    }
  },
  test: {
    ...configDefaults,
    globals: true,
    environment: 'node',
    include: ['test/**/*.ts'],
    exclude: [...configDefaults.exclude],
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
})
