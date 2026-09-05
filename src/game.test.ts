import { test } from 'node:test'
import cards from './data/cards.json' with { type: 'json' }
import assert from 'node:assert/strict'
import { initial, reduce, botActions, viewFor, pitch, HAND_SIZE, submitters, type State } from './game.ts'

function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

test('every player and bot holds five cards', () => {
  let s: State = initial()
  s = reduce(s, { type: 'join', id: 'me', name: 'me' })
  s = reduce(s, { type: 'join', id: 'b1', name: 'b1', bot: true })
  s = reduce(s, { type: 'join', id: 'b2', name: 'b2', bot: true })
  s = reduce(s, { type: 'start' })
  assert.equal(HAND_SIZE, 5)
  for (const p of s.players) assert.equal(s.hands[p.id].length, 5)
})

test('full solo game with bots ends at target', () => {
  const rand = seeded()
  let s: State = initial()
  s = reduce(s, { type: 'join', id: 'me', name: 'me' })
  s = reduce(s, { type: 'join', id: 'b1', name: 'b1', bot: true })
  s = reduce(s, { type: 'join', id: 'b2', name: 'b2', bot: true })
  s = reduce(s, { type: 'start', target: 2 })
  assert.equal(s.phase, 'submit')
  assert.equal(s.hands.me.length, HAND_SIZE)

  for (let guard = 0; guard < 200 && s.phase !== 'over'; guard++) {
    for (const a of botActions(s, rand)) s = reduce(s, a)
    if (s.phase === 'submit' && !s.submissions.me && s.players[s.czar].id !== 'me') {
      s = reduce(s, { type: 'submit', id: 'me', card: s.hands.me[0] })
    } else if (s.phase === 'judge' && s.players[s.czar].id === 'me') {
      s = reduce(s, { type: 'pick', id: 'me', card: s.submissions[s.order[0]] })
    } else if (s.phase === 'reveal') {
      s = reduce(s, { type: 'next', id: 'me' })
    }
  }
  assert.equal(s.phase, 'over')
  assert.ok(s.players.some(p => p.score >= 2))
})

test('czar cannot submit; non-czar cannot pick', () => {
  let s = initial()
  for (const id of ['a', 'b', 'c']) s = reduce(s, { type: 'join', id, name: id })
  s = reduce(s, { type: 'start' })
  const czar = s.players[s.czar].id
  const other = submitters(s)[0].id
  assert.equal(reduce(s, { type: 'submit', id: czar, card: s.hands[czar][0] }), s)
  const s2 = reduce(s, { type: 'submit', id: other, card: s.hands[other][0] })
  assert.notEqual(s2, s)
  assert.equal(reduce(s2, { type: 'pick', id: other, card: 'x' }), s2)
})

test('viewFor hides other hands and in-progress submissions', () => {
  let s = initial()
  for (const id of ['a', 'b', 'c']) s = reduce(s, { type: 'join', id, name: id })
  s = reduce(s, { type: 'start' })
  const [p, q] = submitters(s)
  s = reduce(s, { type: 'submit', id: p.id, card: s.hands[p.id][0] })
  const v = viewFor(s, q.id)
  assert.deepEqual(Object.keys(v.hands), [q.id])
  assert.equal(v.submissions[p.id], '')
})

test('leave mid-game drops to over when fewer than 3', () => {
  let s = initial()
  for (const id of ['a', 'b', 'c']) s = reduce(s, { type: 'join', id, name: id })
  s = reduce(s, { type: 'start' })
  s = reduce(s, { type: 'leave', id: 'b' })
  assert.equal(s.phase, 'over')
})

test('pitch fills blank or appends "for"', () => {
  assert.equal(pitch('Open finance', 'the homeless'), 'Open finance for the homeless')
  assert.equal(pitch('We pivoted from crypto to ___.', 'toddlers'), 'We pivoted from crypto to toddlers.')
  assert.equal(pitch('Open finance', ''), 'Open finance for ______')
})

test('names up to 24 chars survive join', () => {
  const s = reduce(initial(), { type: 'join', id: 'a', name: 'Guy Who Read Zero to One' })
  assert.equal(s.players[0].name, 'Guy Who Read Zero to One')
})

test('next: czar advances, host advances when czar is a bot, nobody else', () => {
  let s = initial()
  s = reduce(s, { type: 'join', id: 'host', name: 'host' })
  s = reduce(s, { type: 'join', id: 'bot', name: 'bot', bot: true })
  s = reduce(s, { type: 'join', id: 'c', name: 'c' })
  s = reduce(s, { type: 'start', target: 10 })
  const toReveal = (st: State) => {
    for (const p of submitters(st)) st = reduce(st, { type: 'submit', id: p.id, card: st.hands[p.id][0] })
    return reduce(st, { type: 'pick', id: st.players[st.czar].id, card: st.submissions[st.order[0]] })
  }
  // round 1: czar = host (human)
  s = toReveal(s)
  assert.equal(s.phase, 'reveal')
  assert.equal(reduce(s, { type: 'next', id: 'c' }), s)
  s = reduce(s, { type: 'next', id: 'host' })
  assert.equal(s.round, 2)
  // round 2: czar = bot → host may advance, c may not
  assert.equal(s.players[s.czar].id, 'bot')
  s = toReveal(s)
  assert.equal(reduce(s, { type: 'next', id: 'c' }), s)
  s = reduce(s, { type: 'next', id: 'host' })
  assert.equal(s.round, 3)
  // round 3: czar = c (human, not host) → only c
  assert.equal(s.players[s.czar].id, 'c')
  s = toReveal(s)
  assert.equal(reduce(s, { type: 'next', id: 'host' }), s)
  s = reduce(s, { type: 'next', id: 'c' })
  assert.equal(s.round, 4)
})

test('deck: gloss keys are real cards, strong cards exist, no dupes', () => {
  const dup = (a: string[]) => a.filter((x, i) => a.indexOf(x) !== i)
  assert.deepEqual(dup(cards.what), [])
  assert.deepEqual(dup(cards.whom), [])
  assert.deepEqual(cards.strong.filter(s => !cards.whom.includes(s)), [])
  const all = new Set([...cards.what, ...cards.whom])
  assert.deepEqual(Object.keys(cards.gloss).filter(k => !all.has(k)), [])
  assert.ok(Object.keys(cards.gloss).length > 50)
})
