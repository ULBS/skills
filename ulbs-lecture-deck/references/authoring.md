# Authoring guide

## Slide anatomy (every slide)

```html
<section class="slide" data-segment="topicA" data-id="a-req" data-title="Short title for the overview">
  <h2><span class="kick">Case 1 · Step 1 · Requirements</span>Question or claim as the headline</h2>
  <p class="sub"><b>What you see.</b> One or two sentences: what is on screen, what to press, what to look for.</p>
  <div data-widget="sorter" data-case="x" class="grow"></div>      <!-- or cards / callout -->
  <aside class="notes">
    <p class="say">One sentence the lecturer can say out loud.</p>
    <ul><li>The answer to the prediction, the traps, a question for the room: only what matters for THIS slide.</li></ul>
  </aside>
</section>
```

- `data-segment` must exist in `deck.json` segments (it sets the colour of the chip, kicker and progress).
- `data-id` is unique; widgets and links jump with `Deck.gotoId('id')`.
- Title slide: class `slide title`, `<img class="logo-big" src="{{LOGO}}">`, `h1`, `.case-chips`, `.hints`, optional `svg.motif2`. See the first slide of `examples/week05/slides.html`.
- Layout classes: `.cols` / `.cols.two` / `.cols.three` (grid), `.card` / `.card.big`, `.callout` (+ `.gold .red .green .purple`), `.tight` (compact list), `.pill`, `.small`, `.row`, `.flexcol`, `.grow` (fill remaining height), `.big-quote`.
- Palette variables: `--navy --blue --teal --gold --purple --green --red --burgundy --surface --surface-2 --border --ink --muted`. The navy header and white stage are fixed.

## Storyline pattern that worked

1. Opening: title, what you will learn, the method in one picture (clickable ladder of steps).
2. Per case: **brief** (client e-mail with clickable phrases) -> meet the system -> requirements (sorter) -> ask the client (interview) -> numbers (volume calculator) -> one slide per component or decision (matrix, simulator) -> diagrams (4 views).
3. Compare and apply: side-by-side table, a decision-practice quiz (new situations, each answer explains its deciding requirement), a transfer exercise with a new system, the link to the week's lab.
4. Wrap-up: lab requirements, a checklist saved in the browser, "what to remember".

Rules of thumb: predict first, then reveal (a "Predict:" callout before the widget); every decision slide shows that **context decides** (same candidates, different weights); finish with a takeaway line; do not stack three widgets on one slide.

## Writing rules

- **Speaker notes never cite source slide numbers** ("Source slides 14-16", "slide 83") and never say "the slide says". Say "the case study says" only when the origin matters. Keep only what the lecturer needs for the current slide: talk track, the facts to state, the answer to the prediction, traps, a question for the room. Do not put credits, file names or deck-wide remarks in notes (credit lives in `footerHtml`).

- Sub line starts with "What you see." Then what to press. Short sentences, gloss every term.
- Flag inconsistencies of the source in the notes instead of hiding them (e.g. a 200,000-vehicle target vs 7,000 msg/s; `/employee` vs `/employees`). Mark invented teaching material as such.
- Fictional clients and e-mails are marked fictional on screen; the facts come from the source.
- No lab solutions.

## Data files (`data.js`)

Assigned to `DeckData` before the widgets load: `DeckData.matrix = {key: {label, q, ctx, opts, crit, sc, note}}`, `DeckData.diagram = {case: {H, nodes, edges}}`, `DeckData.sorter = {case: [[text, 'f'|'n', explanation], ...]}` or `{case: {boxes: {a: [title, button, tip], b: [...]}, tip, items: [[text, 'a'|'b', why], ...]}}` for other two-box topics, `DeckData.brief = {case: {from, role, subject, tag: 'teal'|'gold', mail, facts, unknown, hs}}`, `DeckData.method`, `DeckData.interview`, `DeckData.compare`, `DeckData.decide`, `DeckData.checklist = [string, ...]` (shapes in `references/widgets.md`). Copy the shapes from `examples/week05/data.js`. All topic content lives here or in `<project>/widgets/`, never in the skill's `widgets/`.

## Test and review loop

`bash scripts/serve-and-test.sh <project> --interact`, then read 5-10 screenshots from `<project>/shots/` (new widgets, densest slides). Typical fixes found this way: canvas too tall (slide scrolls), SVG labels colliding, text clipped in a node, a stray "null" from an optional child, a slider value wrapping onto two lines, edges leaving the SVG viewBox, database nodes drawn as plain rounded boxes (use the cylinder helper in the diagram widget).
