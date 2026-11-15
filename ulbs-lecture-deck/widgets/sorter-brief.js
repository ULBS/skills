/* Widgets part 4: requirement sorter, quick poll */
(function () {
  const { h } = U;
  Deck.register('sorter', (node) => {
    const Q = DeckData.sorter[node.dataset.case || 'default'] || [];    let i = 0, score = 0, ans = null;
    const card = h('div', { class: 'flexcol', style: { gap: '10px' } });
    const done = [];
    const F = h('div', { class: 'panel', style: { minHeight: '230px', flex: 1 } }, h('h3', {}, 'Functional: what the system should do'));
    const N = h('div', { class: 'panel', style: { minHeight: '230px', flex: 1 } }, h('h3', {}, 'Non-functional: what it should deal with'));
    function render() {
      card.replaceChildren();
      if (i >= Q.length) { card.append(h('div', { class: 'big-quote' }, `${score} of ${Q.length} correct`), h('div', { class: 'answer', style: { '--chip': 'var(--teal)' } }, h('b', {}, 'Shortcut: '), 'if you can demo it, it is functional. If you have to measure it (how many, how fast, how available), it is non-functional. The non-functional ones drive the architecture.')); return; }
      const [t, a, why] = Q[i];
      card.append(h('div', { class: 'small' }, `Requirement ${i + 1} of ${Q.length}`), h('div', { class: 'big-quote', style: { minHeight: '96px', fontSize: '24px' } }, t), h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', disabled: ans ? true : null, 'data-tip': 'Something the system does (a feature).', onclick: () => pick('f') }, 'Functional'), h('button', { class: 'btn gold', type: 'button', disabled: ans ? true : null, 'data-tip': 'A quality or a limit: how many, how fast, how available.', onclick: () => pick('n') }, 'Non-functional')));
      if (ans) card.append(h('div', { class: 'answer', style: { '--chip': ans === a ? 'var(--green)' : 'var(--red)' } }, h('b', {}, ans === a ? '✓ ' : '✗ '), why), h('button', { class: 'btn small', type: 'button', onclick: () => { i++; ans = null; render(); } }, i === Q.length - 1 ? 'Finish' : 'Next ▶'));
    }
    function pick(x) { ans = x; const [t, a] = Q[i]; if (x === a) score++; (a === 'f' ? F : N).append(h('div', { class: 'pill ' + (x === a ? 'ok' : 'bad'), style: { display: 'block', margin: '3px 0', whiteSpace: 'normal', borderRadius: '8px', padding: '4px 8px' } }, t)); render(); }
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '1fr 1.25fr', alignItems: 'start' } }, h('div', { class: 'panel' }, card), h('div', { class: 'flexcol' }, F, N)));
    render();
  });

  /* ---- client brief: a fictional e-mail with clickable phrases ---- */
  const BRIEF = DeckData.brief || {};
  Deck.register('brief', (node) => {
    const B = BRIEF[node.dataset.case]; let sel = null; const seen = new Set();
    const keys = Object.keys(B.hs);
    const mail = h('div', { class: 'mail' });
    const side = h('div', { class: 'panel brief-side' });
    const prog = h('div', { class: 'small', style: { marginTop: '10px' } });
    function render() {
      mail.replaceChildren(
        h('div', { class: 'mail-head' }, h('div', {}, h('b', {}, 'From: '), `${B.role}, ${B.from}`), h('div', {}, h('b', {}, 'Subject: '), B.subject)),
        ...B.mail.map((par) => h('p', {}, ...par.map((x) => typeof x === 'string' ? x : h('button', { type: 'button', class: 'hl' + (sel === x[0] ? ' on' : '') + (seen.has(x[0]) ? ' seen' : ''), 'data-tip': 'Click: what does the architect hear here?', onclick: () => { sel = x[0]; seen.add(x[0]); render(); } }, x[1])))));
      const e = sel && B.hs[sel];
      side.replaceChildren(e ? h('div', { class: 'flexcol', style: { gap: '6px' } }, h('div', {}, h('span', { class: 'pill ' + (e[0] === 'Functional' ? 'ok' : e[0] === 'Out of scope' ? 'bad' : e[0] === 'Context' ? '' : 'warn') }, e[0])), h('div', { style: { font: '700 18px var(--font)', color: 'var(--accent)' } }, e[1]), h('div', { html: e[2], style: { fontSize: '15.5px', lineHeight: 1.45 } }))
        : h('div', { class: 'small' }, 'The architect reads between the lines. Click a highlighted phrase in the e-mail to see what it implies.'));
      prog.textContent = seen.size >= keys.length ? `All ${keys.length} phrases read. Next: meet the system.` : `${seen.size} of ${keys.length} phrases explored`;
    }
    const facts = h('div', { class: 'card' }, h('h3', {}, 'Client fact sheet'), h('table', { class: 'facts' }, ...B.facts.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, v)))),
      h('div', { class: 'small', style: { margin: '8px 0 4px' } }, 'Not in the e-mail yet. We must ask:'), h('div', { class: 'row', style: { gap: '4px' } }, ...B.unknown.map((q) => h('span', { class: 'pill ' + B.tag }, q))));
    node.append(h('div', { class: 'cols', style: { gridTemplateColumns: '1.25fr 1fr', alignItems: 'start' } }, h('div', {}, mail, prog), h('div', { class: 'flexcol', style: { gap: '10px' } }, facts, side)));
    render();
  });

  /* ---- decide: scenario questions that check HOW to decide (content: DeckData.decide) ---- */
  Deck.register('decide', (node) => {
    const Q = DeckData.decide || [];
    const shuffle = (a) => { const r = a.slice(); for (let k = r.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [r[k], r[j]] = [r[j], r[k]]; } return r; };
    let order = shuffle(Q.map((_, k) => k)), i = 0, picked = null, score = 0, results = [];
    const optOrder = {};
    const left = h('div', { class: 'flexcol', style: { gap: '8px', flex: '1.25', minWidth: 0 } }), right = h('div', { class: 'flexcol', style: { gap: '8px', flex: '1', minWidth: 0 } });
    function restart() { order = shuffle(Q.map((_, k) => k)); i = 0; picked = null; score = 0; results = []; Object.keys(optOrder).forEach((k) => delete optOrder[k]); render(); }
    function render() {
      left.replaceChildren(); right.replaceChildren();
      if (i >= order.length) {
        const areas = [...new Set(Q.map((x) => x.area))];
        left.append(h('div', { class: 'big-quote' }, `${score} of ${order.length} decisions right`), h('div', { class: 'small' }, 'Result by skill:'), ...areas.map((a) => { const r = results.filter((x) => x.area === a), ok = r.filter((x) => x.ok).length; return h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'pill ' + (ok === r.length ? 'ok' : ok === 0 ? 'bad' : 'warn'), style: { minWidth: '44px', textAlign: 'center' } }, `${ok}/${r.length}`), h('span', {}, a)); }));
        const miss = [...new Map(results.filter((x) => !x.ok).map((x) => [x.link[0], x.link[1]])).entries()];
        right.append(h('div', { class: 'answer', style: { '--chip': miss.length ? 'var(--gold)' : 'var(--green)' } }, miss.length ? h('span', {}, h('b', {}, 'Revisit the slides behind your misses: '), 'for each one, say which requirement decides the choice.') : h('span', {}, h('b', {}, 'All decisions right. '), 'Now explain each one without the options: which requirement decided?')), ...miss.map(([id, label]) => h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Jump to that slide.', onclick: () => Deck.gotoId(id) }, '↩ ' + label)), h('button', { class: 'btn small', type: 'button', onclick: restart }, 'New order, play again'));
        return;
      }
      const q = Q[order[i]];
      if (!optOrder[order[i]]) optOrder[order[i]] = shuffle(q.opts.map((_, k) => k));
      const oo = optOrder[order[i]];
      left.append(
        h('div', { class: 'row' }, h('span', { class: 'pill' }, `${i + 1} / ${order.length}`), h('span', { class: 'pill ok' }, `right ${score}`), h('span', { class: 'pill warn' }, q.area)),
        h('div', { class: 'card dq-ctx', style: { fontSize: '17px', lineHeight: 1.45 } }, q.ctx),
        h('div', { class: 'dq-q', style: { font: '800 20px var(--font)', color: 'var(--accent)' } }, q.q),
        ...oo.map((k, n) => { const [txt, ok] = q.opts[k]; const sel = picked === k; const st = picked == null ? '' : ok ? ' opt-ok' : sel ? ' opt-bad' : ' opt-dim'; return h('button', { class: 'dopt' + st, type: 'button', disabled: picked != null ? true : null, 'data-tip': 'Choose this decision.', onclick: () => { picked = k; const good = !!q.opts[k][1]; if (good) score++; results.push({ area: q.area, ok: good, link: q.link }); render(); } }, h('b', {}, 'ABCD'[n] + '  '), txt); }));
      if (picked == null) right.append(h('div', { class: 'small', style: { padding: '10px 4px' } }, h('b', {}, 'Decide first. '), 'Ask yourself which requirement decides here, then pick the best option. Every answer explains its reason, right or wrong.'));
      else {
        const [ptxt, pok, pwhy] = q.opts[picked];
        right.append(h('div', { class: 'answer', style: { '--chip': pok ? 'var(--green)' : 'var(--red)' } }, h('b', {}, pok ? '✓ Right. ' : '✗ Not the best choice. '), pwhy));
        if (!pok) { const best = q.opts.find((o) => o[1]); right.append(h('div', { class: 'answer', style: { '--chip': 'var(--green)' } }, h('b', {}, 'Best: '), best[0], '. ', best[2])); }
        right.append(h('div', { class: 'callout', style: { fontSize: '15px' } }, h('b', {}, 'What decides: '), q.driver), h('button', { class: 'btn small', type: 'button', onclick: () => { i++; picked = null; render(); } }, i === order.length - 1 ? 'See result' : 'Next ▶'));
      }
    }
    node.append(h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '16px', flexWrap: 'nowrap' } }, left, right));
    render();
  });
})();
