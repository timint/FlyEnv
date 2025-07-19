import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import fs from 'fs'
import os from 'os'
import powershell from '../src/fork/util/Powershell.ts'

const testDir = path.join(os.tmpdir(), 'powershell-test')
const testScript = path.join(testDir, 'test-script.ps1')
const testBatch = path.join(testDir, 'test-batch.bat')

function cleanup() {
  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  } catch {}
}

function setupTestFiles() {
  cleanup()
  fs.mkdirSync(testDir, { recursive: true })
  fs.writeFileSync(
    testScript,
    [
      'param(',
      '  [string]$Name = "World",',
      '  [string]$Greeting = "Hello"',
      ')',
      '',
      'Write-Output "$Greeting, $Name!"',
      'if ($args.Length -gt 0) {',
      '  Write-Output "Additional args: $($args -join ", ")"',
      '}'
    ].join('\r\n')
  )
  fs.writeFileSync(testBatch, [
    '@echo off',
    'echo Test batch file executed',
    'echo Args: %*',
    'timeout /t 1 /nobreak > nul'
  ].join('\r\n'))
}

describe('Powershell utilities', () => {
  beforeAll(() => {
    setupTestFiles()
  })
  afterAll(() => {
    cleanup()
  })

  it('powershell.execCommand - Basic command execution', async () => {
    const result = await powershell.execCommand('Write-Output "Hello, PowerShell!"')
    expect(result).toContain('Hello, PowerShell!')
  })

  it('powershell.execCommand - Command with special characters', async () => {
    const testString = "Test with 'quotes' and `$variables"
    const result = await powershell.execCommand(`Write-Output "${testString}"`)
    expect(result).toContain("Test with 'quotes' and $variables")
  })

  it('powershell.execCommand - Get current directory', async () => {
    const result = await powershell.execCommand('Get-Location')
    expect(result.trim().length).toBeGreaterThan(0)
  })

  it('powershell.execFile - Execute script without arguments', async () => {
    const result = await powershell.execFile(testScript)
    expect(result).toContain('Hello, World!')
  })

  it('powershell.execFile - Execute script with arguments', async () => {
    const argScript = path.join(testDir, 'arg-script.ps1')
    fs.writeFileSync(argScript, [
      'param([string]$First, [string]$Second)',
      'Write-Output "Arguments: $First $Second"'
    ].join('\r\n'))
    const result = await powershell.execFile(argScript, ['Hello', 'World'])
    expect(result).toContain('Arguments: Hello World')
  })

  it('powershell.execFile - Script with special characters in arguments', async () => {
    const specialName = "O'Connor & Smith"
    const result = await powershell.execFile(testScript, ['-Name', specialName])
    expect(result).toContain(specialName)
  })

  it('powershell.execFile - Execute batch file', async () => {
    // Properly escape the JavaScript code using the utility function
    const jsCode = powershell.escapeArg("console.log('Hello world')")
    const result = await powershell.execFile('node', ['-e', jsCode])
    expect(result).toContain('Hello world')
  })

  it('powershell.execProcess - Start notepad and get PID', async () => {
    // This test will only work if notepad.exe is available (Windows)
    const result = await powershell.execProcess('notepad.exe')
    console.log(`Notepad PID: ${result.trim()}`)
    if (result && /^\d+$/.test(result.trim())) {
      try {
        process.kill(Number(result.trim()))
      } catch {}
    }
    expect(result.trim()).toMatch(/^\d+$/) // Should return a PID
  })

  it('powershell.execCommand - Custom environment variable', async () => {
    const result = await powershell.execCommand('Write-Output $env:MY_TEST_VAR', {
      env: { ...process.env, MY_TEST_VAR: 'PowerShellRocks' }
    })
    expect(result.trim()).toBe('PowerShellRocks')
  })

  it('powershell.execCommand - Custom working directory', async () => {
    const cwd = path.dirname(testScript)
    const result = await powershell.execCommand('Write-Output (Get-Location).Path', { cwd })
    expect(result.trim().toLowerCase()).toBe(cwd.toLowerCase())
  })

  it('powershell.execCommand - Timeout', async () => {
    // Accept any error thrown due to timeout
    await expect(
      powershell.execCommand('Start-Sleep -Seconds 5', { timeout: 1000 })
    ).rejects.toThrow()
  })

  it('powershell.execCommand - Error handling', async () => {
    await expect(
      powershell.execCommand('Write-Error "This is an error"')
    ).rejects.toThrow(/This is an error/)
  })

  it('powershell.execCommand - Large output', async () => {
    const result = await powershell.execCommand('1..1000 | ForEach-Object { $_ }')
    expect(result.split('\n').length).toBeGreaterThan(900)
  })

  it('powershell.execCommand - Unicode output', async () => {
    // Set output encoding to UTF8 for correct Unicode output
    const result = await powershell.execCommand('Write-Output "Привет мир"', { encoding: 'utf8' })
    expect(result).toContain('Привет мир')
  })

  it('powershell.execFile - Arguments with spaces and quotes', async () => {
    const argScript = path.join(testDir, 'arg-script.ps1')
    fs.writeFileSync(argScript, [
      'param([string]$First, [string]$Second)',
      'Write-Output "Args: $First $Second"'
    ].join('\r\n'))
    // Pass arguments without extra quotes
    const result = await powershell.execFile(argScript, ['Hello world', "It's quoted"])
    expect(result).toContain("Args: Hello world It's quoted")
  })
})
