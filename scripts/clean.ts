import { rm, access } from 'fs/promises'
import { join } from 'path'

async function cleanDist() {
  const distPath = join(process.cwd(), 'dist')

  try {
    // Check if directory exists
    await access(distPath)

    // Delete directory if it exists
    await rm(distPath, { recursive: true, force: true })
    console.log('Successfully deleted dist/ directory')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('dist/ directory does not exist')
    } else {
      console.error('Error deleting dist/ directory:', error)
    }
  }
}

cleanDist()
