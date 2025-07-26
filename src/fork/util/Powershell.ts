import { spawn, SpawnOptions } from 'child_process'

export default class powershell {
  static readonly defaultOptions = {
    profile: false,
    executionPolicy: 'Bypass',
    noProfile: true,
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8', // for stdout/stderr
    shell: false, // uses OS shell: 'cmd.exe' on Windows, '/bin/sh' on Linux/macOS
    timeout: 0, // no timeout
    maxBuffer: 1024 * 1024, // 1MB
    killSignal: 'SIGTERM',
    windowsHide: true
  }

  static async #call(args: string[], options: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      options = {
        ...this.defaultOptions,
        ...options
      }

      const powershellArgs = [
        options.noProfile ? '-NoProfile' : '',
        options.executionPolicy ? '-ExecutionPolicy' : '',
        options.executionPolicy ? options.executionPolicy : '',
        options.profile ? '-Profile' : '',
        options.windowsHide ? '-WindowStyle' : '',
        options.windowsHide ? 'Hidden' : '',
        ...args
      ].filter(Boolean)

      const spawnOptions: SpawnOptions = {
        cwd: options.cwd || process.cwd(),
        env: options.env || process.env,
        shell: false, // Use args array approach - recommended and more reliable
        timeout: options.timeout || 0,
        killSignal: options.killSignal || 'SIGTERM',
        windowsHide: options.windowsHide || true,
        stdio: ['pipe', 'pipe', 'pipe'] // Use pipes for stdout/stderr
      }

      const command = `powershell.exe ${powershellArgs.join(' ')}`
      console.log('Executing PowerShell command:', command)
      const child = spawn('powershell.exe', powershellArgs, spawnOptions)

      let out = ''
      let err = ''

      child.stdout?.on('data', (d) => {
        out += d
      })

      child.stderr?.on('data', (d) => {
        err += d
      })

      child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err))))
      child.on('error', reject)
    })
  }

  /*
   * This function starts a process using PowerShell's Start-Process cmdlet and returns the process ID.
   * It allows passing arguments to the process and handles escaping of special characters.
   * Usage:
   *   powershell.execProcess('notepad.exe', ['file.txt']).then(pid => console.log(`Started process with PID: ${pid}`));
   */
  public static execProcess(file: string, args: string[] = [], options: any = {}): Promise<string> {
    if (args.length > 0) {
      const processedArgs = args.join(',')
      return this.#call(['-Command', `Start-Process ${file} -ArgumentList @(${processedArgs}) -PassThru | Select-Object -ExpandProperty Id`], options)
    } else {
      return this.#call(['-Command', `Start-Process ${file} -PassThru | Select-Object -ExpandProperty Id`], options)
    }
  }

  /*
   * Execute a Powershell command with proper escaping
   * This function executes a command in PowerShell and returns the output.
   * It uses proper PowerShell argument escaping for reliable command execution.
   * Usage:
   *   powershell.execCommand('Get-Process').then(output => console.log(output));
   *   powershell.execCommand('$env:NVM_HOME').then(output => console.log(output.trim()));
   */
  public static async execCommand(command: string, options: any = {}): Promise<string> {
    if (options.encoding) {
      // Set output encoding if specified
      command = `$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::${options.encoding}; ${command}`
    }
    return this.#call(['-Command', command], options)
  }

  /*
   * Execute a PowerShell script with proper escaping
   * This function executes a PowerShell script and returns the output.
   * It uses proper PowerShell argument escaping for reliable script execution.
   * Usage:
   *   powershell.execFile('path/to/script.ps1').then(output => console.log(output));
   *   powershell.execFile('path/to/script.ps1', ['arg1', 'arg2']).then(output => console.log(output));
   */
  public static async execFile(scriptPath: string, args: string[] = [], options: any = {}): Promise<string> {
    if (options.unblockFile) {
      const unblockCommand = `Unblock-File -Path ${scriptPath}`
      await this.execCommand(unblockCommand, options)
    }

    // Check if it's a PowerShell script (.ps1) or an executable
    if (scriptPath.endsWith('.ps1')) {
      return this.#call(['-File', scriptPath, ...args], options)
    } else {
      // For non-PowerShell files (executables), use -Command with & operator
      const processedArgs = args.join(' ')
      if (processedArgs) {
        return this.execCommand(`& ${scriptPath} ${processedArgs}`, options)
      } else {
        return this.execCommand(`& ${scriptPath}`, options)
      }
    }
  }

  public static escapeArg(arg: string): string {
    // First check if argument needs wrapping
    if (!arg.match(/[ "'\r\n]/)) return arg
    // Escape single quotes by doubling them, then wrap in single quotes
    return `'${arg.replace(/'/g, "''")}'`
  }

  public static escapePowershellArg(arg: string) {
    // First check if argument needs wrapping
    if (!arg.match(/[ "'\r\n]/)) return arg
    // Escape double quotes by backslash-escaping them, then wrap in double quotes
    return `"${arg.replace(/"/g, '\\"')}"`
  }
}
