---
name: ulbs-lecture-deck
description: Build an interactive HTML slide deck (a single generated HTML file, ULBS look, keyboard navigation, speaker notes, tooltips, simulators and calculators) for a lecture. Use when the user asks for a new lecture as "slide-uri HTML" or "prezentare interactiva", or wants to extend or fix an existing deck made this way. The frame, colours and interaction stay the same; only the content changes.
license: MIT
metadata:
  version: 1.0.0
  author: Cantemir Mihu <cantemir.mihu@ulbsibiu.ro>
  compatibility: Python 3.8+ for builds; Node.js 18+ and Playwright 1.55.0 for automated browser tests.
---

# HTML lecture deck (ULBS)

One command turns `deck.json` + `slides.html` + `data.js` into **one HTML file** that opens by double click (no server or build step for the viewer). The file embeds its scripts, CSS and ULBS assets; Open Sans is fetched from Google Fonts when available and otherwise falls back to the system sans-serif font. Reference result: `examples/week05/` (40 slides, 2 case studies, 25 widgets).

## What is fixed, what changes

| Fixed (never edit per deck) | Changes in your project folder |
|---|---|
| `framework/engine.js` navigation, notes, overview, tooltips, scaling | `deck.json` title, segments, which widget files |
| `framework/style.css` ULBS palette, Open Sans, layout classes | `slides.html` slides, notes, widget placeholders |
| `framework/shell.html` header, footer, help overlay | `data.js` matrices, diagrams, quiz items, e-mail briefs, checklist |
| `widgets/*.js` the interactive library | `widgets/*.js` (optional) new widgets for this topic |

**Zoom**: the stage always fits the window (browser zoom has no effect), so the header has `− 100% +` buttons that zoom the slide content (re-layout like browser zoom, 60%–300%, scrolls when it overflows, saved in localStorage). Keys: `+` `−` `0`, `Ctrl`+`+`/`−`/`0`, `Ctrl`+wheel. Built into `engine.js`/`shell.html`; nothing to do per deck. Slides must keep working at 100% (the test script only checks that).

Never copy the framework into the project: `build.py` reads it from this skill. Deck-specific CSS goes in `<project>/extra.css`.

## Workflow (follow in order)

1. **Read the sources.** The lecture file (`.pptx` preferred; for `.pdf` try `pdftotext`, else unzip the pptx and read the slide XML with the stdlib: `zipfile` + `ElementTree`), the lab assignments of the week and the previous decks. Write the extracted text to a scratch file and read it fully.
2. **Plan the storyline** before writing HTML: segments (opening, one per topic or case, compare/apply, wrap-up), 25-45 slides, each slide = one idea + one thing to do. Read `references/authoring.md` (slide anatomy, writing rules) and `references/widgets.md` (which widget fits which idea).
3. **Create the project folder** next to the source files (e.g. `<topic>_deck/`), copy `examples/week05/deck.json` and edit it: set the title to the topic, and **delete the `chip` field** of the first segment (the chip then shows the segment label). Start `slides.html` from `references/slide-templates.html`.
4. **Write content**, slide by slide: sub line "What you see.", an interactive widget or card, a takeaway, speaker notes (talk track + only what matters for that slide; no source slide numbers). Put data-driven widget content in `data.js` (`DeckData.matrix`, `.diagram`, `.sorter`, `.brief`, `.checklist`). If the topic needs a new simulator, write it in `<project>/widgets/<name>.js` following the widget rules below.
5. **Build and test**: `bash <skill>/scripts/serve-and-test.sh <project> --interact` (builds, serves, runs headless Playwright: overflow on every slide, console errors, widget load failures, a slow press on every control, screenshots in `<project>/shots/`). Exit code 0 = clean. Then **read the screenshots** of every new or changed widget: overflow checks do not catch clutter or clipped labels.
6. **Deliver**: `python3 -I <skill>/framework/build.py <project> "<output folder>/<topic>_interactive.html"`. Tell the user the path, slide count, what is interactive, and what is a teaching model or inferred.

## Widget rules (learned the hard way)

- **Live-redrawn widgets react on `pointerdown`**, not `click`: a timer that replaces the SVG every 100 ms swallows clicks (mouse down and up land on different elements). Slow-press test: 0/24 with `click`, 24/24 with `pointerdown`.
- **Every stateful widget has a Reset button** and says what it resets to.
- **One decision per slide.** Do not show other slides' presets in a picker (a Muscar slide once showed Dunderly options). Cross-case comparison belongs on the later slide, via `data-only="a,b"`.
- **Every control has a tooltip** (`data-tip`) that says what it does.
- Keep widgets inside the 1280x720 stage (`scrollHeight == clientHeight`; the test checks).
- Numbers from the source are labelled as such; capacities, scores and curves invented for teaching are labelled "teaching model".
- Braces around `const` inside `case`/`if` branches (a bare one broke a whole file once).
- Student-safe: no lab solutions in the deck. Link to the lab, show how to think.
- Credit sources in `footerHtml` only, not in the notes.

## Style rules

- No phrases that point at "the slides" (`from the slides`): the deck stands alone.
- Use the CSS variables, never new colours. `.pill.mus` / `.pill.dun` (teal / gold) is the colour code for two parallel cases.
- Fictional clients are marked fictional on screen.
- Practice questions test the **reasoning**, never recall: new situations (not the lecture's own cases), options that are all plausible, feedback on every option, and the deciding requirement named. Avoid "which system is this?" games.

## Files

- `framework/` engine.js, style.css, shell.html, build.py, assets (ULBS logo + favicon).
- `widgets/` calculators (tabs, method ladder, fleet, interview, volume, retention, cloud, checklist), diagrams-sims (diagram, matrix, pipeline, redundancy), api-quiz (api sandbox, layers, bi, blob, compare, loadmodel), sorter-brief (sorter, brief, decide). Catalog: `references/widgets.md`.
- `examples/week05/` the full case-studies deck (deck.json, slides.html, data.js). Copy and adapt rather than starting from nothing.
- `scripts/` `serve-and-test.sh`, `test-deck.js`. Files may not be executable: run with `bash` / `node`.
- Environment: run `npm install` in this skill directory, then `npx playwright install chromium` once. `test-deck.js` also finds Playwright from the current folder (`node_modules/playwright`), the script folder or `NODE_PATH`; alternatively set `PLAYWRIGHT_PATH` (module dir) and `CHROME_PATH` (browser executable). The Chrome DevTools MCP may not connect: use the headless script. Never run `pkill -f "http.server ..."` inside a command whose own text contains that string: it kills its own shell. `serve-and-test.sh` stops its server itself.
