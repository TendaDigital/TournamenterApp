const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { Profiles } = require('../desktop/profiles.cjs')
const { Extensions } = require('../desktop/extensions.cjs')
const { Servers } = require('../desktop/servers.cjs')

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tournamenter-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const profiles = new Profiles(root)
  const runtime = path.join(root, 'runtime')
  fs.mkdirSync(path.join(runtime, 'obr'), { recursive: true })
  fs.writeFileSync(path.join(runtime, 'obr', 'package.json'), JSON.stringify({ name: 'tournamenter-obr', version: '2' }))
  const extensions = new Extensions(root, runtime, () => {})
  return { profiles, runtime, extensions, root }
}

test('old profile keeps its data location, custom settings and enabled extensions', t => {
  const { profiles, root } = setup(t)
  const database = path.join(root, 'old.db')
  const data = { custom: true, env: { PORT: 12345, DB_FOLDER: database, PASSWORD: 'pw', CUSTOM: 'abc' },
    extensions: { existing: true } }
  fs.writeFileSync(path.join(profiles.directory, 'legacy.json'), JSON.stringify(data))
  const edit = profiles.get('legacy')
  assert.equal(edit.env.PASSWORD, 'pw')
  edit.env.APP_NAME = 'Renamed'
  profiles.save('legacy', edit)
  const saved = profiles.get('legacy')
  assert.deepEqual(saved.extensions, data.extensions)
  assert.equal(saved.env.DB_FOLDER, database)
  assert.equal(saved.env.CUSTOM, 'abc')
  assert.equal(saved.custom, true)
  fs.writeFileSync(database, 'keep')
  profiles.remove('legacy')
  assert.equal(fs.readFileSync(database, 'utf8'), 'keep')
})

test('new instances get unique ports, the bundled OBR and safe filenames', t => {
  const { profiles, extensions } = setup(t)
  const a = profiles.create('A')
  const b = profiles.create('b')
  assert.notEqual(profiles.get(a).env.PORT, profiles.get(b).env.PORT)
  assert.equal(extensions.paths(profiles.get(a).extensions).length, 1)
  assert.throws(() => profiles.create('a'), /already/)
  assert.throws(() => profiles.create('../outside'))
  assert.throws(() => profiles.create('con'))
  const edit = profiles.get(a)
  edit.env.PORT = 'not a port'
  assert.throws(() => profiles.save(a, edit))
  assert.equal(profiles.get(a).env.PORT, 3000)
})

test('server waits for its own health response and stops without restarting', async t => {
  const { runtime, profiles, extensions } = setup(t)
  profiles.create('a')
  profiles.create('b')
  const config = profiles.get('b')
  config.env.DB_FOLDER = profiles.get('a').env.DB_FOLDER
  profiles.save('b', config)
  let launch, child, ownResponse = false
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, json: async () => ({ instance: ownResponse ? launch.env.TOURNAMENTER_INSTANCE_TOKEN : 'other' })
  }))
  const servers = new Servers(profiles, extensions, runtime, (_entry, _args, options) => {
    launch = options
    child = new EventEmitter()
    child.postMessage = message => {
      assert.equal(message, 'shutdown')
      queueMicrotask(() => child.emit('exit', 0))
    }
    child.kill = () => assert.fail('Expected graceful shutdown')
    return child
  }, () => {})
  servers.start('a')
  assert.throws(() => servers.start('b'), /database/)
  assert.equal(servers.status('a'), 'Starting')
  assert.deepEqual(JSON.parse(launch.env.TOURNAMENTER_EXTENSIONS_JSON), [path.join(runtime, 'obr')])
  ownResponse = true
  await delay(300)
  assert.equal(servers.status('a'), 'Running')
  await servers.stopAll()
  assert.equal(servers.status('a'), 'Stopped')
})

test('an unreadable legacy definition keeps its original bytes and other servers remain available', t => {
  const { profiles } = setup(t)
  const file = path.join(profiles.directory, 'interrupted.json')
  fs.writeFileSync(file, '{"env":')
  assert.ok(profiles.inspect('interrupted').error)
  assert.equal(profiles.create('new'), 'new')
  assert.equal(fs.readFileSync(file, 'utf8'), '{"env":')
})
