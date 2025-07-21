import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import fs from 'fs'
import os from 'os'
import { isWindows } from '../src/shared/utils'

// Import the cross-platform ServiceStart module
import * as ServiceStart from '../src/fork/util/ServiceStart'

describe('ServiceStart Module', () => {
  let tempDir: string
  let mockVersion: any
  let logMessages: any[]

  beforeAll(async () => {
    // Create temporary directory for tests
    tempDir = await mkdtemp(join(os.tmpdir(), 'flyenv-servicestart-test-'))

    // Set up global.Server for test environment
    globalThis.Server = {
      BaseDir: tempDir,
      AppDir: join(tempDir, 'app'),
      Cache: join(tempDir, 'server/cache'),
      Static: join(tempDir, 'static'),
      Arch: process.arch === 'x64' ? 'x86_64' : process.arch
    }

    // Create required directories
    fs.mkdirSync(globalThis.Server.AppDir, { recursive: true })
    fs.mkdirSync(globalThis.Server.Cache, { recursive: true })
    fs.mkdirSync(globalThis.Server.Static, { recursive: true })

    console.log(`ServiceStart tests running on: ${isWindows() ? 'Windows' : 'Unix-like'} platform`)
    console.log('Using cross-platform ServiceStart implementation with direct child_process.spawn')
  })

  afterAll(() => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  beforeEach(() => {
    // Reset log messages for each test
    logMessages = []

    // Create mock version object
    mockVersion = {
      typeFlag: 'test-service',
      version: '1.0.0',
      installed: true
    }
  })

  describe('serviceStartExec function', () => {
    it('should successfully start a service with basic parameters', async () => {
      const testBin = isWindows() ? 'cmd.exe' : '/bin/echo'
      const testArgs = isWindows() ? '/c echo test' : 'test'
      const baseDir = join(tempDir, 'test-service')
      const pidPath = join(baseDir, 'test.pid')

      // Create base directory
      fs.mkdirSync(baseDir, { recursive: true })

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: testArgs,
        execEnv: '',
        on: mockOn,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      const result = await ServiceStart.serviceStartExec(params)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeGreaterThan(0)

      // Check that log messages were generated
      expect(logMessages.length).toBeGreaterThan(0)

      // Verify success log message
      const successLog = logMessages.find(msg => msg['APP-Service-Start-Success'])
      expect(successLog).toBeDefined()
    }, 10e3)

    it('should handle environment variables correctly', async () => {
      const testBin = isWindows() ? 'cmd.exe' : '/bin/echo'
      const testArgs = isWindows() ? '/c echo %TEST_VAR%' : '$TEST_VAR'
      const baseDir = join(tempDir, 'test-env-service')
      const pidPath = join(baseDir, 'test-env.pid')

      // Create base directory
      fs.mkdirSync(baseDir, { recursive: true })

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: testArgs,
        execEnv: 'TEST_VAR=hello_world',
        on: mockOn,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      const result = await ServiceStart.serviceStartExec(params)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeGreaterThan(0)
    }, 10e3)

    it('should handle custom working directory', async () => {
      const testBin = isWindows() ? 'cmd.exe' : '/bin/pwd'
      const testArgs = isWindows() ? '/c cd' : ''
      const baseDir = join(tempDir, 'test-cwd-service')
      const customCwd = join(tempDir, 'custom-working-dir')
      const pidPath = join(baseDir, 'test-cwd.pid')

      // Create directories
      fs.mkdirSync(baseDir, { recursive: true })
      fs.mkdirSync(customCwd, { recursive: true })

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: testArgs,
        execEnv: '',
        on: mockOn,
        cwd: customCwd,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      const result = await ServiceStart.serviceStartExec(params)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeGreaterThan(0)
    }, 10e3)

    it('should handle invalid binary gracefully', async () => {
      const testBin = '/non/existent/binary'
      const baseDir = join(tempDir, 'test-invalid-service')
      const pidPath = join(baseDir, 'test-invalid.pid')

      // Create base directory
      fs.mkdirSync(baseDir, { recursive: true })

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: '',
        execEnv: '',
        on: mockOn,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      await expect(ServiceStart.serviceStartExec(params)).rejects.toThrow()
    }, 10e3)
  })

  describe('customServiceStartExec function', () => {
    it('should handle file-based command execution', async () => {
      const baseDir = join(tempDir, 'custom-service')
      const testScript = join(baseDir, isWindows() ? 'test-script.bat' : 'test-script.sh')

      // Create base directory
      fs.mkdirSync(baseDir, { recursive: true })

      // Create a simple test script
      const scriptContent = isWindows()
        ? '@echo off\necho "Custom service started"\n'
        : '#!/bin/bash\necho "Custom service started"\n'

      fs.writeFileSync(testScript, scriptContent)

      if (!isWindows()) {
        // Make script executable on Unix-like systems
        fs.chmodSync(testScript, 0o755)
      }

      const mockVersion = {
        id: 'test-custom',
        commandType: 'file',
        commandFile: testScript,
        pidPath: '',
        isSudo: false
      }

      const result = await ServiceStart.customServiceStartExec(mockVersion, false)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
    }, 15000)

    it('should handle command string execution', async () => {
      const mockVersion = {
        id: 'test-command',
        commandType: 'command',
        command: isWindows() ? 'echo "Test command"' : 'echo "Test command"',
        pidPath: '',
        isSudo: false
      }

      const result = await ServiceStart.customServiceStartExec(mockVersion, false)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeGreaterThan(0)
    }, 15000)

    it('should handle service mode correctly', async () => {
      const mockVersion = {
        id: 'test-service-mode',
        commandType: 'command',
        command: isWindows() ? 'timeout /t 1' : 'sleep 1',
        pidPath: join(tempDir, 'service.pid'),
        isSudo: false
      }

      // Create PID file directory
      fs.mkdirSync(join(tempDir), { recursive: true })

      const result = await ServiceStart.customServiceStartExec(mockVersion, true)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeGreaterThan(0)
    }, 15000)
  })

  describe('Platform-specific functionality', () => {
    it('should use correct file encoding detection on Windows', async () => {
      if (!isWindows()) {
        console.log('Skipping Windows-specific test on non-Windows platform')
        return
      }

      // Test the readFileAsUTF8 function if available
      if (ServiceStart.readFileAsUTF8) {
        const testFile = join(tempDir, 'encoding-test.txt')
        const testContent = 'Test content with special chars: áéíóú'

        fs.writeFileSync(testFile, testContent, 'utf8')

        const result = await ServiceStart.readFileAsUTF8(testFile)
        expect(result).toBe(testContent)
      }
    })

    it('should handle platform-specific argument parsing', async () => {
      const testBin = isWindows() ? 'cmd.exe' : '/bin/echo'
      const complexArgs = isWindows()
        ? '/c echo "arg with spaces" && echo second'
        : '"arg with spaces" "second arg"'

      const baseDir = join(tempDir, 'test-args-service')
      const pidPath = join(baseDir, 'test-args.pid')

      // Create base directory
      fs.mkdirSync(baseDir, { recursive: true })

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: complexArgs,
        execEnv: '',
        on: mockOn,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      const result = await ServiceStart.serviceStartExec(params)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeGreaterThan(0)
    }, 10e3)
  })

  describe('Error handling and edge cases', () => {
    it('should clean up existing PID files before starting', async () => {
      const testBin = isWindows() ? 'cmd.exe' : '/bin/echo'
      const baseDir = join(tempDir, 'test-cleanup-service')
      const pidPath = join(baseDir, 'cleanup-test.pid')

      // Create base directory and existing PID file
      fs.mkdirSync(baseDir, { recursive: true })
      fs.writeFileSync(pidPath, '12345')

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: isWindows() ? '/c echo test' : 'test',
        execEnv: '',
        on: mockOn,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      const result = await ServiceStart.serviceStartExec(params)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeGreaterThan(0)

      // Verify new PID was written
      expect(fs.existsSync(pidPath)).toBe(true)
      const newPid = fs.readFileSync(pidPath, 'utf8')
      expect(newPid).not.toBe('12345')
    }, 10e3)

    it('should handle missing base directory creation', async () => {
      const testBin = isWindows() ? 'cmd.exe' : '/bin/echo'
      const baseDir = join(tempDir, 'non-existent', 'deep', 'path')
      const pidPath = join(baseDir, 'test.pid')

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: isWindows() ? '/c echo test' : 'test',
        execEnv: '',
        on: mockOn,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      const result = await ServiceStart.serviceStartExec(params)

      expect(result).toBeDefined()
      expect(result['APP-Service-Start-PID']).toBeDefined()
      expect(fs.existsSync(baseDir)).toBe(true)
    }, 10e3)
  })

  describe('Logging and callbacks', () => {
    it('should generate appropriate log messages during execution', async () => {
      const testBin = isWindows() ? 'cmd.exe' : '/bin/echo'
      const baseDir = join(tempDir, 'test-logging-service')
      const pidPath = join(baseDir, 'test-logging.pid')

      // Create base directory
      fs.mkdirSync(baseDir, { recursive: true })

      const mockOn = (event: any) => {
        logMessages.push(event)
      }

      const params = {
        version: mockVersion,
        pidPath: pidPath,
        baseDir: baseDir,
        bin: testBin,
        execArgs: isWindows() ? '/c echo test' : 'test',
        execEnv: '',
        on: mockOn,
        maxTime: 5,
        timeToWait: 100,
        checkPidFile: false
      }

      await ServiceStart.serviceStartExec(params)

      // Verify expected log messages
      const startCommandLog = logMessages.find(msg => msg['APP-On-Log']?.level === 'info')
      expect(startCommandLog).toBeDefined()

      const successLog = logMessages.find(msg => msg['APP-Service-Start-Success'])
      expect(successLog).toBeDefined()
    }, 10e3)
  })
})
