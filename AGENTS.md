# AGENTS.md

Instructions for AI coding agents working in this repo. Humans: see README.md and CONTRIBUTING.md.

## What this is

Static single-page game. Vite + React 19 + TypeScript. No backend, no database, no auth, no env vars. Multiplayer is peer-to-peer via PeerJS; the host's browser is the server.

## Layout

- `src/data/` — static content. `cards.json` is the deck: `what` (black), `whom` (white), `strong` (bot judge bias). `bots.json` names the bots, `funding-values.json` the winner payouts.
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

Conventional Commits. `type(scope): summary`, imperative, under 50 chars. No Co-Authored-By or AI trailers. Scopes: `cards`, `game`, `net`, `ui`. Body only when the why isn't obvious. PR title same format. Fill `.github/PULL_REQUEST_TEMPLATE.md`.

## Deploy

Vercel, hobby team, linked to the GitHub repo. Push to `main` = production. PRs = preview URLs. No env vars. Never add anything that needs a paid plan.

## Commands

```sh
npm run dev
npm test
npm run build
npm run lint
```
