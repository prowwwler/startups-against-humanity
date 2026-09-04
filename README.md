# Startups Against Humanity

Draw two cards. Pitch the worst startup. Worst pitch wins.

> **Open finance** for the homeless.

A Cards Against Humanity clone for people who have sat through too many pitch decks.
Static site, no backend, no accounts, no money. Runs on any static host for free.

**Play:** https://startups-against-humanity.vercel.app

## How to play

1. Each round one player is the **Czar**. The Czar flips a black card: `Open finance for ______` or a template like `Our TAM slide is just a photo of ______.`
2. Everyone else plays one white card from their hand of 7: `the homeless`, `Trudy the corgi`, `people asleep on BART`.
3. The Czar reads every pitch out loud and picks the worst one. That player scores a point.
4. The winning pitch goes up on screen. The Czar starts the next round. If the Czar is a bot, the host does, so in solo it is always you.
5. Czar rotates. First to 5 wins. Minimum 3 players, bots count.

### Solo

You vs bots. Bots play random cards and judge mostly at random, with a slight lean toward cards tagged `strong` in the deck. They are dumb on purpose. Add up to 9 of them. Bot names are drawn from a pool of 32 (Adam Neumann, Angel Investor (Dentist), Peter Thiel's Hot Tub, ...).

### Multiplayer

One player clicks **Host a game** and gets a 4-letter code. Everyone else types the code and joins. Works across devices and networks.

How it works, so you know the limits:

- The host's browser **is** the server. It holds the game state and runs the rules. Other players' browsers connect to it directly over WebRTC using [PeerJS](https://peerjs.com).
- PeerJS's free public signaling server is used only to introduce browsers to each other. No game data passes through it.
- Players only ever receive their own hand. Submissions are hidden until judging.
- **If the host closes the tab, the game ends.** There is no server to keep it alive.
- Around 5% of players sit behind networks that block WebRTC. They cannot join. There is no relay server, because relay servers cost money.
- No persistence. Refresh means you left.

## Develop

Node 24.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests, node:test, no framework
npm run lint     # oxlint
npm run build    # static output in dist/
```

### Layout

| File | What |
|---|---|
| `src/cards.json` | The deck. `what` (black), `whom` (white), `strong` (bot judge bias). |
| `src/game.ts` | Pure reducer. All rules. `reduce(state, action)`, `botActions(state)`, `viewFor(state, viewerId)`, `pitch(what, whom)`. |
| `src/game.test.ts` | Engine tests. Change a rule, add a failing test here first. |
| `src/net.ts` | PeerJS host and join wrappers. |
| `src/App.tsx` | All UI. Home, HostGame, JoinGame, Table, Card. |
| `src/index.css` | All styles. Black card, white text. White card, black text. Helvetica Bold. Nothing else. |

Solo and Host are the same code path. Solo is Host with networking off and bots in the lobby.

## Add cards

Edit [`src/cards.json`](src/cards.json). Three lists:

- `what`: black cards. A plain noun (`Open finance`) gets ` for ______` appended at render. A string containing `___` is a template and the blank is filled in place (`We got acquired by ___.`). One blank per card.
- `whom`: white cards. Lowercase noun phrase, no leading "for". `the homeless`, not `For The Homeless`.
- `strong`: subset of `whom` the bot judge slightly prefers. Optional.

No code needed to propose cards: [open an issue with the Pitch cards template](https://github.com/guilopeszw/startups-against-humanity/issues/new?template=new-cards.md).

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the tone rules before opening a PR. Cards that break them get closed without discussion.

## Deploy

Every push to `main` deploys to production on Vercel. Every PR gets a preview URL. CI runs tests, lint, and build on every push.

It is a static site, so any host works: run `npm run build` and serve `dist/`. No environment variables, no secrets, no server.

## Inspiration

[Cards Against Humanity](https://www.cardsagainsthumanity.com) for the format. [sf-isms.org](https://sfisms.org) for the dialect. The SF Standard for the news.

## License

MIT.
