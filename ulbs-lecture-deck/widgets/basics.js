/* Generic widgets: tabs, method ladder, interview, compare table, checklist. Content: DeckData.* */
(function () {
  const { h, s, fmt, size, money, slider, seg } = U;

  // ---------------------------------------------------------------- tabs
  Deck.register('tabs', (node) => {
    const panes = [...node.children].filter((c) => c.dataset.label);
    const bar = h('div', { class: 'seg' });
    const btns = panes.map((p, i) => h('button', { class: 'seg-btn', type: 'button', 'aria-pressed': String(i === 0), onclick: () => pick(i), 'data-tip': p.dataset.tip || 'Show this tab.' }, p.dataset.label));
    btns.forEach((b) => bar.append(b)); node.prepend(bar);
    function pick(k) { panes.forEach((p, i) => { p.hidden = i !== k; btns[i].setAttribute('aria-pressed', String(i === k)); }); }
    pick(0);
  });

  // ---------------------------------------------------------------- method ladder
  Deck.register('method', (node) => {
    const steps = DeckData.method || [];   // [title, description, slideId, colourVar]
    const g = h('div', { class: 'ladder' });
    steps.forEach(([t, d, id, c], i) => g.append(h('button', { class: 'step', type: 'button', style: { '--chip': `var(${c})` }, 'data-tip': 'Jump to the first slide where this step appears.', onclick: () => Deck.gotoId(id) }, h('div', { class: 'n' }, String(i + 1).padStart(2, '0')), h('b', {}, t), h('span', {}, d))));
    node.append(g);
  });

  // ---------------------------------------------------------------- interview
  Deck.register('interview', (node, ds) => {
    const IV = DeckData.interview || {}, C = IV[ds.case || Object.keys(IV)[0]];
    const asked = new Set();
    const ans = h('div', { class: 'answer', style: { '--chip': `var(${C.color})` } }, 'Click a question: you are the architect, the client answers.');
    const qs = C.q.map((q, i) => h('button', { class: 'q-btn', type: 'button', 'data-tip': 'Ask the client this question.', onclick: () => ask(i) }, `“${q[0]}”`));
    const rows = C.q.map((q) => ({ k: h('td', { style: { fontWeight: 700, width: '38%' } }, q[2]), v: h('td', { class: 'mono' }, '?') }));
    const tbl = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Non-functional requirement'), h('th', {}, 'Answer')), rows.map((r) => h('tr', {}, r.k, r.v)));
    const prog = h('span', { class: 'pill' }, '0 / ' + C.q.length + ' asked');
    const know = h('div', { class: 'row' }, C.sum.map((t) => h('span', { class: 'pill' }, t)));
    function ask(i) {
      asked.add(i);
      qs[i].classList.add('asked');
      ans.innerHTML = '';
      ans.append(h('div', { class: 'small' }, 'Client says:'), h('b', { class: 'big' }, C.q[i][1]), h('div', { style: { marginTop: '4px' } }, h('b', {}, 'So what? '), C.q[i][4]));
      rows[i].v.textContent = C.q[i][3]; rows[i].v.parentElement.style.background = '#e8f1ff';
      prog.textContent = `${asked.size} / ${C.q.length} asked`; prog.className = 'pill' + (asked.size === C.q.length ? ' ok' : '');
    }
    const all = h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Ask every question at once and fill the requirements table.', onclick: () => C.q.forEach((_, i) => ask(i)) }, 'Ask all');
    const reset = h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Clear the table and start again.', onclick: () => { asked.clear(); qs.forEach((b) => b.classList.remove('asked')); rows.forEach((r) => { r.v.textContent = '?'; r.v.parentElement.style.background = ''; }); ans.textContent = 'Click a question: you are the architect, the client answers.'; prog.textContent = '0 / ' + C.q.length + ' asked'; prog.className = 'pill'; } }, 'Reset');
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '1.05fr 1fr' } },
      h('div', { class: 'flexcol' }, h('div', { class: 'row' }, h('b', {}, 'What we already know:'), know), h('div', { class: 'row' }, h('b', {}, 'What we ask:'), prog, all, reset), qs, ans),
      h('div', { class: 'panel' }, h('h3', {}, 'The requirements sheet fills in as you ask'), tbl)));
  });

  // ================================================================ compare
  Deck.register('compare', (node) => {
    const C = DeckData.compare || { cols: [], rows: [] }, R = C.rows;   // rows: [criterion, ...one cell per column, why]
    let sel = C.start || 0;
    const tb = h('table', { class: 't' }), note = h('div', { class: 'answer', style: { '--chip': 'var(--purple)' } });
    function draw() {
      tb.replaceChildren(h('tr', {}, h('th', { style: { width: '17%' } }, ''), C.cols.map(([n, bg]) => h('th', { style: bg ? { background: bg } : {} }, n))), ...R.map((r, i) => h('tr', { class: 'cmp-row' + (i === sel ? ' on' : ''), tabindex: 0, 'data-tip': 'Click to see what drives this difference.', onclick: () => { sel = i; draw(); }, onkeydown: (e) => { if (e.key === 'Enter') { sel = i; draw(); } } }, h('td', {}, h('b', {}, r[0])), r.slice(1, -1).map((c) => h('td', {}, c)))));
      note.replaceChildren(h('b', {}, R[sel][0] + ': '), R[sel][R[sel].length - 1]);
    }
    node.append(h('div', { class: 'flexcol', style: { gap: '8px' } }, tb, note));
    draw();
  });

  // ---------------------------------------------------------------- checklist
  Deck.register('checklist', (node) => {
    const items = DeckData.checklist || [];
    const saved = U.store.get('checklist', []);
    const prog = h('span', { class: 'pill' }), bar = h('div', { class: 'meter' }, h('div', { style: { background: 'var(--green)', width: '0%' } }));
    const list = h('div', { class: 'grid', style: { gridTemplateColumns: '1fr 1fr', gap: '2px 14px' } });
    const boxes = items.map((t, i) => { const cb = h('input', { type: 'checkbox', checked: saved.includes(i) || null, onchange: upd }); const lab = h('label', { class: 'chk', 'data-tip': 'Tick it when you can say it about your own design.' }, cb, h('span', {}, t)); list.append(lab); return [cb, lab]; });
    function upd() { const on = boxes.map(([c], i) => (c.checked ? i : -1)).filter((i) => i >= 0); U.store.set('checklist', on); boxes.forEach(([c, l]) => l.classList.toggle('done', c.checked)); prog.textContent = `${on.length} / ${items.length}`; prog.className = 'pill' + (on.length === items.length ? ' ok' : ''); bar.firstChild.style.width = on.length / items.length * 100 + '%'; }
    node.append(h('div', { class: 'flexcol' }, h('div', { class: 'row' }, h('b', {}, 'Your architecture checklist'), prog), bar, list));
    upd();
  });
})();
