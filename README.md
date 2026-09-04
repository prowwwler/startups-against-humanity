# Startups Against Humanity

Draw two cards. Pitch the worst startup. Worst pitch wins.

> **Open finance** — for the homeless.

A Cards Against Humanity clone for people who have sat through too many pitch decks.
Static site, no backend, no accounts, no money. Runs on GitHub Pages / Vercel free tier.

## Play

- **Solo**: you vs bots. Bots are dumb on purpose.
- **Multiplayer**: one player hosts, shares a 4-letter code, others join. Peer-to-peer via WebRTC ([PeerJS](https://peerjs.com)). Host's browser is the server. Host closes tab, game dies.

### Rules

1. Each round one player is the **Czar**. The Czar flips a black **WHAT** card (`Open finance`).
2. Everyone else plays one white **FOR WHOM** card from their hand of 7 (`for the homeless`).
3. Czar reads every pitch, picks the worst one. That player scores a point.
4. Czar rotates. First to 5 wins. Minimum 3 players (bots count).

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # game engine tests (node:test, no framework)
npm run build    # static output in dist/
```

## Add cards

Edit [`src/cards.json`](src/cards.json). Two lists:

- `what` — black cards. A tech, business model, or "X, but" (`Uber, but`).
- `whom` — white cards. Noun phrase that follows "for" (`the homeless`, `pigeons`).
- `strong` — subset of `whom` the bot judge slightly prefers. Optional.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the tone rules before opening a PR. Cards that break them get closed without discussion.

## Inspiration

[Cards Against Humanity](https://www.cardsagainsthumanity.com) for the format. [sf-isms.org](https://sfisms.org) for the dialect.

## License

MIT.
