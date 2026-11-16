/* Generic widgets: architecture diagram (4 views), weighted decision matrix. Content: DeckData.diagram, DeckData.matrix */
(function () {
  const { h, s, fmt, size, money, slider, seg } = U;

  // ================================================================ diagram
  const EDGE = {
    tcp: ['#2184FF', 'TCP', false], etl: ['#622483', 'ETL', true], rest: ['#10ADB6', 'REST / HTTP', false],
    queue: ['#F7A30F', 'Queue', true], file: ['#900E36', 'File', true], data: ['#7a8499', 'data access', false], html: ['#2e8a00', 'HTML page / HTTP', false],
  };
  const DIAG = DeckData.diagram || {};

  Deck.register('architecture-diagram', (node, ds) => {
    const D = DIAG[ds.case || Object.keys(DIAG)[0]];
    const byId = Object.fromEntries(D.nodes.map((n) => [n.id, n]));
    let mode = ds.mode || 'components', sel = null;
    const dead = {};
    const modes = seg([['components', 'Components', 'Boxes and what each one does.'], ['messaging', 'Messaging', 'How the components talk to each other: TCP, queue, REST, files.'], ['technology', 'Technology', 'The technical diagram: which technology implements each box.'], ['physical', 'Physical', 'The physical diagram: redundant instances and load balancers. Click an instance to crash it.']], mode, (v) => { mode = v; draw(); });
    const holder = h('div', { class: 'svgbox' }), info = h('div', { class: 'answer', style: { '--chip': 'var(--blue)' } }), legend = h('div', { class: 'legend' }), status = h('div', { class: 'row' });
    const KIND = { actor: ['#eef2f8', '#8fa0bd'], svc: ['#e0f1ff', '#2184FF'], queue: ['#fff0d4', '#F7A30F'], store: ['#e6f5d6', '#7FCC27'], tool: ['#efe3f6', '#622483'], ext: ['#f1f1f1', '#777'] };
    const alive = (id, n) => { let c = 0; for (let i = 0; i < n; i++) if (!dead[id + i]) c++; return c; };
    const toggleDead = (id, i) => { dead[id + i] = !dead[id + i]; sel = id; draw(); };
    const physH = (n) => (mode === 'physical' && n.rep && n.rep.t === 'lb' && n.rep.n === 3 ? 122 : n.h);
    const rectOf = (n) => { const H = physH(n); return { x: n.x, y: n.y + n.h / 2 - H / 2, w: n.w, h: H }; };
    function anchor(n, side) { const r = rectOf(n); return side === 'l' ? [r.x, r.y + r.h / 2] : side === 'r' ? [r.x + r.w, r.y + r.h / 2] : side === 't' ? [r.x + r.w / 2, r.y] : [r.x + r.w / 2, r.y + r.h]; }
    function wrapNode(n, mx) { return mx; }

    function drawNode(n) {
      const r = rectOf(n), [fill, stroke] = KIND[n.kind];
      const phys = mode === 'physical';
      const g = s('g', { class: 'node-g', tabindex: 0, role: 'button', 'aria-label': n.title + ': show details', 'data-tip': 'Click for details.', onclick: () => { sel = n.id; draw(); }, onkeydown: (e) => { if (e.key === 'Enter') { sel = n.id; draw(); } } });
      const picked = sel === n.id;
      if (phys && n.rep) {
        const rp = n.rep;
        if (rp.t === 'lb') {
          const k = rp.n, ih = (r.h - (k - 1) * 5 - 12) / k;
          g.append(s('rect', { class: 'nb', x: r.x, y: r.y, width: r.w, height: r.h, rx: 12, fill: '#fff', stroke: picked ? '#2184FF' : '#c2cde0', 'stroke-width': picked ? 3 : 1.5, 'stroke-dasharray': '5 4' }));
          g.append(s('rect', { x: r.x + 6, y: r.y + r.h / 2 - 22, width: 34, height: 44, rx: 8, fill: '#fff4de', stroke: '#F7A30F', 'stroke-width': 2 }), s('text', { x: r.x + 23, y: r.y + r.h / 2 + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#8a5500' }, 'LB'));
          for (let i = 0; i < k; i++) {
            const dd = dead[n.id + i], iy = r.y + 6 + i * (ih + 5);
            const ig = s('g', { class: dd ? 'dead' : '', 'data-tip': dd ? 'Crashed. Click to restart this instance.' : 'Click to crash this instance.', onclick: (e) => { e.stopPropagation(); toggleDead(n.id, i); } });
            ig.append(s('rect', { x: r.x + 48, y: iy, width: r.w - 56, height: ih, rx: 6, fill, stroke: dd ? '#c4121e' : stroke, 'stroke-width': 2 }), s('text', { x: r.x + 48 + (r.w - 56) / 2, y: iy + ih / 2 + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#12182b' }, dd ? '✗ ' + n.short + ' ' + (i + 1) : n.short + ' ' + (i + 1)));
            g.append(ig);
            if (!dd) g.append(s('path', { d: `M${r.x + 40},${r.y + r.h / 2} L${r.x + 48},${iy + ih / 2}`, stroke: '#F7A30F', 'stroke-width': 1.5, fill: 'none' }));
          }
          return g;
        }
        if (rp.t === 'pair') {
          const hw = (r.w - 38) / 2;
          g.append(s('rect', { class: 'nb', x: r.x, y: r.y, width: r.w, height: r.h, rx: 12, fill: '#fff', stroke: picked ? '#2184FF' : '#c2cde0', 'stroke-width': picked ? 3 : 1.5, 'stroke-dasharray': '5 4' }));
          for (let i = 0; i < 2; i++) {
            const dd = dead[n.id + i], ix = r.x + 6 + i * (hw + 26);
            const ig = s('g', { class: dd ? 'dead' : '', 'data-tip': dd ? 'Crashed. Click to restart.' : 'Click to crash this instance.', onclick: (e) => { e.stopPropagation(); toggleDead(n.id, i); } });
            ig.append(s('rect', { x: ix, y: r.y + 6, width: hw, height: r.h - 22, rx: 6, fill, stroke: dd ? '#c4121e' : stroke, 'stroke-width': 2 }), s('text', { x: ix + hw / 2, y: r.y + 6 + (r.h - 22) / 2 + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#12182b' }, (dd ? '✗ ' : '') + n.short + ' ' + (i ? 'B' : 'A')));
            g.append(ig);
          }
          g.append(s('path', { d: `M${r.x + 6 + hw},${r.y + 6 + (r.h - 22) / 2} L${r.x + 6 + hw + 26},${r.y + 6 + (r.h - 22) / 2}`, stroke: '#c4121e', 'stroke-width': 2, 'stroke-dasharray': '3 3' }), s('text', { x: r.x + r.w / 2, y: r.y + 6 + (r.h - 22) / 2 - 3, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: '#c4121e' }, 'Is Alive'));
          g.append(s('text', { x: r.x + r.w / 2, y: r.y + r.h - 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#454B67' }, rp.label));
          return g;
        }
        if (rp.t === 'ha') {
          const st = n.kind === 'store';
          for (let i = 2; i >= 1; i--) { if (st) cyl(g, r.x + i * 5, r.y - i * 5 + 5, r.w, r.h, fill, stroke, 1.5, .75); else g.append(s('rect', { x: r.x + i * 5, y: r.y - i * 5 + 5, width: r.w, height: r.h, rx: 12, fill, stroke, 'stroke-width': 1.5, opacity: .75 })); }
          if (st) cyl(g, r.x, r.y + 5, r.w, r.h, fill, picked ? '#2184FF' : stroke, picked ? 3 : 2); else g.append(s('rect', { class: 'nb', x: r.x, y: r.y + 5, width: r.w, height: r.h, rx: 12, fill, stroke: picked ? '#2184FF' : stroke, 'stroke-width': picked ? 3 : 2 }));
          g.append(s('text', { x: r.x + r.w / 2, y: r.y + 5 + 24 + (st ? 5 : 0), 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#12182b' }, n.title));
          g.append(s('text', { x: r.x + r.w / 2, y: r.y + 5 + 44 + (st ? 5 : 0), 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#2d6a00' }, 'built-in HA'));
          return g;
        }
      }
      // normal box
      const isDb = n.kind === 'store', oy = isDb ? 6 : 0;
      if (isDb) cyl(g, r.x, r.y, r.w, r.h, fill, picked ? '#0B2F63' : stroke, picked ? 4 : 2);
      else g.append(s('rect', { class: 'nb', x: r.x, y: r.y, width: r.w, height: r.h, rx: 12, fill, stroke: picked ? '#0B2F63' : stroke, 'stroke-width': picked ? 4 : 2, 'stroke-dasharray': n.kind === 'ext' ? '6 4' : null }));
      const tt = (y, txt, size, wt, col) => g.append(s('text', { x: r.x + r.w / 2, y: r.y + y + oy, 'text-anchor': 'middle', 'font-size': size, 'font-weight': wt, fill: col }, txt));
      if (mode === 'components') { tt(r.h > 80 ? 30 : 22, n.title, 14, 700, '#12182b'); (n.role || []).forEach((l, i) => tt((r.h > 80 ? 30 : 22) + 17 + i * 14, l, 11.5, 400, '#454B67')); }
      else if (mode === 'messaging') { tt(r.h / 2 + 5, n.title, 14, 700, '#12182b'); }
      else if (mode === 'technology') { tt(r.h > 80 ? 32 : 24, n.title, 13.5, 700, '#12182b'); g.append(s('rect', { x: r.x + 10, y: r.y + oy + (r.h > 80 ? 42 : 33), width: r.w - 20, height: 22, rx: 11, fill: '#fff', stroke }), s('text', { x: r.x + r.w / 2, y: r.y + oy + (r.h > 80 ? 57 : 48), 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#0B2F63' }, n.tech)); }
      else { tt(r.h / 2 + 5, n.title, 14, 700, '#12182b'); }
      return g;
    }

    // cylinder: body + elliptical top lip, used for every database node
    function cyl(g, x, y, w, h, fill, stroke, sw, op) {
      const ry = 7, rx = w / 2;
      g.append(s('path', { class: 'nb', d: `M${x},${y + ry} A${rx},${ry} 0 0 1 ${x + w},${y + ry} L${x + w},${y + h - ry} A${rx},${ry} 0 0 1 ${x},${y + h - ry} Z`, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round', opacity: op || null }));
      g.append(s('ellipse', { cx: x + rx, cy: y + ry, rx, ry, fill: 'rgba(255,255,255,.55)', stroke, 'stroke-width': sw, opacity: op || null }));
    }

    function draw() {
      const svg = s('svg', { viewBox: `0 0 1180 ${D.H}`, role: 'img', 'aria-label': 'Architecture diagram' });
      const used = new Set(D.edges.map((e) => e[4]));
      const defs = s('defs'); used.forEach((k) => defs.append(s('marker', { id: 'ar-' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerUnits: 'userSpaceOnUse', markerWidth: 11, markerHeight: 11, orient: 'auto-start-reverse' }, s('path', { d: 'M0,0 L10,5 L0,10 z', fill: EDGE[k][0] })))); svg.append(defs);
      const labels = []; 
      D.edges.forEach(([a, b, sa, sb, kind, lab]) => {
        const A = byId[a], B = byId[b]; const [x1, y1] = anchor(A, sa), [x2, y2] = anchor(B, sb);
        const horiz = sa === 'r' || sa === 'l' ? (sb === 'l' || sb === 'r') : false;
        let d;
        if (horiz) { const dx = Math.max(24, Math.abs(x2 - x1) / 2); d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`; }
        else if (sa === 'r' && sb === 't') { d = `M${x1},${y1} C${x1 + 40},${y1} ${x2},${y2 - 50} ${x2},${y2}`; }
        else { const dy = Math.max(24, Math.abs(y2 - y1) / 2) * Math.sign(y2 - y1 || 1); d = `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`; }
        const [col, , dashed] = EDGE[kind];
        const msg = mode === 'messaging';
        svg.append(s('path', { d, fill: 'none', stroke: col, 'stroke-width': msg ? 3 : 2, opacity: msg ? 1 : .55, class: msg && dashed ? 'flow-edge' : null, 'marker-end': `url(#ar-${kind})` }));
        if (mode === 'components' && lab) labels.push([(x1 + x2) / 2, (y1 + y2) / 2 - 4, lab, '#7a8499', 1]);
      });
      D.nodes.forEach((n) => svg.append(drawNode(n)));
      labels.forEach(([x, y, t, c, light]) => { const w = t.length * 6.6 + 14; svg.append(s('rect', { x: x - w / 2, y: y - 10, width: w, height: 18, rx: 9, fill: light ? 'none' : '#fff', stroke: light ? 'none' : c }), s('text', { x, y: y + 3, 'text-anchor': 'middle', 'font-size': light ? 10.5 : 11.5, 'font-weight': 800, fill: c }, t)); });
      holder.replaceChildren(svg);
      // legend
      legend.replaceChildren();
      if (mode === 'messaging') { [...used].forEach((k) => legend.append(h('span', {}, h('i', { style: { borderColor: EDGE[k][0], borderTopStyle: EDGE[k][2] ? 'dashed' : 'solid' } }), EDGE[k][1]))); }
      else if (mode === 'physical') legend.append(h('span', {}, 'LB = load balancer. Click any instance to crash it and watch the status.'));
      else legend.append(h('span', {}, 'Click any box for the reasons behind it.'));
      // status for physical
      status.replaceChildren();
      if (mode === 'physical') {
        let down = false, degraded = false; const pills = [];
        D.nodes.forEach((n) => { if (!n.rep || (n.rep.t !== 'lb' && n.rep.t !== 'pair')) return; const k = n.rep.t === 'lb' ? n.rep.n : 2, a = alive(n.id, k); if (a === 0) down = true; else if (a < k) degraded = true; pills.push(h('span', { class: 'pill ' + (a === 0 ? 'bad' : a < k ? 'warn' : 'ok') }, `${n.short} ${a}/${k}`)); });
        status.append(h('span', { class: 'pill ' + (down ? 'bad' : degraded ? 'warn' : 'ok'), style: { fontSize: '13px' } }, down ? 'SYSTEM FUNCTION LOST' : degraded ? 'DEGRADED but working' : 'ALL INSTANCES UP'), ...pills);
      }
      // info
      const n = sel && byId[sel];
      info.replaceChildren();
      if (!n) info.append(h('span', {}, h('b', {}, 'Four views of the same system. '), 'Switch the buttons above: components, messaging, technology, physical. Click a box to read why it looks like this.'));
      else info.append(h('b', {}, n.title + ' · '), h('span', { class: 'pill' }, n.tech), ' ', n.why, h('div', { style: { marginTop: '3px' } }, h('b', {}, 'Redundancy: '), n.red));
    }
    node.append(h('div', { class: 'flexcol', style: { gap: '8px' } }, h('div', { class: 'row' }, modes, legend), holder, status, info));
    draw();
  });

  // ================================================================ decision matrix
  const MX = DeckData.matrix || {};
  Deck.register('matrix', (node, ds) => {
    let key = ds.preset || Object.keys(MX)[0], P, W, SC;
    const L = U.labels('matrix', { weights: 'Weights: how much each criterion matters here (0–5)', weightTip: 'How important is this criterion in this context?', scores: 'Scores (click to change)', scoreTip: 'Score of this technology for this criterion (1 = poor, 5 = excellent). Click to change.', result: 'Weighted result', takeaway: 'Takeaway: ' });
    const only = (ds.only || key).split(',').map((x) => x.trim());
    const picker = seg(only.map((k) => [k, MX[k].label, 'Switch to this decision.']), key, (k) => { key = k; load(); });
    const head = h('div', { class: 'flexcol', style: { gap: '4px' } });
    const wbox = h('div', { class: 'flexcol', style: { gap: '4px' } }), tbl = h('div'), res = h('div', { class: 'flexcol', style: { gap: '5px' } }), note = h('div', { class: 'answer', style: { '--chip': 'var(--purple)' } });
    const heat = (v) => `hsl(212 75% ${96 - v * 11}%)`;
    function load() { P = MX[key]; W = P.crit.map((c) => c[1]); SC = P.sc.map((r) => r.slice()); picker.set(key); build(); }
    function totals() { const mx = 5 * W.reduce((a, b) => a + b, 0) || 1; return P.opts.map((_, i) => SC[i].reduce((a, v, j) => a + v * W[j], 0) / mx * 100); }
    function build() {
      head.replaceChildren(h('b', { style: { fontSize: '17px' } }, P.q), h('span', { class: 'small' }, 'Context: ' + P.ctx));
      wbox.replaceChildren(h('b', { class: 'small' }, L.weights));
      P.crit.forEach((c, j) => wbox.append(slider(c[0], { min: 0, max: 5, step: 1, value: W[j], format: (v) => v }, (v) => { W[j] = v; paint(); }, L.weightTip)));
      paint();
    }
    function paint() {
      const t = totals(), best = t.indexOf(Math.max(...t));
      const hdr = h('tr', {}, h('th', {}, L.scores), P.opts.map((o) => h('th', { style: { textAlign: 'center' } }, o)));
      tbl.replaceChildren(h('table', { class: 'm' }, hdr, P.crit.map((c, j) => h('tr', {}, h('td', { class: 'crit' }, c[0]), P.opts.map((_, i) => h('td', {}, h('button', { class: 'heat', type: 'button', style: { background: heat(SC[i][j]) }, 'data-tip': L.scoreTip, onclick: () => { SC[i][j] = SC[i][j] % 5 + 1; paint(); } }, String(SC[i][j]))))))));
      res.replaceChildren(h('b', { class: 'small' }, L.result));
      P.opts.forEach((o, i) => res.append(h('div', { class: 'opt-row' + (i === best ? ' winner' : ''), style: { gridTemplateColumns: '210px 1fr 54px', padding: '3px 6px', borderRadius: '8px' } }, h('span', { style: { fontWeight: 700 } }, o, i === best ? h('span', { class: 'badge-w', style: { marginLeft: '6px' } }, 'BEST FIT') : null), h('div', { class: 'meter' }, h('div', { style: { width: t[i] + '%', background: i === best ? 'var(--gold)' : 'var(--navy)' } })), h('span', { class: 'mono', style: { textAlign: 'right', fontWeight: 700 } }, t[i].toFixed(0) + '%'))));
      note.replaceChildren(h('b', {}, L.takeaway), P.note);
    }
    const reset = h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Restore the context’s original weights and scores.', onclick: load }, 'Reset');
    node.append(h('div', { class: 'flexcol', style: { gap: '8px' } }, h('div', { class: 'row' }, only.length > 1 ? picker : null, reset), head, h('div', { class: 'cols two', style: { gridTemplateColumns: '.9fr 1.35fr', alignItems: 'start' } }, h('div', { class: 'panel narrow' }, wbox), h('div', { class: 'flexcol', style: { gap: '8px' } }, tbl, res)), note));
    load();
  });
})();
