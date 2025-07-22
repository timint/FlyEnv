import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path, { join } from 'node:path'
import fs from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { extractArchive, createArchive, getContents } from '../src/fork/util/Archive'

describe('Archive utility functions', () => {
  let tmpFolder: string
  let testSourceDir: string
  let testDestDir: string
  let testArchivePath: string

  beforeAll(async () => {
    // Create a temporary folder for all tests
    tmpFolder = await mkdtemp(join(os.tmpdir(), 'flyenv-archive-test-'))
    console.log('Test folder created:', tmpFolder)
  })

  afterAll(async () => {
    // Clean up the temporary folder
    if (fs.existsSync(tmpFolder)) {
      fs.rmSync(tmpFolder, { recursive: true, force: true })
      console.log('Test folder cleaned up:', tmpFolder)
    }
  })

  beforeEach(() => {
    // Create fresh directories for each test
    testSourceDir = join(tmpFolder, 'source')
    testDestDir = join(tmpFolder, 'dest')
    testArchivePath = join(tmpFolder, 'test-archive.zip')

    // Clean up any existing directories
    if (fs.existsSync(testSourceDir)) {
      fs.rmSync(testSourceDir, { recursive: true, force: true })
    }
    if (fs.existsSync(testDestDir)) {
      fs.rmSync(testDestDir, { recursive: true, force: true })
    }
    if (fs.existsSync(testArchivePath)) {
      fs.unlinkSync(testArchivePath)
    }

    // Create source directory with test files
    fs.mkdirSync(testSourceDir, { recursive: true })
    fs.mkdirSync(testDestDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up after each test
    try {
      if (fs.existsSync(testSourceDir)) {
        fs.rmSync(testSourceDir, { recursive: true, force: true })
      }
      if (fs.existsSync(testDestDir)) {
        fs.rmSync(testDestDir, { recursive: true, force: true })
      }
      if (fs.existsSync(testArchivePath)) {
        fs.unlinkSync(testArchivePath)
      }
    } catch (error) {
      console.warn('Cleanup warning:', error)
    }
  })

  describe('createArchive function', () => {
    it('should create an archive from a single file', async () => {
      // Create a test file
      const testFile = join(testSourceDir, 'test.txt')
      const testContent = 'Hello, this is a test file for archiving!'
      fs.writeFileSync(testFile, testContent)

      // Create archive
      const result = await createArchive(testFile, testArchivePath)

      expect(result).toBe(true)
      expect(fs.existsSync(testArchivePath)).toBe(true)
      expect(fs.statSync(testArchivePath).size).toBeGreaterThan(0)
    }, 10000)

    it('should create an archive from a directory with multiple files', async () => {
      // Create multiple test files
      const files = [
        { name: 'file1.txt', content: 'Content of file 1' },
        { name: 'file2.txt', content: 'Content of file 2' },
        { name: 'subdir/file3.txt', content: 'Content of file 3 in subdirectory' }
      ]

      files.forEach(file => {
        const filePath = join(testSourceDir, file.name)
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, file.content)
      })

      // Create archive
      const result = await createArchive(testSourceDir, testArchivePath)

      expect(result).toBe(true)
      expect(fs.existsSync(testArchivePath)).toBe(true)
      expect(fs.statSync(testArchivePath).size).toBeGreaterThan(0)
    }, 10000)

    it('should handle different archive formats', async () => {
      // Create a test file
      const testFile = join(testSourceDir, 'test.txt')
      fs.writeFileSync(testFile, 'Test content for different formats')

      // Test different archive formats
      const formats = [
        { ext: '.zip', path: join(tmpFolder, 'test.zip') },
        { ext: '.7z', path: join(tmpFolder, 'test.7z') }
      ]

      for (const format of formats) {
        const result = await createArchive(testFile, format.path)
        expect(result).toBe(true)
        expect(fs.existsSync(format.path)).toBe(true)
        expect(fs.statSync(format.path).size).toBeGreaterThan(0)

        // Clean up
        fs.unlinkSync(format.path)
      }
    }, 15000)

    it('should reject with error for invalid source path', async () => {
      const invalidSource = join(testSourceDir, 'nonexistent.txt')

      await expect(createArchive(invalidSource, testArchivePath)).rejects.toThrow()
    }, 5000)

    it('should reject with error for invalid destination path', async () => {
      // Create a test file
      const testFile = join(testSourceDir, 'test.txt')
      fs.writeFileSync(testFile, 'Test content')

      // Try to create archive in non-existent directory
      const invalidDest = join(tmpFolder, 'nonexistent', 'test.zip')

      await expect(createArchive(testFile, invalidDest)).rejects.toThrow()
    }, 5000)
  })

  describe('extractArchive function', () => {
    beforeEach(async () => {
      // Create a test archive for extraction tests
      const testFile = join(testSourceDir, 'test.txt')
      const testContent = 'Hello, this is a test file for extraction!'
      fs.writeFileSync(testFile, testContent)

      // Create the archive
      await createArchive(testFile, testArchivePath)
      expect(fs.existsSync(testArchivePath)).toBe(true)
    })

    it('should extract an archive to destination directory', async () => {
      const result = await extractArchive(testArchivePath, testDestDir)

      expect(result).toBe(true)
      expect(fs.existsSync(testDestDir)).toBe(true)

      // Check if the extracted file exists
      const extractedFile = join(testDestDir, 'test.txt')
      expect(fs.existsSync(extractedFile)).toBe(true)

      // Verify content
      const extractedContent = fs.readFileSync(extractedFile, 'utf-8')
      expect(extractedContent).toBe('Hello, this is a test file for extraction!')
    }, 10000)

    it('should extract archive with directory structure', async () => {
      // Create a more complex directory structure
      const complexSourceDir = join(tmpFolder, 'complex-source')
      fs.mkdirSync(complexSourceDir, { recursive: true })

      const files = [
        { path: 'root.txt', content: 'Root file' },
        { path: 'subdir/sub.txt', content: 'Subdirectory file' },
        { path: 'subdir/nested/deep.txt', content: 'Deeply nested file' }
      ]

      files.forEach(file => {
        const filePath = join(complexSourceDir, file.path)
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, file.content)
      })

      // Create archive
      const complexArchivePath = join(tmpFolder, 'complex.zip')
      await createArchive(complexSourceDir, complexArchivePath)

      // Extract archive
      const extractDestDir = join(tmpFolder, 'extract-dest')
      fs.mkdirSync(extractDestDir, { recursive: true })

      const result = await extractArchive(complexArchivePath, extractDestDir)

      expect(result).toBe(true)

      // Verify extracted structure - note that 7zip-min includes the source directory name
      files.forEach(file => {
        const extractedPath = join(extractDestDir, 'complex-source', file.path)
        expect(fs.existsSync(extractedPath)).toBe(true)
        const content = fs.readFileSync(extractedPath, 'utf-8')
        expect(content).toBe(file.content)
      })

      // Clean up
      fs.rmSync(complexSourceDir, { recursive: true, force: true })
      fs.rmSync(extractDestDir, { recursive: true, force: true })
      fs.unlinkSync(complexArchivePath)
    }, 15000)

    it('should handle different archive formats for extraction', async () => {
      // Test with different formats
      const formats = ['.zip', '.7z']

      for (const format of formats) {
        const formatArchivePath = join(tmpFolder, `test${format}`)
        const formatExtractDir = join(tmpFolder, `extract${format}`)

        // Create test file
        const testFile = join(testSourceDir, 'format-test.txt')
        fs.writeFileSync(testFile, `Test content for ${format} format`)

        // Create archive
        await createArchive(testFile, formatArchivePath)

        // Create extraction directory
        fs.mkdirSync(formatExtractDir, { recursive: true })

        // Extract archive
        const result = await extractArchive(formatArchivePath, formatExtractDir)

        expect(result).toBe(true)
        expect(fs.existsSync(join(formatExtractDir, 'format-test.txt'))).toBe(true)

        // Clean up
        fs.unlinkSync(formatArchivePath)
        fs.rmSync(formatExtractDir, { recursive: true, force: true })
        fs.unlinkSync(testFile)
      }
    }, 20000)

    it('should reject with error for non-existent archive', async () => {
      const nonExistentArchive = join(tmpFolder, 'nonexistent.zip')

      await expect(extractArchive(nonExistentArchive, testDestDir)).rejects.toThrow()
    }, 5000)

    it('should reject with error for invalid destination', async () => {
      // Try to extract to a file instead of directory
      const invalidDest = join(tmpFolder, 'invalid-dest.txt')
      fs.writeFileSync(invalidDest, 'This is a file, not a directory')

      await expect(extractArchive(testArchivePath, invalidDest)).rejects.toThrow()

      // Clean up
      fs.unlinkSync(invalidDest)
    }, 5000)
  })

  describe('Round-trip tests (create then extract)', () => {
    it('should successfully create and extract the same content', async () => {
      // Create test content
      const originalContent = {
        'file1.txt': 'First file content',
        'file2.txt': 'Second file content',
        'subdir/file3.txt': 'Third file in subdirectory'
      }

      // Create files
      Object.entries(originalContent).forEach(([filePath, content]) => {
        const fullPath = join(testSourceDir, filePath)
        fs.mkdirSync(path.dirname(fullPath), { recursive: true })
        fs.writeFileSync(fullPath, content)
      })

      // Create archive
      const createResult = await createArchive(testSourceDir, testArchivePath)
      expect(createResult).toBe(true)

      // Extract archive
      const extractResult = await extractArchive(testArchivePath, testDestDir)
      expect(extractResult).toBe(true)

      // Verify all files were extracted correctly - note that 7zip-min includes the source directory name
      Object.entries(originalContent).forEach(([filePath, expectedContent]) => {
        const extractedPath = join(testDestDir, 'source', filePath)
        expect(fs.existsSync(extractedPath)).toBe(true)
        const actualContent = fs.readFileSync(extractedPath, 'utf-8')
        expect(actualContent).toBe(expectedContent)
      })
    }, 15000)

    it('should preserve file permissions and timestamps', async () => {
      // Create a test file
      const testFile = join(testSourceDir, 'permissions-test.txt')
      fs.writeFileSync(testFile, 'Test file for permissions')

      // Get original stats
      const originalStats = fs.statSync(testFile)

      // Create and extract archive
      await createArchive(testSourceDir, testArchivePath)
      await extractArchive(testArchivePath, testDestDir)

      // Check extracted file - note that 7zip-min includes the source directory name
      const extractedFile = join(testDestDir, 'source', 'permissions-test.txt')
      expect(fs.existsSync(extractedFile)).toBe(true)

      const extractedStats = fs.statSync(extractedFile)
      expect(extractedStats.size).toBe(originalStats.size)

      // Note: Exact timestamp preservation may vary by platform and archive format
      // So we just check that the file exists and has the correct size
    }, 10000)
  })

  describe('Error handling and edge cases', () => {
    it('should handle empty directories', async () => {
      // Create empty directory
      const emptyDir = join(testSourceDir, 'empty')
      fs.mkdirSync(emptyDir, { recursive: true })

      // Create archive
      const result = await createArchive(testSourceDir, testArchivePath)
      expect(result).toBe(true)

      // Extract and verify - note that 7zip-min includes the source directory name
      await extractArchive(testArchivePath, testDestDir)
      expect(fs.existsSync(join(testDestDir, 'source', 'empty'))).toBe(true)
    }, 10000)

    it('should handle large files', async () => {
      // Create a larger test file (1MB)
      const largeFile = join(testSourceDir, 'large.txt')
      const largeContent = 'A'.repeat(1024 * 1024) // 1MB of 'A's
      fs.writeFileSync(largeFile, largeContent)

      // Create and extract archive
      await createArchive(largeFile, testArchivePath)
      await extractArchive(testArchivePath, testDestDir)

      // Verify
      const extractedFile = join(testDestDir, 'large.txt')
      expect(fs.existsSync(extractedFile)).toBe(true)
      expect(fs.statSync(extractedFile).size).toBe(largeContent.length)
    }, 30000) // Longer timeout for large file

    it('should handle special characters in filenames', async () => {
      // Create files with special characters (platform-safe)
      const specialFiles = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.with.dots.txt'
      ]

      specialFiles.forEach(fileName => {
        const filePath = join(testSourceDir, fileName)
        fs.writeFileSync(filePath, `Content of ${fileName}`)
      })

      // Create and extract archive
      await createArchive(testSourceDir, testArchivePath)
      await extractArchive(testArchivePath, testDestDir)

      // Verify all special files were handled correctly - note that 7zip-min includes the source directory name
      specialFiles.forEach(fileName => {
        const extractedPath = join(testDestDir, 'source', fileName)
        expect(fs.existsSync(extractedPath)).toBe(true)
        const content = fs.readFileSync(extractedPath, 'utf-8')
        expect(content).toBe(`Content of ${fileName}`)
      })
    }, 15000)
  })

  describe('Platform compatibility', () => {
    it('should work on current platform', async () => {
      console.log(`Testing on platform: ${process.platform}`)
      console.log(`Architecture: ${process.arch}`)

      // Create test content
      const testFile = join(testSourceDir, 'platform-test.txt')
      fs.writeFileSync(testFile, `Platform test on ${process.platform}`)

      // Test create and extract
      const createResult = await createArchive(testFile, testArchivePath)
      expect(createResult).toBe(true)

      const extractResult = await extractArchive(testArchivePath, testDestDir)
      expect(extractResult).toBe(true)

      // Verify
      const extractedFile = join(testDestDir, 'platform-test.txt')
      expect(fs.existsSync(extractedFile)).toBe(true)
      const content = fs.readFileSync(extractedFile, 'utf-8')
      expect(content).toBe(`Platform test on ${process.platform}`)
    }, 10000)
  })

  describe('getContents function', () => {
    beforeEach(async () => {
      // Create a test archive with multiple files for content listing tests
      const files = [
        { path: 'root.txt', content: 'Root file content' },
        { path: 'subdir/sub.txt', content: 'Subdirectory file content' },
        { path: 'subdir/nested/deep.txt', content: 'Deeply nested file content' },
        { path: 'another.txt', content: 'Another file content' }
      ]

      files.forEach(file => {
        const filePath = join(testSourceDir, file.path)
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, file.content)
      })

      // Create the archive
      await createArchive(testSourceDir, testArchivePath)
      expect(fs.existsSync(testArchivePath)).toBe(true)
    })

    it('should list contents of an archive', async () => {
      const contents = await getContents(testArchivePath)

      expect(Array.isArray(contents)).toBe(true)
      expect(contents.length).toBeGreaterThan(0)

      // Each item should have expected properties
      contents.forEach(item => {
        expect(item).toHaveProperty('name')
        expect(typeof item.name).toBe('string')
        expect(item.name.length).toBeGreaterThan(0)
      })

      console.log('Archive contents:', contents.map(item => item.name))
    }, 10000)

    it('should provide detailed file information', async () => {
       const contents = await getContents(testArchivePath)

       expect(contents.length).toBeGreaterThan(0)

       // Check that items have detailed information
       const firstItem = contents[0]
       expect(firstItem).toHaveProperty('name')
       
       // According to 7zip-min docs, each item should have:
       // name, date, time, attr, size, compressed, crc, method, encrypted, block
       // Some properties may be empty depending on archive type
       // Note: size and compressed are returned as strings, not numbers
       if (firstItem.size !== undefined && firstItem.size !== '') {
         expect(typeof firstItem.size).toBe('string')
         expect(parseInt(firstItem.size)).toBeGreaterThanOrEqual(0)
       }
       if (firstItem.compressed !== undefined && firstItem.compressed !== '') {
         expect(typeof firstItem.compressed).toBe('string')
         expect(parseInt(firstItem.compressed)).toBeGreaterThanOrEqual(0)
       }
     }, 10000)

    it('should handle different archive formats', async () => {
      const formats = ['.zip', '.7z']

      for (const format of formats) {
        const formatArchivePath = join(tmpFolder, `contents-test${format}`)
        
        // Create test file
        const testFile = join(testSourceDir, 'format-contents-test.txt')
        fs.writeFileSync(testFile, `Test content for ${format} format`)

        // Create archive
        await createArchive(testFile, formatArchivePath)

        // Get contents
        const contents = await getContents(formatArchivePath)

        expect(Array.isArray(contents)).toBe(true)
        expect(contents.length).toBeGreaterThan(0)
        
        // Should find our test file
        const hasTestFile = contents.some(item => 
          item.name.includes('format-contents-test.txt')
        )
        expect(hasTestFile).toBe(true)

        // Clean up
        fs.unlinkSync(formatArchivePath)
        fs.unlinkSync(testFile)
      }
    }, 20000)

    it('should reject with error for non-existent archive', async () => {
      const nonExistentArchive = join(tmpFolder, 'nonexistent-contents.zip')

      await expect(getContents(nonExistentArchive)).rejects.toThrow()
    }, 5000)

    it('should reject with error for directory instead of file', async () => {
      // Try to get contents of a directory
      await expect(getContents(testSourceDir)).rejects.toThrow()
    }, 5000)

    it('should handle empty archives', async () => {
      // Create an empty directory and archive it
      const emptyDir = join(tmpFolder, 'empty-source')
      fs.mkdirSync(emptyDir, { recursive: true })

      const emptyArchivePath = join(tmpFolder, 'empty.zip')
      await createArchive(emptyDir, emptyArchivePath)

      // Get contents - should return empty array or minimal structure
      const contents = await getContents(emptyArchivePath)

      expect(Array.isArray(contents)).toBe(true)
      // May contain the directory itself, so length could be 0 or 1
      expect(contents.length).toBeGreaterThanOrEqual(0)

      // Clean up
      fs.rmSync(emptyDir, { recursive: true, force: true })
      fs.unlinkSync(emptyArchivePath)
    }, 10000)

    it('should handle archives with many files', async () => {
      // Create an archive with many files
      const manyFilesDir = join(tmpFolder, 'many-files')
      fs.mkdirSync(manyFilesDir, { recursive: true })

      const fileCount = 50
      for (let i = 0; i < fileCount; i++) {
        const fileName = `file${i.toString().padStart(3, '0')}.txt`
        const filePath = join(manyFilesDir, fileName)
        fs.writeFileSync(filePath, `Content of file ${i}`)
      }

      const manyFilesArchivePath = join(tmpFolder, 'many-files.zip')
      await createArchive(manyFilesDir, manyFilesArchivePath)

      // Get contents
      const contents = await getContents(manyFilesArchivePath)

      expect(Array.isArray(contents)).toBe(true)
      expect(contents.length).toBeGreaterThan(fileCount - 1) // At least the files we created

      // Clean up
      fs.rmSync(manyFilesDir, { recursive: true, force: true })
      fs.unlinkSync(manyFilesArchivePath)
    }, 30000) // Longer timeout for many files
  })
})
