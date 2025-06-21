import { exec } from 'child_process'

export const psCommand = async (script: string, options: { cwd?: string } = {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = exec('powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "${script.replace(/["\\]/g, \'\\$1\')}"', {
      shell: false,
      windowsHide: true,
      ...options
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
}

export const psRun = async (script: string, options: { cwd?: string } = {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = exec(`powershell -ExecutionPolicy Bypass -File "${script.replace(/["\\]/g, '\\$1')}"`, {
      shell: false,
      windowsHide: true,
      ...options
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
}

export const psStartProcess = async (filePath: string | undefined, options: { cwd?: string; sudo?: boolean } = {}): Promise<void> => {
  // Escape single quotes for PowerShell using backtick
  const escapedPath = `'${filePath.replace(/'/g, '`\'')}'`;
  const runAs = options.sudo ? '-Verb runAs' : '';
  const { sudo, ...execOptions } = options;

  return new Promise((resolve, reject) => {
    const child = exec(
      `powershell -ExecutionPolicy Bypass Start-Process -WindowStyle hidden ${runAs} -FilePath ${escapedPath}`,
      {
        shell: false,
        windowsHide: true,
        ...execOptions
      }
    )
    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`Process exited with code ${exitCode}`));
      } else {
        resolve();
      }
    });
    child.on('error', (error) => {
      reject(error);
    });
  });
};
