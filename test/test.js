import { exec } = from 'child-process'
import { promisify } = from 'node:util'

const execAsync = promisify(exec)

const dir = 'F:\\Temp\\path-set-utf8bom.ps1'
const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '${dir}'; & '${dir}'"`

exec(cmd,{ shell: true })
  .then((res) => {
    console.log('res: ', res.stdout, res.stderr)
  })
  .catch((e) => {
    console.log('e: ', e)
  })
