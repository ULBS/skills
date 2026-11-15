# ULBS Skills

Reusable Codex skills maintained by ULBS.

## Included skills

- `ulbs-brand` — applies the ULBS visual identity: colors, typography and logo rules.
- `ulbs-lecture-deck` — creates interactive HTML lecture decks with the ULBS look.

## Use

Clone this repository, then copy or symlink the needed skill folder into your Codex skills directory (for example, `~/.codex/skills/`). Codex loads a skill when its `SKILL.md` matches the request.

`ulbs-brand` has no runtime dependency. `ulbs-lecture-deck` needs Python 3.8+ to build decks. For browser tests, install Node.js 18+, then run `npm install` and `npx playwright install chromium` inside `ulbs-lecture-deck/`.

Both skills are released under the MIT License. ULBS logos remain subject to the applicable ULBS brand-use rules.
