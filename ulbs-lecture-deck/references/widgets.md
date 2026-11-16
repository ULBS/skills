# Widget catalog

Placeholder: `<div data-widget="NAME" data-...="..." class="grow"></div>`.

## Library (`<skill>/widgets/`, always available, content from `DeckData`)

List the files in `deck.json` `widgets`: `["basics", "diagram-matrix", "sorter-brief"]`.

| Widget | Use it to | Attributes | Content |
|---|---|---|---|
| `tabs` [basics] | switch between panes on one slide | children with `data-label` | the slide HTML |
| `method` [basics] | clickable ladder of the method's steps, each linking to a slide | none | `DeckData.method = [[title, desc, slideId, '--colour'], ...]` |
| `interview` [basics] | click the client questions, a requirements sheet fills in | `data-case` | `DeckData.interview = {case: {color, q: [[question, answer, label, short, soWhat], ...], sum: [known, ...]}}` |
| `compare` [basics] | side-by-side table, click a row for what drives the difference | none | `DeckData.compare = {start, cols: [[name, headerBg], ...], rows: [[criterion, ...cell per col, why], ...]}` |
| `checklist` [basics] | tick list saved in localStorage | none | `DeckData.checklist = [text, ...]` |
| `architecture-diagram` [diagram-matrix] | software architecture in 4 views (components, messaging, technology, physical), click a box for reasons, crash replicas | `data-case`, `data-mode` | `DeckData.diagram` |
| `matrix` [diagram-matrix] | weighted decision matrix: weight sliders, clickable scores, winner bar, Reset | `data-preset`, `data-only="a,b"` | `DeckData.matrix` |
| `sorter` [sorter-brief] | sort items into two boxes with feedback and score (default boxes: functional / non-functional) | `data-case` | `DeckData.sorter = {case: [[text, 'f'\|'n', why], ...]}` or `{case: {boxes: {a: [title, button, tip], b: [...]}, tip, items: [[text, 'a'\|'b', why], ...]}}` |
| `brief` [sorter-brief] | fictional client e-mail with clickable phrases + fact sheet | `data-case` | `DeckData.brief` |
| `decide` [sorter-brief] | scenario quiz: a new situation, 4 options, feedback on every option, "what decides", score by skill, links to slides to revisit | none | `DeckData.decide` (`{area, link:[slideId,label], ctx, q, driver, opts:[[text, 1\|0, why]]}`) |

Without `data-case` / `data-preset` a widget uses the first key of its `DeckData` object.

### Widget texts (`DeckData.labels`)

The library widgets' fixed texts default to the software-architecture wording of week 5 ("Your architecture checklist", "Client fact sheet", "which requirement decides"...). For another topic, override only the keys you need; `{k}` / `{n}` are filled with the current count / total.

```js
DeckData.labels = {
  checklist: { title, tip },
  interview: { start, askTip, colKey, colVal, asked: '{k} / {n} asked', says, soWhat, allTip, resetTip, know, ask, sheet },
  brief:     { from, subject, hlTip, intro, done: 'All {n} ...', progress: '{k} of {n} ...', facts, unknown, kinds: { Category: 'ok'|'bad'|''|'warn' } },
  decide:    { score: '{k} of {n} ...', bySkill, missHead, missBody, allHead, allBody, again, firstHead, firstBody, optTip, right, wrong, best, driver },
  matrix:    { weights, weightTip, scores, scoreTip, result, takeaway },
};
```

`interview` and `brief` also accept `labels: {...}` inside one case (wins over `DeckData.labels`). `sorter` has its own `boxes` / `tip` per case. `architecture-diagram` stays architecture-specific (4 fixed views, load balancers, edge types TCP / REST / queue / file / ETL).

## Topic widgets (`examples/week05/widgets/`, content embedded)

Written for the week 5 case studies; numbers, labels and presets are inside the JS. They are **not** in the library: to use one, **copy it into `<project>/widgets/<name>.js`, rename it (`Deck.register('newname', ...)`) and replace the content**; keep the structure, controls and styling. Files in `<project>/widgets/` are included automatically (no entry in `deck.json`). If a copied file reuses a registered name, the later file wins.

| Widget | File | Pattern it shows |
|---|---|---|
| `fleet` | case-calculators | animated canvas stream, one slider, KPI tiles |
| `volume` | case-calculators | sliders + presets -> KPI tiles and a budget meter (`data-case`) |
| `retention` | case-calculators | day calendar with hot / archived days, step buttons, Reset |
| `cloud` | case-calculators | tiered price calculator with bar per tier |
| `pipeline` | case-sims | live producer -> queue -> consumer simulator (crash, burst, queue on/off) |
| `redundancy` | case-sims | `logging`: two active copies on a queue; `payment`: timer job with 1 copy / active-active / active-passive and guided tasks |
| `api` | case-api-quiz | mock REST server with state, editable path, Send, status codes (`data-tab`, `data-only`) |
| `layers` | case-api-quiz | application-type quiz that unlocks a layer stack (`data-case`) |
| `bi` | case-api-quiz | two-bucket question sorting with score |
| `blob` | case-api-quiz | option chooser scored against a checklist of conditions |
| `loadmodel` | case-api-quiz | queueing chart (Erlang C), 1 writer vs N writers |

## Widget API (engine)

```js
(function () {
  const { h, s, fmt, size, money, slider, seg, clamp, store } = U;   // DOM helpers
  Deck.register('mywidget', (node, ds) => {   // node = placeholder div, ds = its data-* attributes
    // DOM: h('div', {class:'...', style:{...}, onclick: fn, 'data-tip':'...'}, ...children)
    // SVG: s('svg', {...}); slider(label, {min,max,step,value,format}, onChange, tip) -> el.set(v)
    // seg([[value,label,tip],...], current, onChange) -> el.set(v), el.get()
    node.append(/* ... */);
    return { show() { /* start timers */ }, hide() { /* stop timers */ } };   // optional
  });
})();
```

- Widgets mount lazily when their slide first shows; `show()` / `hide()` start and stop timers so hidden slides cost nothing.
- Read content from `DeckData.*` at load (top of the IIFE) or inside the factory.
- Timer-redrawn SVG: attach handlers with `onpointerdown`, not `onclick`.
- `U.store.get(k, default)` / `.set(k, v)`: localStorage wrapped in try/catch, prefixed with `storePrefix` from deck.json.
- Jump to another slide: `Deck.gotoId('id')`.
- Databases in SVG diagrams are cylinders (`cyl()` in `diagram-matrix.js`): node `kind: 'store'`.
- Diagram messaging view: arrows carry NO text (labels were unreadable on curved lines); the legend above the diagram names each arrow colour and dash style. Arrowheads have a fixed pixel size (`markerUnits: userSpaceOnUse`), independent of line width.
