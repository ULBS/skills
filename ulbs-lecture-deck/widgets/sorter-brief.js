/* Widgets part 4: requirement sorter, quick poll */
(function () {
  const { h } = U;
  /* ---- sorter: put items into two boxes. Content: DeckData.sorter[case] =
     [[text, 'f'|'n', why], ...]                      (functional / non-functional, the default boxes)
     or { boxes: { a: [title, button, tip], b: [...] }, tip: 'rule shown at the end', items: [[text, 'a'|'b', why], ...] } ---- */
  const SORT_DEFAULT = {
    boxes: { a: ['Functional: what the system should do', 'Functional', 'Something the system does (a feature).'], b: ['Non-functional: what it should deal with', 'Non-functional', 'A quality or a limit: how many, how fast, how available.'] },
    tip: 'if you can demo it, it is functional. If you have to measure it (how many, how fast, how available), it is non-functional. The non-functional ones drive the architecture.',
  };
  Deck.register('sorter', (node) => {
    const all = DeckData.sorter || {}, raw = all[node.dataset.case || 'default'] || all[Object.keys(all)[0]] || [];
    const cfg = Array.isArray(raw) ? { ...SORT_DEFAULT, items: raw } : { ...SORT_DEFAULT, ...raw, boxes: { ...SORT_DEFAULT.boxes, ...(raw.boxes || {}) } };
    const Q = cfg.items.map(([t, k, why]) => [t, k === 'f' ? 'a' : k === 'n' ? 'b' : k, why]);
    let i = 0, score = 0, ans = null;
    const card = h('div', { class: 'flexcol', style: { gap: '10px' } });
    const box = { a: h('div', { class: 'panel', style: { minHeight: '230px', flex: 1 } }, h('h3', {}, cfg.boxes.a[0])), b: h('div', { class: 'panel', style: { minHeight: '230px', flex: 1 } }, h('h3', {}, cfg.boxes.b[0])) };
    function render() {
      card.replaceChildren();
      if (i >= Q.length) { card.append(h('div', { class: 'big-quote' }, `${score} of ${Q.length} correct`), cfg.tip ? h('div', { class: 'answer', style: { '--chip': 'var(--teal)' } }, h('b', {}, 'Shortcut: '), cfg.tip) : null); return; }
      const [t, , why] = Q[i];
      card.append(h('div', { class: 'small' }, `Item ${i + 1} of ${Q.length}`), h('div', { class: 'big-quote', style: { minHeight: '96px', fontSize: '24px' } }, t), h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', disabled: ans ? true : null, 'data-tip': cfg.boxes.a[2] || 'Put it in the first box.', onclick: () => pick('a') }, cfg.boxes.a[1]), h('button', { class: 'btn gold', type: 'button', disabled: ans ? true : null, 'data-tip': cfg.boxes.b[2] || 'Put it in the second box.', onclick: () => pick('b') }, cfg.boxes.b[1])));
      if (ans) card.append(h('div', { class: 'answer', style: { '--chip': ans === Q[i][1] ? 'var(--green)' : 'var(--red)' } }, h('b', {}, ans === Q[i][1] ? '✓ ' : '✗ '), why), h('button', { class: 'btn small', type: 'button', onclick: () => { i++; ans = null; render(); } }, i === Q.length - 1 ? 'Finish' : 'Next ▶'));
    }
    function pick(x) { ans = x; const [t, a] = Q[i]; if (x === a) score++; box[a].append(h('div', { class: 'pill ' + (x === a ? 'ok' : 'bad'), style: { display: 'block', margin: '3px 0', whiteSpace: 'normal', borderRadius: '8px', padding: '4px 8px' } }, t)); render(); }
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '1fr 1.25fr', alignItems: 'start' } }, h('div', { class: 'panel' }, card), h('div', { class: 'flexcol' }, box.a, box.b)));
    render();
  });

  /* ---- client brief: a fictional e-mail with clickable phrases ---- */
  const BRIEF = DeckData.brief || {};
  Deck.register('brief', (node) => {
    const B = BRIEF[node.dataset.case || Object.keys(BRIEF)[0]]; let sel = null; const seen = new Set();
    const L = U.labels('brief', { from: 'From: ', subject: 'Subject: ', hlTip: 'Click: what does the architect hear here?', intro: 'The architect reads between the lines. Click a highlighted phrase in the e-mail to see what it implies.', done: 'All {n} phrases read. Next: meet the system.', progress: '{k} of {n} phrases explored', facts: 'Client fact sheet', unknown: 'Not in the e-mail yet. We must ask:', kinds: { Functional: 'ok', 'Out of scope': 'bad', Context: '' } }, B.labels);
    const keys = Object.keys(B.hs);
    const mail = h('div', { class: 'mail' });
    const side = h('div', { class: 'panel brief-side' });
    const prog = h('div', { class: 'small', style: { marginTop: '10px' } });
    function render() {
      mail.replaceChildren(
        h('div', { class: 'mail-head' }, h('div', {}, h('b', {}, L.from), `${B.role}, ${B.from}`), h('div', {}, h('b', {}, L.subject), B.subject)),
        ...B.mail.map((par) => h('p', {}, ...par.map((x) => typeof x === 'string' ? x : h('button', { type: 'button', class: 'hl' + (sel === x[0] ? ' on' : '') + (seen.has(x[0]) ? ' seen' : ''), 'data-tip': L.hlTip, onclick: () => { sel = x[0]; seen.add(x[0]); render(); } }, x[1])))));
      const e = sel && B.hs[sel];
      side.replaceChildren(e ? h('div', { class: 'flexcol', style: { gap: '6px' } }, h('div', {}, h('span', { class: 'pill ' + (e[0] in L.kinds ? L.kinds[e[0]] : 'warn') }, e[0])), h('div', { style: { font: '700 18px var(--font)', color: 'var(--accent)' } }, e[1]), h('div', { html: e[2], style: { fontSize: '15.5px', lineHeight: 1.45 } }))
        : h('div', { class: 'small' }, L.intro));
      prog.textContent = U.fill(seen.size >= keys.length ? L.done : L.progress, { k: seen.size, n: keys.length });
    }
    const facts = h('div', { class: 'card' }, h('h3', {}, L.facts), h('table', { class: 'facts' }, ...B.facts.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, v)))),
      h('div', { class: 'small', style: { margin: '8px 0 4px' } }, L.unknown), h('div', { class: 'row', style: { gap: '4px' } }, ...B.unknown.map((q) => h('span', { class: 'pill ' + B.tag }, q))));
    node.append(h('div', { class: 'cols', style: { gridTemplateColumns: '1.25fr 1fr', alignItems: 'start' } }, h('div', {}, mail, prog), h('div', { class: 'flexcol', style: { gap: '10px' } }, facts, side)));
    render();
  });

  /* ---- decide: scenario questions that check HOW to decide (content: DeckData.decide) ---- */
  Deck.register('decide', (node) => {
    const Q = DeckData.decide || [];
    const L = U.labels('decide', { score: '{k} of {n} decisions right', bySkill: 'Result by skill:', missHead: 'Revisit the slides behind your misses: ', missBody: 'for each one, say which requirement decides the choice.', allHead: 'All decisions right. ', allBody: 'Now explain each one without the options: which requirement decided?', again: 'New order, play again', firstHead: 'Decide first. ', firstBody: 'Ask yourself which requirement decides here, then pick the best option. Every answer explains its reason, right or wrong.', optTip: 'Choose this decision.', right: '✓ Right. ', wrong: '✗ Not the best choice. ', best: 'Best: ', driver: 'What decides: ' });
    const shuffle = (a) => { const r = a.slice(); for (let k = r.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [r[k], r[j]] = [r[j], r[k]]; } return r; };
    let order = shuffle(Q.map((_, k) => k)), i = 0, picked = null, score = 0, results = [];
    const optOrder = {};
    const left = h('div', { class: 'flexcol', style: { gap: '8px', flex: '1.25', minWidth: 0 } }), right = h('div', { class: 'flexcol', style: { gap: '8px', flex: '1', minWidth: 0 } });
    function restart() { order = shuffle(Q.map((_, k) => k)); i = 0; picked = null; score = 0; results = []; Object.keys(optOrder).forEach((k) => delete optOrder[k]); render(); }
    function render() {
      left.replaceChildren(); right.replaceChildren();
      if (i >= order.length) {
        const areas = [...new Set(Q.map((x) => x.area))];
        left.append(h('div', { class: 'big-quote' }, U.fill(L.score, { k: score, n: order.length })), h('div', { class: 'small' }, L.bySkill), ...areas.map((a) => { const r = results.filter((x) => x.area === a), ok = r.filter((x) => x.ok).length; return h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'pill ' + (ok === r.length ? 'ok' : ok === 0 ? 'bad' : 'warn'), style: { minWidth: '44px', textAlign: 'center' } }, `${ok}/${r.length}`), h('span', {}, a)); }));
        const miss = [...new Map(results.filter((x) => !x.ok).map((x) => [x.link[0], x.link[1]])).entries()];
        right.append(h('div', { class: 'answer', style: { '--chip': miss.length ? 'var(--gold)' : 'var(--green)' } }, miss.length ? h('span', {}, h('b', {}, L.missHead), L.missBody) : h('span', {}, h('b', {}, L.allHead), L.allBody)), ...miss.map(([id, label]) => h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Jump to that slide.', onclick: () => Deck.gotoId(id) }, '↩ ' + label)), h('button', { class: 'btn small', type: 'button', onclick: restart }, L.again));
        return;
      }
      const q = Q[order[i]];
      if (!optOrder[order[i]]) optOrder[order[i]] = shuffle(q.opts.map((_, k) => k));
      const oo = optOrder[order[i]];
      left.append(
        h('div', { class: 'row' }, h('span', { class: 'pill' }, `${i + 1} / ${order.length}`), h('span', { class: 'pill ok' }, `right ${score}`), h('span', { class: 'pill warn' }, q.area)),
        h('div', { class: 'card dq-ctx', style: { fontSize: '17px', lineHeight: 1.45 } }, q.ctx),
        h('div', { class: 'dq-q', style: { font: '800 20px var(--font)', color: 'var(--accent)' } }, q.q),
        ...oo.map((k, n) => { const [txt, ok] = q.opts[k]; const sel = picked === k; const st = picked == null ? '' : ok ? ' opt-ok' : sel ? ' opt-bad' : ' opt-dim'; return h('button', { class: 'dopt' + st, type: 'button', disabled: picked != null ? true : null, 'data-tip': L.optTip, onclick: () => { picked = k; const good = !!q.opts[k][1]; if (good) score++; results.push({ area: q.area, ok: good, link: q.link }); render(); } }, h('b', {}, 'ABCD'[n] + '  '), txt); }));
      if (picked == null) right.append(h('div', { class: 'small', style: { padding: '10px 4px' } }, h('b', {}, L.firstHead), L.firstBody));
      else {
        const [ptxt, pok, pwhy] = q.opts[picked];
        right.append(h('div', { class: 'answer', style: { '--chip': pok ? 'var(--green)' : 'var(--red)' } }, h('b', {}, pok ? L.right : L.wrong), pwhy));
        if (!pok) { const best = q.opts.find((o) => o[1]); right.append(h('div', { class: 'answer', style: { '--chip': 'var(--green)' } }, h('b', {}, L.best), best[0], '. ', best[2])); }
        right.append(h('div', { class: 'callout', style: { fontSize: '15px' } }, h('b', {}, L.driver), q.driver), h('button', { class: 'btn small', type: 'button', onclick: () => { i++; picked = null; render(); } }, i === order.length - 1 ? 'See result' : 'Next ▶'));
      }
    }
    node.append(h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '16px', flexWrap: 'nowrap' } }, left, right));
    render();
  });
})();
