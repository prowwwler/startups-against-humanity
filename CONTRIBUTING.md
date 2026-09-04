# Contributing

## Card tone

The calibration card is **"Open finance for the homeless."** A real thing paired with a real group, said flat. If your card needs a punchline to work, it is too long. If it is wacky instead of plausible, cut it.

The deck is **bleak satire**. The joke is always that a startup is exploiting someone. The victim is never the joke.

**Allowed**

- Vulnerable groups as the *exploited* party: the homeless, hospice patients, kids in foster care, people in medical debt. The startup is the villain.
- Powerful people and institutions as targets: landlords, VCs, the Pope, your landlord.
- Absurd and nonhuman: pigeons, God, the Roomba, one specific guy named Kevin.
- Dark: death, terminal illness, your dead grandmother. Bleak is the point.

**Not allowed**

- Race, religion, sexuality, gender identity, or nationality as the card. `for undocumented immigrants` was cut for this reason. It gets PR fights, it makes the victim the joke, and it's not funnier.
- Slurs. Any.
- Real private individuals. Public figures are fine.
- Sexual content involving minors, in any framing.

**Voice**: SF tech slang is fair game and encouraged. [sf-isms.org](https://sfisms.org) is the reference dialect. Deadpan beats wacky.

**Good card test**: read `[random WHAT] for [your card]` out loud. If the laugh is at the founder, keep it. If the laugh is at the person on the card, cut it.

## Where cards come from

SF tech culture, current. [sf-isms.org](https://sfisms.org) for the dialect, the SF Standard and the timeline for the news. Niche beats broad: "a vending machine run by Claude" beats "AI". No code needed to propose cards, open an issue with the **Pitch cards** template.

## Card format

- `what`: title case, no trailing punctuation. Must read as `[WHAT] for [WHOM]`. `Uber, but` style is fine.
- `whom`: lowercase noun phrase, no leading "for". `the homeless`, not `For The Homeless`.
- No duplicates. Check `node -e 'const c=require("./src/cards.json");console.log(new Set(c.whom).size===c.whom.length)'`.
- `strong` entries must exist in `whom`.
- `gloss`: if the card is slang or an inside reference, add a one-line meaning keyed by the exact card text. Deadpan, under 15 words. Skip it for cards that need no explanation.

## Code

- Node 24. `npm test` must pass. `npm run build` must pass.
- Game rules live in `src/game.ts` as a pure reducer. Add a test in `src/game.test.ts` **before** changing rules (red, then green).
- No backend. No new deps for things a few lines can do. If you're adding a dependency, say why in the PR.

## Commits and PRs

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(cards): add 12 fintech WHAT cards
fix(net): reconnect when host peer id collides
docs: clarify hand size in README
chore: bump vite
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`. Scopes: `cards`, `game`, `net`, `ui`.

PR title uses the same format. PR body says what and why, in two sentences if possible. Card PRs list the cards in the body so reviewers don't have to read the diff.
