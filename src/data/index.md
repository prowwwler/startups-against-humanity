# data

- `cards/what/*.json`: black cards, one file per subset. Title case, no trailing punctuation. A `___` marks the blank.
- `cards/whom/*.json`: white cards, one file per subset. Lowercase noun phrase, no leading "for".
- `cards/strong.json`: subset of `whom` the bot judge slightly prefers.
- `cards/gloss.json`: card text to a one-line meaning, shown dimmed under slang cards.
- `bots.json`: bot names for solo games and the + Add bot button. Max 12 characters.
- `funding-values.json`: payouts the winner overlay picks from.

Every card is 30 characters or fewer. Tone rules live in CONTRIBUTING.md.

Each file under `cards/what/` and `cards/whom/` is a subset players can turn on
and off on the Edit deck screen. The two `sf.json` files are off by default;
their jokes need local knowledge. Adding a subset means adding the file and a
line in `SETS` in `src/game.ts`.
