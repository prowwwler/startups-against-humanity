# AGENTS.md

Instructions for AI coding agents working in this repo. Humans: see README.md and CONTRIBUTING.md.

## What this is

Static single-page game. Vite + React 19 + TypeScript. No backend, no database, no auth, no env vars. Multiplayer is peer-to-peer via PeerJS; the host's browser is the server.

## Layout

- `src/cards.json` — the deck. `what` (black), `whom` (white), `strong` (bot judge bias).
- `src/game.ts` — pure reducer. All rules live here. `reduce(state, action)`, `botActions(state)`, `viewFor(state, viewerId)`.
- `src/game.test.ts` — engine tests. `node:test`, no framework.
- `src/net.ts` — PeerJS host/join wrappers. Host applies actions through the reducer and pushes `viewFor` to each client.
- `src/App.tsx` — all UI. Home / HostGame / JoinGame / Table / Card.
- `src/index.css` — all styles. Cards look like CAH: black card white text, white card black text, Helvetica bold.

## Rules

- **Test first.** Change to `game.ts` = failing test in `game.test.ts` first, then code. Seam is the reducer's public interface. Do not test React components or PeerJS.
- **No backend.** Do not add servers, databases, auth, or paid APIs. The constraint is zero cost forever.
- **No new deps** unless a few lines cannot do it. Say why in the PR.
- **Card tone** is defined in CONTRIBUTING.md. Do not add cards that target race, religion, sexuality, gender identity, or nationality. Do not add slurs.
- **Keep it small.** One file per concern. No abstractions with one caller.
- **Verify before claiming done**: `npm test && npm run build`.

## Commits and PRs

Conventional Commits. `type(scope): summary`, imperative, under 50 chars. Scopes: `cards`, `game`, `net`, `ui`. Body only when the why isn't obvious. PR title same format. Fill `.github/PULL_REQUEST_TEMPLATE.md`.

## Commands

```sh
npm run dev
npm test
npm run build
npm run lint
```
