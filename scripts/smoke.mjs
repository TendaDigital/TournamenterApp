import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import { _electron as electron } from 'playwright-core'

const executable = process.argv[2] && path.resolve(process.argv[2])
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tournamenter-smoke-'))
const socket = net.createServer()
socket.listen(0, '127.0.0.1')
await once(socket, 'listening')
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))

let app, page
const args = ['--user-data-dir=' + profile]
if (!executable) args.push('.')
async function launch() {
  app = await electron.launch({ executablePath: executable || createRequire(import.meta.url)('electron'), args,
    cwd: path.resolve(import.meta.dirname, '..'), timeout: 45000 })
  page = await app.firstWindow()
  page.setDefaultTimeout(20000)
  await page.getByRole('button', { name: 'Configure' }).waitFor()
  assert.equal(fs.realpathSync(await app.evaluate(({ app }) => app.getPath('userData'))), fs.realpathSync(profile))
}
async function ready() {
  await page.getByRole('switch', { name: 'Start server' }).click()
  await page.locator('.status.running').waitFor({ timeout: 65000 })
}
const base = 'http://127.0.0.1:' + port
try {
  await launch()
  await page.getByText('Servers', { exact: true }).click()
  await page.getByRole('button', { name: 'New Server' }).click()
  await page.getByRole('textbox', { name: 'ID', exact: true }).fill('smoke')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.getByLabel('PORT', { exact: true }).fill(String(port))
  await page.getByLabel('Server Name').fill('Offline smoke')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await ready()
  const health = await (await fetch(base + '/health')).json()
  assert.equal(health.status, 'ok')
  const ui = await (await fetch(base + '/api/ui')).json()
  assert.equal(ui.appName, 'Offline smoke')
  assert.ok(ui.evaluateMethodsNames.includes('resgate2026nacional'), 'Bundled OBR sorter is registered')
  for (const url of ['/teams/manage', '/tournamenter-obr/']) {
    const response = await fetch(base + url)
    assert.ok(response.ok, url + ': ' + response.status)
    const html = await response.text()
    assert.match(html, /<html/i)
    const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => new URL(m[1], response.url))
    assert.ok(scripts.length, 'Missing JavaScript at ' + url)
    for (const asset of scripts) {
      assert.equal(asset.origin, base, 'Web application depends on an external script')
      assert.ok((await fetch(asset)).ok, 'Missing ' + asset.pathname)
    }
  }
  const created = await fetch(base + '/teams', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Persistence smoke' }) })
  assert.ok(created.ok)
  const team = await created.json()
  await app.close()
  app = undefined
  await launch()
  await page.getByRole('button', { name: /smoke Port/ }).click()
  assert.equal(await page.getByLabel('PORT', { exact: true }).inputValue(), String(port))
  await ready()
  const record = await (await fetch(base + '/teams/' + team.id)).json()
  assert.equal(record.name, 'Persistence smoke')
  await page.getByRole('switch', { name: 'Start server' }).click()
  await page.locator('.status.stopped').waitFor()
  console.log('Desktop smoke passed: created, configured, started, restarted and stopped with bundled OBR and persistent data.')
} catch (err) {
  if (page && !page.isClosed()) {
    console.error(await page.locator('body').innerText().catch(() => 'Dashboard unavailable'))
    const logs = await page.evaluate(() => window.tournamenter.snapshot()).then(m => m.servers.map(s => s.logs)).catch(() => [])
    console.error(logs)
  }
  throw err
} finally {
  await app?.close()
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 })
}
