import { useEffect, useRef, useState, type ReactNode } from 'react'
import { initial, reduce, botActions, viewFor, submitters, canNext, blank, pitch, type Action, type State } from './game.ts'
import { hostRoom, joinRoom, makeCode, type Host, type Client } from './net.ts'
import cards from './data/cards.json' with { type: 'json' }
import BOT_NAMES from './data/bots.json' with { type: 'json' }
import FUNDING from './data/funding-values.json' with { type: 'json' }

type Mode = { kind: 'home' } | { kind: 'host'; online: boolean; code: string } | { kind: 'join'; code: string }

export default function App() {
  const [mode, setMode] = useState<Mode>({ kind: 'home' })
  const [name, setName] = useState(() => localStorage.getItem('sah-name') ?? '')
  useEffect(() => localStorage.setItem('sah-name', name), [name])

  if (mode.kind === 'home') return <Home name={name} setName={setName} go={setMode} />
  if (mode.kind === 'host') return <HostGame key={mode.code} name={name} online={mode.online} code={mode.code} leave={() => setMode({ kind: 'home' })} />
  return <JoinGame key={mode.code} name={name} code={mode.code} leave={() => setMode({ kind: 'home' })} />
}

function Home({ name, setName, go }: { name: string; setName: (n: string) => void; go: (m: Mode) => void }) {
  const [code, setCode] = useState('')
  const [multi, setMulti] = useState(false)
  const ok = name.trim().length > 0
  return (
    <div className="app home">
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 className="hero-title"><span>Startups</span><span>Against</span><span>Humanity</span></h1>
        <a className="ghost-link" href="https://github.com/prowwwler/startups-against-humanity">GitHub</a>
      </header>

      <section className="hero">
        <Deal />
        <div className="stack menu">
          <p className="lede">Draw two cards. Pitch the worst startup. Worst pitch wins.</p>
          <input placeholder="Your name" value={name} maxLength={24} onChange={e => setName(e.target.value)} aria-label="Your name" />
          <hr className="rule" />
          <button className="primary" disabled={!ok} onClick={() => go({ kind: 'host', online: false, code: 'solo' })}>Play Alone</button>
          <button disabled={!ok} aria-expanded={multi} onClick={() => setMulti(m => !m)}>Multiplayer</button>
          {multi && (
            <div className="stack submenu">
              <button disabled={!ok} onClick={() => go({ kind: 'host', online: true, code: makeCode() })}>Host a game</button>
              <div className="row">
                <input className="code" placeholder="CODE" maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase())} aria-label="Room code" />
                <button disabled={!ok || code.length !== 4} onClick={() => go({ kind: 'join', code })}>Join</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="muted">
        {cards.what.length} black cards, {cards.whom.length} white. Three to ten players. Free, open source, no accounts.{' '}
        <a className="ghost-link" href="https://github.com/prowwwler/startups-against-humanity/issues/new?template=new-cards.md">Pitch a card.</a>
      </footer>
    </div>
  )
}

function randomPair(prev?: { what: string; whom: string }) {
  let what = prev?.what
  while (what === prev?.what) what = cards.what[Math.floor(Math.random() * cards.what.length)]
  return { what: what!, whom: cards.whom[Math.floor(Math.random() * cards.whom.length)] }
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Typed({ text, cps = 45 }: { text: string; cps?: number }) {
  const [n, setN] = useState(() => (reduceMotion() ? text.length : 0))
  useEffect(() => {
    const id = setInterval(() => setN(k => (k >= text.length ? (clearInterval(id), k) : k + 1)), 1000 / cps)
    return () => clearInterval(id)
  }, [text, cps])
  return <>{text.slice(0, n)}</>
}

/** Self-dealing hero: a fresh pitch every few seconds. */
function Deal() {
  const [pair, setPair] = useState(randomPair)
  useEffect(() => {
    const id = setInterval(() => setPair(p => randomPair(p)), 6000)
    return () => clearInterval(id)
  }, [])
  const line = pitch(pair.what, pair.whom)
  return (
    <div className="deal" aria-live="off">
      <div className="deal-cards" key={pair.what + pair.whom}>
        <Card black big text={blank(pair.what)} term={pair.what} />
        <Card white big text={pair.whom} />
      </div>
      <p className="deal-line"><Typed key={line} text={line} /><span className="caret" aria-hidden /></p>
    </div>
  )
}

/** Add one bot with a name not already at the table. */
function withBot(s: State): State {
  const used = new Set(s.players.map(p => p.name))
  const free = BOT_NAMES.filter(b => !used.has(b))
  const n = free[Math.floor(Math.random() * free.length)] ?? `Bot ${s.players.length}`
  return reduce(s, { type: 'join', id: `bot-${s.players.length}-${Date.now()}`, name: n, bot: true })
}

function HostGame({ name, online, code, leave }: { name: string; online: boolean; code: string; leave: () => void }) {
  const me = 'host'
  const [state, setState] = useState<State>(() => {
    const joined = reduce(initial(), { type: 'join', id: me, name })
    // Solo: skip the lobby, deal in two bots and start.
    return online ? joined : reduce(withBot(withBot(joined)), { type: 'start' })
  })
  const [status, setStatus] = useState(online ? 'connecting…' : '')
  const host = useRef<Host>(null)

  const dispatch = (a: Action) => setState(s => reduce(s, a))

  useEffect(() => {
    if (!online) return
    host.current = hostRoom(
      code,
      (id, a) => dispatch({ ...a, id } as Action),
      () => setStatus(''),
      e => setStatus(`Error: ${e.message}`),
    )
    return () => host.current?.close()
  }, [online, code])

  // Broadcast per-viewer state after every change.
  useEffect(() => {
    for (const p of state.players) if (p.id !== me && !p.bot) host.current?.send(p.id, viewFor(state, p.id))
  }, [state])

  // Bot ticks.
  useEffect(() => {
    const acts = botActions(state)
    if (!acts.length) return
    const t = setTimeout(() => dispatch(acts[Math.floor(Math.random() * acts.length)]), 900 + Math.random() * 1200)
    return () => clearTimeout(t)
  }, [state])

  const addBot = () => setState(withBot)

  return (
    <Table
      state={state} me={me} dispatch={dispatch} leave={leave} status={status}
      lobby={
        <div className="stack">
          {online && <>
            <div className="muted">Room code</div>
            <div className="code-big">{code}</div>
          </>}
          <div className="row">
            <button onClick={addBot} disabled={state.players.length >= 10}>+ Add bot</button>
            <button className="primary" disabled={state.players.length < 3} onClick={() => dispatch({ type: 'start' })}>
              Start {state.players.length < 3 && '(need 3)'}
            </button>
          </div>
        </div>
      }
    />
  )
}

function JoinGame({ name, code, leave }: { name: string; code: string; leave: () => void }) {
  const [state, setState] = useState<State | null>(null)
  const [me, setMe] = useState('')
  const [status, setStatus] = useState('connecting…')
  const client = useRef<Client>(null)

  useEffect(() => {
    client.current = joinRoom(
      code,
      setState,
      id => { setMe(id); setStatus(''); client.current?.dispatch({ type: 'join', id, name }) },
      e => setStatus(`Error: ${e.message}`),
    )
    return () => client.current?.close()
  }, [code, name])

  if (!state) return (
    <div className="app">
      <h1 className="title">Joining {code}</h1>
      <p className={status.startsWith('Error') ? 'err' : 'muted'}>{status}</p>
      <button onClick={leave}>Back</button>
    </div>
  )
  return (
    <Table
      state={state} me={me} status={status} leave={leave}
      dispatch={a => client.current?.dispatch(a)}
      lobby={<p className="muted">Waiting for host to start…</p>}
    />
  )
}

function Table({ state: s, me, dispatch, leave, lobby, status }: {
  state: State; me: string; dispatch: (a: Action) => void; leave: () => void; lobby: ReactNode; status: string
}) {
  const czar = s.players[s.czar]
  const isCzar = czar?.id === me
  const hand = s.hands[me] ?? []
  const mine = s.submissions[me]
  const subs = submitters(s)
  const submitted = Object.keys(s.submissions).length

  return (
    <div className="app">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="title" style={{ fontSize: 24, opacity: .5 }}>Startups Against Humanity</h1>
        <button onClick={leave}>Leave</button>
      </div>
      {status && <p className={status.startsWith('Error') ? 'err' : 'muted'}>{status}</p>}

      {s.phase === 'lobby' && <div className="section">{lobby}</div>}

      {s.phase !== 'lobby' && (
        <div className="pitch">
          <Card black big text={blank(s.what)} term={s.what} />
          {s.phase === 'submit' && mine && <Card white big text={mine} pickable={false} />}
        </div>
      )}

      {s.phase === 'submit' && (
        <>
          <div className="status">
            {isCzar ? <>You're the Czar. Waiting for pitches… {submitted}/{subs.length}</>
              : mine ? <>Pitched. Waiting on others… {submitted}/{subs.length}</>
              : <>Fill the blank. Worst startup wins.</>}
          </div>
          {!isCzar && !mine && (
            <div className="hand">
              {hand.map(c => <Card key={c} white text={c} pickable onClick={() => dispatch({ type: 'submit', id: me, card: c })} />)}
            </div>
          )}
        </>
      )}

      {(s.phase === 'judge' || s.phase === 'reveal' || s.phase === 'over') && (
        <>
          <div className="status">
            {s.phase === 'judge'
              ? isCzar ? <>Pick the worst startup.</> : <>{czar?.name} is judging…</>
              : s.winner && <>{s.players.find(p => p.id === s.winner)?.name} wins the round.</>}
          </div>
          {s.winner && <p className="quote">“{pitch(s.what, s.submissions[s.winner])}”</p>}
          <div className={s.winner ? 'hand reveal' : 'hand'}>
            {s.order.map(id => (
              <Card
                key={id} white
                text={s.submissions[id]}
                pickable={s.phase === 'judge' && isCzar}
                winner={s.winner === id}
                onClick={() => dispatch({ type: 'pick', id: me, card: s.submissions[id] })}
              />
            ))}
          </div>
        </>
      )}

      {(s.phase === 'reveal' || s.phase === 'over') && s.winner && (
        <Winner state={s} me={me} dispatch={dispatch} />
      )}

      <ul className="score">
        {s.players.map((p, i) => (
          <li key={p.id} className={[i === s.czar && s.phase !== 'lobby' ? 'czar' : '', s.submissions[p.id] && s.phase === 'submit' ? 'done' : ''].join(' ')}>
            <b>{p.score}</b>{p.name}{p.id === me && ' (you)'}{p.bot && <span className="muted"> (bot)</span>}
          </li>
        ))}
      </ul>
      {s.phase !== 'lobby' && <p className="muted">First to {s.target}. Round {s.round}.</p>}
    </div>
  )
}

/** Stable per round so it survives re-renders without living in game state. */
function funding(s: State): string {
  const seed = [...(s.winner ?? ''), ...String(s.round)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1e9, 7)
  return FUNDING[seed % FUNDING.length]
}

function Winner({ state: s, me, dispatch }: { state: State; me: string; dispatch: (a: Action) => void }) {
  const czar = s.players[s.czar]
  const winner = s.players.find(p => p.id === s.winner)!
  const over = s.phase === 'over'
  const mayNext = over ? me === s.players[0]?.id : canNext(s, me)
  const waitingOn = over ? s.players[0]?.name : czar?.bot ? s.players[0]?.name : czar?.name
  const line = pitch(s.what, s.submissions[s.winner!])
  const raised = funding(s)
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={over ? 'Game over' : 'Round winner'}>
      <Confetti key={s.round} />
      <div className="overlay-body">
        <p className="status">{over ? `${top(s).name} built the worst startup.` : `${winner.name} wins the round.`}</p>
        <div className="deal-cards">
          <Card black big text={blank(s.what)} term={s.what} />
          <Card white big text={s.submissions[s.winner!]} />
        </div>
        <p className="quote">“{line}”</p>
        <p className="muted">Raised {raised}.</p>
        <div className="row">
          <Share text={shareText(line, raised)} />
          {mayNext
            ? <button className="primary" autoFocus onClick={() => dispatch(over ? { type: 'start' } : { type: 'next', id: me })}>{over ? 'Play again' : 'Next round'}</button>
            : <p className="muted">Waiting for {waitingOn}…</p>}
        </div>
      </div>
    </div>
  )
}

const SITE = 'https://startups-against-humanity.vercel.app/'

function shareText(line: string, raised: string) {
  return [
    '💼 Revolutionary startup:',
    '',
    `“${line}”`,
    '',
    `Raised ${raised}. 💰`,
    '',
    'Pitch your own worst startup:',
    SITE,
  ].join('\n')
}

/** Native share sheet where it exists, clipboard everywhere else. */
function Share({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])
  const share = () => {
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard.writeText(text).then(() => setCopied(true), () => {})
  }
  return <button onClick={share}>{copied ? 'Copied' : 'Share'}</button>
}

function Confetti() {
  const [bits] = useState(() => reduceMotion() ? [] : Array.from({ length: 48 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    delay: `${(i % 12) * 0.12}s`,
    dur: `${2.2 + (i % 5) * 0.35}s`,
    size: `${6 + (i % 4) * 3}px`,
    shade: ['#fff', '#ddd', '#999', '#666'][i % 4],
    spin: `${(i % 2 ? 1 : -1) * (360 + (i % 3) * 180)}deg`,
  })))
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} style={{ left: b.left, animationDelay: b.delay, animationDuration: b.dur, width: b.size, height: `${parseInt(b.size) * 1.6}px`, background: b.shade, ['--spin' as string]: b.spin }} />
      ))}
    </div>
  )
}

function top(s: State) {
  return s.players.reduce((a, b) => (b.score > a.score ? b : a))
}

function Card({ text, term, black, white, big, pickable, winner, onClick }: {
  text: string; term?: string; black?: boolean; white?: boolean; big?: boolean; pickable?: boolean; winner?: boolean; onClick?: () => void
}) {
  const cls = ['card', black && 'black', white && 'white', big && 'big', pickable && 'pickable', winner && 'winner'].filter(Boolean).join(' ')
  const gloss = (cards.gloss as Record<string, string>)[term ?? text]
  return (
    <div className={cls} onClick={pickable ? onClick : undefined} role={pickable ? 'button' : undefined} tabIndex={pickable ? 0 : undefined}
      onKeyDown={pickable ? e => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}>
      <div>
        <div>{text}</div>
        {gloss && <div className="gloss">{gloss}</div>}
      </div>
      <div className="brand">Startups Against Humanity</div>
    </div>
  )
}
