# ULBS Skills

Reusable agent skills maintained by ULBS.

## Included skills

- `ulbs-brand` — applies the ULBS visual identity: colors, typography and logo rules.
- `ulbs-lecture-deck` — creates interactive HTML lecture decks with the ULBS look.
- `ijasitels-template` — converts a manuscript (PDF, Word, Markdown, LaTeX...) into a Word .docx in the official IJASITELS journal template, then validates it.

## Use

Clone this repository, then copy or symlink the needed skill folder into the skills directory of your agent harness. These skills use the standard `SKILL.md` layout and work with any harness that supports it; follow that harness's installation and discovery conventions.

`ulbs-brand` has no runtime dependency. `ijasitels-template` needs Python 3 with lxml, PyYAML, Pillow and pdfplumber, plus pandoc and LibreOffice. `ulbs-lecture-deck` needs Python 3.8+ to build decks. For browser tests, install Node.js 18+, then run `npm install` and `npx playwright install chromium` inside `ulbs-lecture-deck/`.

The skills are released under the MIT License. ULBS logos remain subject to the applicable ULBS brand-use rules.
