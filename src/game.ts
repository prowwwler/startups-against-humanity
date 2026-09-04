import cards from './cards.json' with { type: 'json' }

export const HAND_SIZE = 7
export const DEFAULT_TARGET = 5

export type Player = { id: string; name: string; bot: boolean; score: number }
export type Phase = 'lobby' | 'submit' | 'judge' | 'reveal' | 'over'

export type State = {
  phase: Phase
  target: number
  players: Player[]
  czar: number
  what: string
  whatDeck: string[]
  whomDeck: string[]
  hands: Record<string, string[]>
  /** playerId -> whom card. Hidden from non-czar clients until reveal. */
  submissions: Record<string, string>
  /** Shuffled order of submitter ids, fixed once judging starts. */
  order: string[]
  winner?: string
  round: number
}

export type Action =
  | { type: 'join'; id: string; name: string; bot?: boolean }
  | { type: 'leave'; id: string }
  | { type: 'start'; target?: number }
  | { type: 'submit'; id: string; card: string }
  | { type: 'pick'; id: string; card: string }
  | { type: 'next'; id: string }

export function shuffle<T>(a: T[], rand = Math.random): T[] {
  const b = a.slice()
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export function initial(): State {
  return {
    phase: 'lobby',
    target: DEFAULT_TARGET,
    players: [],
    czar: 0,
    what: '',
    whatDeck: [],
    whomDeck: [],
    hands: {},
    submissions: {},
    order: [],
    round: 0,
  }
}

function draw(s: State, id: string) {
  const hand = s.hands[id] ?? []
  while (hand.length < HAND_SIZE) {
    if (s.whomDeck.length === 0) s.whomDeck = shuffle(cards.whom)
    hand.push(s.whomDeck.pop()!)
  }
  s.hands[id] = hand
}

function startRound(s: State): State {
  if (s.whatDeck.length === 0) s.whatDeck = shuffle(cards.what)
  s.what = s.whatDeck.pop()!
  s.submissions = {}
  s.order = []
  s.round++
  s.phase = 'submit'
  for (const p of s.players) draw(s, p.id)
  return s
}

export function submitters(s: State): Player[] {
  return s.players.filter((_, i) => i !== s.czar)
}

/** Czar advances the round. If the Czar is a bot, the host (first player) does. Solo = host. */
export function canNext(s: State, id: string): boolean {
  const czar = s.players[s.czar]
  return !!czar && (czar.id === id || (czar.bot && s.players[0]?.id === id))
}

export function reduce(prev: State, a: Action): State {
  const s: State = structuredClone(prev)
  switch (a.type) {
    case 'join': {
      if (s.players.some(p => p.id === a.id)) return prev
      s.players.push({ id: a.id, name: a.name.slice(0, 24) || 'anon', bot: !!a.bot, score: 0 })
      if (s.phase !== 'lobby') draw(s, a.id)
      return s
    }
    case 'leave': {
      const i = s.players.findIndex(p => p.id === a.id)
      if (i < 0) return prev
      s.players.splice(i, 1)
      delete s.hands[a.id]
      delete s.submissions[a.id]
      s.order = s.order.filter(id => id !== a.id)
      if (s.players.length < 3 && s.phase !== 'lobby') s.phase = 'over'
      else if (i < s.czar || s.czar >= s.players.length) s.czar = (s.czar - 1 + s.players.length) % s.players.length
      return s
    }
    case 'start': {
      if (s.players.length < 3) return prev
      s.target = a.target ?? s.target
      for (const p of s.players) p.score = 0
      s.czar = 0
      s.round = 0
      s.winner = undefined
      s.hands = {}
      return startRound(s)
    }
    case 'submit': {
      if (s.phase !== 'submit' || a.id === s.players[s.czar]?.id) return prev
      if (s.submissions[a.id]) return prev
      const hand = s.hands[a.id]
      const i = hand?.indexOf(a.card) ?? -1
      if (i < 0) return prev
      hand.splice(i, 1)
      s.submissions[a.id] = a.card
      if (Object.keys(s.submissions).length >= submitters(s).length) {
        s.phase = 'judge'
        s.order = shuffle(Object.keys(s.submissions))
      }
      return s
    }
    case 'pick': {
      if (s.phase !== 'judge' || a.id !== s.players[s.czar]?.id) return prev
      const winnerId = s.order.find(id => s.submissions[id] === a.card)
      if (!winnerId) return prev
      const w = s.players.find(p => p.id === winnerId)!
      w.score++
      s.winner = winnerId
      s.phase = w.score >= s.target ? 'over' : 'reveal'
      return s
    }
    case 'next': {
      if (s.phase !== 'reveal' || !canNext(s, a.id)) return prev
      s.czar = (s.czar + 1) % s.players.length
      s.winner = undefined
      return startRound(s)
    }
  }
}

/** Bot brain. Returns actions bots want to take right now. */
export function botActions(s: State, rand = Math.random): Action[] {
  const out: Action[] = []
  if (s.phase === 'submit') {
    for (const p of submitters(s)) {
      if (p.bot && !s.submissions[p.id]) {
        const hand = s.hands[p.id]
        out.push({ type: 'submit', id: p.id, card: hand[Math.floor(rand() * hand.length)] })
      }
    }
  } else if (s.phase === 'judge' && s.players[s.czar]?.bot) {
    const subs = s.order.map(id => s.submissions[id])
    const strong = subs.filter(c => (cards.strong as string[]).includes(c))
    // ponytail: bot judge = random with 60% bias to hand-tagged strong cards. Upgrade: per-card scores if it feels dumb.
    const pool = strong.length && rand() < 0.6 ? strong : subs
    out.push({ type: 'pick', id: s.players[s.czar].id, card: pool[Math.floor(rand() * pool.length)] })
  }
  return out
}

/** Strip other players' hands + hidden submissions for a given viewer. */
export function viewFor(s: State, viewerId: string): State {
  const hidden = s.phase === 'submit'
  return {
    ...s,
    hands: { [viewerId]: s.hands[viewerId] ?? [] },
    submissions: hidden
      ? Object.fromEntries(Object.keys(s.submissions).map(id => [id, id === viewerId ? s.submissions[id] : '']))
      : s.submissions,
  }
}

export const BLANK = '______'

/** Black card text with a visible blank. Plain WHAT cards get " for ___" appended. */
export function blank(what: string): string {
  return what.includes('___') ? what.replace('___', BLANK) : `${what} for ${BLANK}`
}

/** Full pitch. Empty whom keeps the blank. */
export function pitch(what: string, whom: string): string {
  return blank(what).replace(BLANK, whom || BLANK)
}
