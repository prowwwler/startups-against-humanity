import Peer, { type DataConnection } from 'peerjs'
import type { Action, State } from './game.ts'

// ponytail: PeerJS public signaling server. Free, no account. If it dies, self-host peerjs-server and pass { host } here.
const PREFIX = 'sah-v1-'

export function makeCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('')
}

export type Host = { send(id: string, view: State): void; close(): void }

export function hostRoom(
  code: string,
  onAction: (id: string, a: Action) => void,
  onOpen: () => void,
  onError: (e: Error) => void,
): Host {
  const peer = new Peer(PREFIX + code)
  const conns = new Map<string, DataConnection>()
  peer.on('open', onOpen)
  peer.on('error', onError)
  peer.on('connection', conn => {
    conns.set(conn.peer, conn)
    conn.on('data', d => onAction(conn.peer, d as Action))
    conn.on('close', () => {
      conns.delete(conn.peer)
      onAction(conn.peer, { type: 'leave', id: conn.peer })
    })
  })
  return {
    send: (id, view) => conns.get(id)?.send(view),
    close: () => peer.destroy(),
  }
}

export type Client = { id: string; dispatch(a: Action): void; close(): void }

export function joinRoom(
  code: string,
  onState: (s: State) => void,
  onOpen: (id: string) => void,
  onError: (e: Error) => void,
): Client {
  const peer = new Peer()
  let conn: DataConnection | undefined
  peer.on('error', onError)
  peer.on('open', id => {
    conn = peer.connect(PREFIX + code, { reliable: true })
    conn.on('open', () => onOpen(id))
    conn.on('data', d => onState(d as State))
    conn.on('close', () => onError(new Error('Host left')))
  })
  return {
    get id() { return peer.id },
    dispatch: a => conn?.send(a),
    close: () => peer.destroy(),
  }
}
