import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const npm = path.dirname(createRequire(import.meta.url).resolve('npm/package.json'))
const cli = path.join(npm, 'bin', 'npm-cli.js')
const [core = '../Tournamenter', obr = '../tournamenter-obr'] = process.argv.slice(2)
const stage = fs.mkdtempSync(path.join(root, '.runtime-build-'))
const destination = path.join(root, 'runtime-local')
function includePackage(name, source) {
  const cwd = path.resolve(source)
  const target = path.join(stage, name)
  const result = execFileSync(process.execPath, [cli, 'pack', '--ignore-scripts', '--pack-destination', stage, '--json'], { cwd, encoding: 'utf8' })
  const archive = path.join(stage, JSON.parse(result)[0].filename)
  fs.mkdirSync(target)
  execFileSync('tar', ['-xf', archive, '-C', target, '--strip-components', '1'])
  fs.unlinkSync(archive)
  fs.copyFileSync(path.join(cwd, 'package-lock.json'), path.join(target, 'package-lock.json'))
  if (name === 'core') {
    const client = path.join(target, 'client')
    // The desktop runtime only serves the exported web application.
    fs.rmSync(client, { recursive: true, force: true })
    fs.cpSync(path.join(cwd, 'client', 'out'), path.join(client, 'out'), { recursive: true })
  }
  execFileSync(process.execPath, [cli, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: target, stdio: 'inherit'
  })
}
try {
  includePackage('core', core)
  includePackage('obr', obr)
  fs.cpSync(npm, path.join(stage, 'npm'), { recursive: true, dereference: true })
  // Replace the last complete bundle only after both runtime installs succeed.
  const previous = path.join(stage, 'previous')
  if (fs.existsSync(destination)) fs.renameSync(destination, previous)
  try { fs.renameSync(stage, destination) }
  catch (err) { if (fs.existsSync(previous)) fs.renameSync(previous, destination); throw err }
  fs.rmSync(path.join(destination, 'previous'), { recursive: true, force: true })
} finally { fs.rmSync(stage, { recursive: true, force: true }) }
