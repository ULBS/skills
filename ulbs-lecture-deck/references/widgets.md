# Widget catalog

Placeholder: `<div data-widget="NAME" data-...="..." class="grow"></div>`. Library file in brackets.

| Widget | Use it to | Attributes | Content lives in |
|---|---|---|---|
| `tabs` [calculators] | switch between panes on one slide | children with `data-label` | the slide HTML |
| `method` [calculators] | clickable ladder of the method's steps, each linking to a slide | none | embedded (edit steps and slide ids) |
| `fleet` [calculators] | canvas with a stream of messages, slider for the number of senders | none | embedded, adapt |
| `interview` [calculators] | click the client questions, a requirements sheet fills in | `data-case` | embedded `INTERVIEWS` |
| `volume` [calculators] | msgs/s x size x time = GB/TB, presets per case | `data-case` | embedded presets |
| `retention` [calculators] | days kept hot vs archived, calendar, Reset | none | embedded |
| `cloud` [calculators] | tiered price calculator | none | embedded prices |
| `checklist` [calculators] | tick list saved in localStorage | none | `DeckData.checklist` |
| `diagram` [diagrams-sims] | architecture in 4 views (components, messaging, technology, physical), click a box for reasons, crash replicas | `data-case`, `data-mode` | `DeckData.diagram` |
| `matrix` [diagrams-sims] | weighted decision matrix: weight sliders, clickable scores, winner bar, Reset | `data-preset`, `data-only="a,b"` | `DeckData.matrix` |
| `pipeline` [diagrams-sims] | live producer -> queue -> consumer simulator (crash, rush hour, queue on/off) | none | embedded parameters |
| `redundancy` [diagrams-sims] | `logging`: two active copies sharing a queue; `payment`: pay-day simulator (1 copy / 2 active / active+passive, crash a copy, fire the timer, 4 guided tasks with ticks) | `data-case="logging"` or `"payment"` | embedded |
| `api` [api-quiz] | mock REST server with state, editable path, Send, status codes | `data-tab` | embedded `EPS`, `makeServer` |
| `layers` [api-quiz] | application-type quiz + layer stacks | `data-case` | embedded |
| `bi` [api-quiz] | sort questions: viewer vs BI | none | embedded |
| `blob` [api-quiz] | storage chooser with checklist | none | embedded |
| `compare` [api-quiz] | side-by-side comparison table | none | embedded |
| `loadmodel` [api-quiz] | Erlang C queue chart, 1 writer vs N writers | none | embedded |
| `sorter` [sorter-brief] | put items into two boxes with feedback and score | `data-case` | `DeckData.sorter` |
| `decide` [sorter-brief] | scenario quiz: a new situation, 4 options, feedback on every option, "what decides", score by skill, links to slides to revisit | none | `DeckData.decide` (`{area, link:[slideId,label], ctx, q, driver, opts:[[text, 1|0, why]]}`) |
| `brief` [sorter-brief] | fictional client e-mail with clickable phrases + fact sheet | `data-case` | `DeckData.brief` |

"Embedded" widgets can carry example-specific content inside the JS. For another topic, **copy the closest widget into `<project>/widgets/<name>.js`, rename it (`Deck.register('newname', ...)`) and replace the content**; keep the structure, controls and styling. Add the file name to nothing: files in `<project>/widgets/` are included automatically. If a copied file reuses a registered name, the later file wins.

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
- Databases in SVG diagrams are cylinders (`cyl()` in `diagrams-sims.js`): node `kind: 'store'`.
- Diagram messaging view: arrows carry NO text (labels were unreadable on curved lines); the legend above the diagram names each arrow colour and dash style. Arrowheads have a fixed pixel size (`markerUnits: userSpaceOnUse`), independent of line width.
