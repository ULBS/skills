# ULBS Skills

Reusable Codex skills maintained by ULBS.

## Included skills

- `ulbs-brand` — applies the ULBS visual identity: colors, typography and logo rules.
- `ulbs-lecture-deck` — creates interactive HTML lecture decks with the ULBS look.

## Use

Clone this repository, then copy or symlink the needed skill folder into the skills directory of your agent harness. These skills use the standard `SKILL.md` layout and work with any harness that supports it; follow that harness's installation and discovery conventions.

`ulbs-brand` has no runtime dependency. `ulbs-lecture-deck` needs Python 3.8+ to build decks. For browser tests, install Node.js 18+, then run `npm install` and `npx playwright install chromium` inside `ulbs-lecture-deck/`.

Both skills are released under the MIT License. ULBS logos remain subject to the applicable ULBS brand-use rules.
