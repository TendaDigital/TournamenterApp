import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { mdiChevronDown, mdiChevronUp, mdiDatabase, mdiDotsVertical, mdiFileImage,
  mdiGithub, mdiPlayCircle, mdiPuzzle, mdiServer, mdiStopCircle, mdiWeb } from '@mdi/js'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import './dashboard.css'

const api = window.tournamenter
const EXTENSIONS = 'Extension Manager'
const serverTab = id => 'Server [' + id + ']'

function Icon({ path }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={path}/></svg>
}
function Menu({ label, children, disabled = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const close = e => { if (!ref.current?.contains(e.target)) ref.current?.removeAttribute('open') }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])
  return <details ref={ref} className="menu" onKeyDown={e => { if (e.key === 'Escape') ref.current.open = false }}>
    <summary aria-disabled={disabled} onClick={e => { if (disabled) e.preventDefault() }}>{label}</summary>
    <div className="popup" onClick={() => { ref.current.open = false }}>{children}</div>
  </details>
}
function Panel({ title, icon, children }) {
  const [open, setOpen] = useState(true)
  return <section className="panel"><button className="panel-heading" aria-expanded={open} onClick={() => setOpen(!open)}>
    <Icon path={icon}/>{title}<span className="spacer"/><Icon path={open ? mdiChevronUp : mdiChevronDown}/>
  </button>{open && children}</section>
}
function Logs({ lines }) {
  return <details className="logs"><summary><Icon path={mdiChevronDown}/> Logs ({lines.length})</summary>
    <pre>{lines.join('\n')}</pre></details>
}
function ExtensionManager({ model, run }) {
  const [spec, setSpec] = useState('')
  const execute = (action, name) => run(() => api.extensions(action, name))
  return <><div className="bar dark"><strong>Installed extensions: <small className="label">{model.extensions.length}</small></strong>
    {model.busy && <span>Executing command…</span>}</div><Logs lines={model.extensionLogs}/>
    <form className="install" onSubmit={e => { e.preventDefault(); execute('install', spec) }}>
      <label className="field">Enter npm package name or GitHub URL<input value={spec} onChange={e => setSpec(e.target.value)}/></label>
      <button className="raised primary" disabled={!spec.trim() || model.busy}>Install</button>
    </form>
    {model.extensions.map(ext => <article className="extension" key={ext.name}>
      <div><h3>{ext.name}</h3><p>{ext.description}</p>{ext.author && <small>by {ext.author}</small>}</div>
      <div className="extension-actions"><small className="version">v{ext.version}</small>
        {ext.fixed ? <small>Included with Tournamenter</small> : <div>
          <button className="raised primary" disabled={model.busy} onClick={() => execute('install', ext.name)}>Update</button>
          <button className="raised danger" disabled={model.busy} onClick={() => execute('uninstall', ext.name)}>Uninstall</button>
        </div>}</div></article>)}</>
}
function Server({ server, extensions, addresses, run }) {
  const { id, config, status } = server
  const [edit, setEdit] = useState(null)
  const [show, setShow] = useState(false)
  const data = edit ?? config
  const running = status === 'Running'
  const stopped = status === 'Stopped'
  const busy = !stopped && !running
  const dirty = edit && JSON.stringify(edit) !== JSON.stringify(config)
  const set = (key, value) => setEdit(prev => {
    const base = prev ?? config
    return { ...base, env: { ...base.env, [key]: value } }
  })
  const field = (name, key, type = 'text') => <label className="field">{name}
    <input type={type} disabled={!stopped} value={data.env[key] ?? ''} onChange={e => set(key, e.target.value)}/></label>
  const select = (kind, key) => run(async () => { const value = await api.select(kind); if (value) set(key, value) })
  return <><div className={'bar status ' + status.toLowerCase()}>
    <label><input type="checkbox" role="switch" aria-label="Start server" checked={!stopped} disabled={busy || Boolean(dirty)}
      onChange={() => run(() => stopped ? api.start(id) : api.stop(id))}/>{status} {dirty && <small>(Save before running)</small>}</label>
    <span className="spacer"/>
    <Menu label={<>Open App <Icon path={mdiWeb}/></>} disabled={!running}>
      {addresses.map(host => <button key={host} onClick={() => run(() => api.open(id, host))}>{host}:{config.env.PORT}</button>)}</Menu>
    <button disabled={!dirty || !stopped} onClick={() => run(async () => { await api.save(id, data); setEdit(null) })}>Save</button>
  </div><Logs lines={server.logs}/>
    <div className="settings">
      <div className="row"><div className="wide">{field('Server Name', 'APP_NAME')}</div>{field('PORT', 'PORT', 'number')}</div>
      <div className="row"><div className="wide">{field('Admin Password', 'PASSWORD', show ? 'text' : 'password')}</div>
        <label className="check"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)}/>Show password</label></div>
      <div className="row">{field('Application Logo Path', 'APP_LOGO')}<button disabled={!stopped} onClick={() => select('logo', 'APP_LOGO')}><Icon path={mdiFileImage}/> Select</button></div>
      <div className="row">{field('Database folder path', 'DB_FOLDER')}<button disabled={!stopped} onClick={() => select('database', 'DB_FOLDER')}><Icon path={mdiDatabase}/> Select</button></div>
      <h5>Use Extensions</h5>{extensions.map(ext => <label className="toggle" key={ext.name}>
        <input type="checkbox" role="switch" disabled={!stopped} checked={Boolean(data.extensions[ext.name])}
          onChange={e => setEdit({ ...data, extensions: { ...data.extensions, [ext.name]: e.target.checked } })}/>{ext.name}</label>)}
      <div className="right"><button className="raised danger" disabled={!stopped} onClick={() => run(() => api.remove(id))}>Delete Server</button></div>
    </div></>
}
function Dashboard() {
  const [model, setModel] = useState(null)
  const [error, setError] = useState('')
  const [tabs, setTabs] = useState([EXTENSIONS])
  const [active, setActive] = useState(EXTENSIONS)
  const modal = useRef(null)
  const idField = useRef(null)
  const request = useRef(0)
  const refresh = useCallback(async () => {
    const seq = ++request.current
    const data = await api.snapshot()
    if (seq === request.current) setModel(data)
  }, [])
  const run = async action => {
    try { setError(''); await action(); await refresh() }
    catch (err) { setError(String(err.message).replace(/^.*Error: /, '')) }
  }
  useEffect(() => {
    const update = () => refresh().catch(err => setError(err.message))
    const off = api.subscribe(update)
    update()
    return off
  }, [refresh])
  const open = name => { setTabs(prev => prev.includes(name) ? prev : [...prev, name]); setActive(name) }
  const visibleTabs = tabs.filter(name => name === EXTENSIONS || model?.servers.some(server => serverTab(server.id) === name))
  const selected = visibleTabs.includes(active) ? active : EXTENSIONS
  const all = async action => {
    const results = await Promise.allSettled(model.servers.map(server => api[action](server.id)))
    const messages = results.filter(x => x.status === 'rejected').map(x => x.reason.message)
    if (messages.length) throw new Error(messages.join('\n'))
  }
  return <>
    <header><div className="brand"><img alt="" src="assets/app-icon.svg"/>Tournamenter</div>
      <Menu label="Servers"><button onClick={() => modal.current.showModal()}>New Server</button>
        <hr/><button onClick={() => run(() => all('start'))}>Start all servers</button><button onClick={() => run(() => all('stop'))}>Stop all servers</button></Menu>
      <Menu label="Developer">{Object.entries({ tools: 'Open Developer Tools', data: 'Open AppData Folder', extensions: 'Open Extensions Folder', reload: 'Reload Window' })
        .map(([key, text]) => <button key={key} onClick={() => run(() => api.developer(key))}>{text}</button>)}</Menu>
      <span className="spacer"/><Menu label={<span aria-label="Menu"><Icon path={mdiDotsVertical}/></span>}><button onClick={() => run(() => api.project('releases'))}>Check for updates</button></Menu>
    </header>
    {error && <div className="alert" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError('')}>×</button></div>}
    {model && <main><div className="workspace"><nav aria-label="Open windows">{visibleTabs.map(name =>
      <button className={selected === name ? 'active' : ''} key={name} onClick={() => open(name)}>{name}</button>)}</nav>
      <section className="page" hidden={selected !== EXTENSIONS}><ExtensionManager model={model} run={run}/></section>
      {model.servers.filter(s => visibleTabs.includes(serverTab(s.id))).map(s =>
        <section className="page" key={s.id} hidden={selected !== serverTab(s.id)}>
          {s.error ? <div className="settings"><p role="alert">Could not read this server definition: {s.error}</p>
            <button onClick={() => run(() => api.developer('data'))}>Open AppData Folder</button></div> :
            <Server server={s} extensions={model.extensions} addresses={model.addresses} run={run}/>}</section>)}</div>
      <aside><Panel title="Extensions" icon={mdiPuzzle}><div className="side-row">Installed: <small className="label">{model.extensions.length}</small>
        <span className="spacer"/><button className="text-primary" onClick={() => open(EXTENSIONS)}>Configure</button></div>
        {model.extensions.map(ext => <div className="side-row" key={ext.name}><div><b>{ext.name}</b><p>{ext.description}</p></div>
          <small className="label">v{ext.version}</small></div>)}</Panel>
        <Panel title="Created Servers" icon={mdiServer}>{model.servers.map(s => <button className="server-link" key={s.id} onClick={() => open(serverTab(s.id))}>
          <b>{s.id}</b><span className="spacer"/><small className="label">{s.error ? 'Unavailable' : 'Port ' + s.config.env.PORT}</small>
          <span className={'indicator ' + s.status.toLowerCase()}><Icon path={s.status === 'Running' ? mdiPlayCircle : mdiStopCircle}/></span></button>)}</Panel>
      </aside></main>}
    <footer><span>Tournamenter Manager v{model?.version} | Tournamenter v{model?.coreVersion}</span><span className="spacer"/>
      Made with <i>♥</i> by nerds in <button aria-label="GitHub" onClick={() => run(() => api.project('repo'))}><Icon path={mdiGithub}/></button> - by
      <button onClick={() => run(() => api.project('author'))}>Ivan Seidel</button></footer>
    <dialog ref={modal}><form onSubmit={e => { e.preventDefault(); run(async () => {
      const id = await api.create(idField.current.value); modal.current.close(); idField.current.value = ''; open(serverTab(id))
    }) }}><label className="field">Create the server identifier: (ex: myserver)<input required ref={idField} aria-label="ID" autoFocus/></label>
      {error && <p role="alert">{error}</p>}<div className="right"><button type="button" onClick={() => modal.current.close()}>Cancel</button><button className="text-primary">Create</button></div></form></dialog>
  </>
}

createRoot(document.getElementById('root')).render(<Dashboard/>)
