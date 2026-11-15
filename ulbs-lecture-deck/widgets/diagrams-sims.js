/* Widgets part 2: architecture diagram, decision matrix, pipeline simulator, redundancy lab */
(function () {
  const { h, s, fmt, size, slider, seg } = U;

  // ================================================================ diagram
  const EDGE = {
    tcp: ['#2184FF', 'TCP', false], etl: ['#622483', 'ETL', true], rest: ['#10ADB6', 'REST / HTTP', false],
    queue: ['#F7A30F', 'Queue', true], file: ['#900E36', 'File', true], data: ['#7a8499', 'data access', false], html: ['#2e8a00', 'HTML page / HTTP', false],
  };
  const DIAG = DeckData.diagram || {};

  Deck.register('diagram', (node, ds) => {
    const D = DIAG[ds.case || 'muscar'];
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
    let key = ds.preset || 'queue-mus', P, W, SC;
    const only = (ds.only || key).split(',').map((x) => x.trim());
    const picker = seg(only.map((k) => [k, MX[k].label, 'Switch to this decision.']), key, (k) => { key = k; load(); });
    const head = h('div', { class: 'flexcol', style: { gap: '4px' } });
    const wbox = h('div', { class: 'flexcol', style: { gap: '4px' } }), tbl = h('div'), res = h('div', { class: 'flexcol', style: { gap: '5px' } }), note = h('div', { class: 'answer', style: { '--chip': 'var(--purple)' } });
    const heat = (v) => `hsl(212 75% ${96 - v * 11}%)`;
    function load() { P = MX[key]; W = P.crit.map((c) => c[1]); SC = P.sc.map((r) => r.slice()); picker.set(key); build(); }
    function totals() { const mx = 5 * W.reduce((a, b) => a + b, 0) || 1; return P.opts.map((_, i) => SC[i].reduce((a, v, j) => a + v * W[j], 0) / mx * 100); }
    function build() {
      head.replaceChildren(h('b', { style: { fontSize: '17px' } }, P.q), h('span', { class: 'small' }, 'Context: ' + P.ctx));
      wbox.replaceChildren(h('b', { class: 'small' }, 'Weights: how much each criterion matters here (0–5)'));
      P.crit.forEach((c, j) => wbox.append(slider(c[0], { min: 0, max: 5, step: 1, value: W[j], format: (v) => v }, (v) => { W[j] = v; paint(); }, 'How important is this criterion in this context?')));
      paint();
    }
    function paint() {
      const t = totals(), best = t.indexOf(Math.max(...t));
      const hdr = h('tr', {}, h('th', {}, 'Scores (click to change)'), P.opts.map((o) => h('th', { style: { textAlign: 'center' } }, o)));
      tbl.replaceChildren(h('table', { class: 'm' }, hdr, P.crit.map((c, j) => h('tr', {}, h('td', { class: 'crit' }, c[0]), P.opts.map((_, i) => h('td', {}, h('button', { class: 'heat', type: 'button', style: { background: heat(SC[i][j]) }, 'data-tip': 'Score of this technology for this criterion (1 = poor, 5 = excellent). Click to change.', onclick: () => { SC[i][j] = SC[i][j] % 5 + 1; paint(); } }, String(SC[i][j]))))))));
      res.replaceChildren(h('b', { class: 'small' }, 'Weighted result'));
      P.opts.forEach((o, i) => res.append(h('div', { class: 'opt-row' + (i === best ? ' winner' : ''), style: { gridTemplateColumns: '210px 1fr 54px', padding: '3px 6px', borderRadius: '8px' } }, h('span', { style: { fontWeight: 700 } }, o, i === best ? h('span', { class: 'badge-w', style: { marginLeft: '6px' } }, 'BEST FIT') : null), h('div', { class: 'meter' }, h('div', { style: { width: t[i] + '%', background: i === best ? 'var(--gold)' : 'var(--navy)' } })), h('span', { class: 'mono', style: { textAlign: 'right', fontWeight: 700 } }, t[i].toFixed(0) + '%'))));
      note.replaceChildren(h('b', {}, 'Takeaway: '), P.note);
    }
    const reset = h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Restore the context’s original weights and scores.', onclick: load }, 'Reset');
    node.append(h('div', { class: 'flexcol', style: { gap: '8px' } }, h('div', { class: 'row' }, only.length > 1 ? picker : null, reset), head, h('div', { class: 'cols two', style: { gridTemplateColumns: '.9fr 1.35fr', alignItems: 'start' } }, h('div', { class: 'panel narrow' }, wbox), h('div', { class: 'flexcol', style: { gap: '8px' } }, tbl, res)), note));
    load();
  });

  // ================================================================ pipeline simulator
  Deck.register('pipeline', (node) => {
    const GCAP = 4000, PCAP = 3000, MAXQ = 2e7;
    const S = { lam: 7000, queue: true, gw: [1, 1, 1], pr: [1, 1, 1], q: 0, sent: 0, stored: 0, lostG: 0, lostP: 0, rateIn: 0, rateOut: 0, rateLoss: 0 };
    let timer = 0, scenarioNote = '';
    const sl = slider('Messages arriving', { min: 0, max: 30000, step: 500, value: S.lam, format: (v) => fmt(v) + '/s' }, (v) => { S.lam = v; }, 'Telemetry messages per second sent by the cars.');
    const qSeg = seg([['on', 'Kafka queue ON', 'The pipeline buffers messages between gateway and processor.'], ['off', 'No queue (direct)', 'The gateway pushes straight into the processor: anything it cannot handle immediately is lost.']], 'on', (v) => { S.queue = v === 'on'; });
    const svgBox = h('div', { class: 'svgbox' }), kpis = h('div', { class: 'row' }), insight = h('div', { class: 'answer', style: { '--chip': 'var(--teal)' } });
    const reset = () => { Object.assign(S, { q: 0, sent: 0, stored: 0, lostG: 0, lostP: 0 }); };
    const btn = (t, tip, fn, cls) => h('button', { class: 'btn small ' + (cls || 'ghost'), type: 'button', 'data-tip': tip, onclick: fn }, t);
    let burstUntil = 0;
    function tick() {
      const dt = 0.1, now = performance.now();
      const lam = now < burstUntil ? S.lam * 3 : S.lam;
      const aG = S.gw.filter(Boolean).length, aP = S.pr.filter(Boolean).length, gcap = aG * GCAP, pcap = aP * PCAP;
      const arr = lam * dt, acc = Math.min(arr, gcap * dt);
      S.sent += arr; S.lostG += arr - acc;
      let processed;
      if (S.queue) { S.q += acc; if (S.q > MAXQ) { S.lostP += S.q - MAXQ; S.q = MAXQ; } processed = Math.min(S.q, pcap * dt); S.q -= processed; }
      else { processed = Math.min(acc, pcap * dt); S.lostP += acc - processed; }
      S.stored += processed;
      S.rateIn = lam; S.rateAcc = acc / dt; S.rateOut = processed / dt; S.rateLoss = (arr - acc) / dt + (S.queue ? 0 : (acc - processed) / dt); S.cap = [gcap, pcap]; S.burst = now < burstUntil;
      draw();
    }
    function draw() {
      const [gcap, pcap] = S.cap || [3 * GCAP, 3 * PCAP];
      const lost = S.lostG + S.lostP, lostPct = S.sent ? lost / S.sent * 100 : 0, lag = pcap > 0 ? S.q / pcap : Infinity;
      const w = (r) => 2 + Math.min(10, (r || 0) / 1400);
      const svg = s('svg', { viewBox: '0 0 1180 190', role: 'img', 'aria-label': 'Live pipeline simulation' });
      const box = (x, y, wd, ht, fill, stroke, txt, sub, dead, onclick, tip) => { const g = s('g', { class: (onclick ? 'node-g ' : '') + (dead ? 'dead' : ''), onpointerdown: onclick, 'data-tip': tip || null, tabindex: onclick ? 0 : null }); g.append(s('rect', { x, y, width: wd, height: ht, rx: 9, fill, stroke: dead ? '#c4121e' : stroke, 'stroke-width': 2 }), s('text', { x: x + wd / 2, y: y + ht / 2 + (sub ? -1 : 5), 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: '#12182b' }, txt)); if (sub) g.append(s('text', { x: x + wd / 2, y: y + ht / 2 + 13, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#454B67' }, sub)); return g; };
      const edge = (x1, x2, y, rate, col, lbl) => { svg.append(s('line', { x1, y1: y, x2, y2: y, stroke: col, 'stroke-width': w(rate), class: rate > 0 ? 'flow-edge' : null, opacity: .85 }), s('text', { x: (x1 + x2) / 2, y: y - 12, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 800, fill: col }, lbl)); };
      svg.append(box(8, 60, 110, 70, '#eef2f8', '#8fa0bd', 'Cars', fmt(S.rateIn || S.lam) + ' msg/s'));
      edge(122, 200, 95, S.rateIn, '#2184FF', 'TCP');
      S.gw.forEach((a, i) => svg.append(box(204, 12 + i * 56, 150, 46, '#e0f1ff', '#2184FF', 'Gateway ' + (i + 1), a ? 'up' : 'CRASHED', !a, () => { S.gw[i] = S.gw[i] ? 0 : 1; }, a ? 'Click to crash this gateway instance.' : 'Click to restart it.')));
      edge(358, 440, 95, S.rateAcc, '#2184FF', fmt(S.rateAcc || 0));
      // queue tank
      const fill = S.queue ? Math.min(1, S.q / 3e5) : 0;
      svg.append(s('rect', { x: 444, y: 24, width: 160, height: 142, rx: 12, fill: S.queue ? '#fff4de' : '#eee', stroke: '#F7A30F', 'stroke-width': 2, 'stroke-dasharray': S.queue ? null : '6 4' }), s('rect', { x: 448, y: 162 - 134 * fill, width: 152, height: 134 * fill, rx: 8, fill: '#F7A30F', opacity: .75 }), s('text', { x: 524, y: 48, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: '#12182b' }, S.queue ? 'Kafka pipeline' : 'no queue'), s('text', { x: 524, y: 68, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#8a5500' }, S.queue ? 'backlog ' + fmt(S.q) : 'direct push'));
      edge(608, 690, 95, S.rateOut, '#2184FF', fmt(S.rateOut || 0));
      S.pr.forEach((a, i) => svg.append(box(694, 12 + i * 56, 150, 46, '#e0f1ff', '#2184FF', 'Processor ' + (i + 1), a ? 'up' : 'CRASHED', !a, () => { S.pr[i] = S.pr[i] ? 0 : 1; }, a ? 'Click to crash this processor instance.' : 'Click to restart it.')));
      edge(848, 930, 95, S.rateOut, '#2e8a00', 'store');
      svg.append(box(934, 55, 150, 80, '#e6f5d6', '#7FCC27', 'Operational DB', fmt(S.stored) + ' stored'));
      if (S.rateLoss > 1) svg.append(s('text', { x: 1100, y: 28, 'text-anchor': 'end', 'font-size': 14, 'font-weight': 800, fill: '#c4121e' }, '✗ losing ' + fmt(S.rateLoss) + ' msg/s'));
      if (S.burst) svg.append(s('text', { x: 1100, y: 160, 'text-anchor': 'end', 'font-size': 14, 'font-weight': 800, fill: '#F7A30F' }, 'BURST ×3'));
      svgBox.replaceChildren(svg);
      kpis.replaceChildren(
        k('arrived', fmt(S.sent)), k('stored', fmt(S.stored), 'good'), k('lost', fmt(lost) + ` (${lostPct.toFixed(1)}%)`, lost > 0 ? 'hot' : ''), k('backlog in queue', fmt(S.q)), k('data is late by', S.queue ? (isFinite(lag) ? lag.toFixed(1) + ' s' : '∞ (stalled)') : 'n/a'),
        k('gateway capacity', fmt(gcap) + '/s'), k('processor capacity', fmt(pcap) + '/s'));
      let msg, col = 'var(--green)';
      const lam = S.burst ? S.lam * 3 : S.lam;
      if (gcap < lam) { msg = 'The gateway tier cannot accept everything: messages are lost at the entrance. Restart instances or add more (horizontal scaling).'; col = 'var(--red)'; }
      else if (pcap < lam && S.queue) { msg = isFinite(lag) ? 'The processor is behind, but the queue holds the backlog: nothing is lost, data is only late. That is the job of the pipeline.' : 'No processor is alive: telemetry piles up safely in Kafka until one comes back.'; col = 'var(--gold)'; }
      else if (pcap < lam) { msg = 'Without a queue the processor cannot keep up, so the excess is simply lost. This is exactly why the pipeline sits in the middle.'; col = 'var(--red)'; }
      else if (S.q > 100) { msg = 'Draining the backlog: processors are faster than the arrival rate, so the queue is shrinking.'; col = 'var(--blue)'; }
      else msg = 'Healthy: every tier has more capacity than the load. Try “Rush hour”, then crash two processors.';
      insight.style.setProperty('--chip', col); insight.textContent = msg;
    }
    const k = (l, v, c) => h('div', { class: 'kpi ' + (c || ''), style: { flex: '1', minWidth: '0', padding: '6px 10px' } }, h('div', { class: 'v', style: { fontSize: '19px' } }, v), h('div', { class: 'l', style: { fontSize: '10.5px' } }, l));
    node.append(h('div', { class: 'flexcol', style: { gap: '8px' } },
      h('div', { class: 'row' }, h('div', { style: { minWidth: '420px' } }, sl), qSeg, btn('Rush hour ×3 (5 s)', 'Triple the arrival rate for five seconds.', () => { burstUntil = performance.now() + 5000; }, 'gold'), btn('Crash 2 processors', 'Simulate two processor instances crashing at once.', () => { S.pr = [1, 0, 0]; }), btn('Reset', 'Everything up, counters to zero.', () => { S.gw = [1, 1, 1]; S.pr = [1, 1, 1]; reset(); S.lam = 7000; sl.set(7000); burstUntil = 0; })),
      svgBox, kpis, insight));
    draw();
    return { show() { if (timer) return; if (Deck.reduced) { for (let i = 0; i < 20; i++) tick(); return; } timer = setInterval(tick, 100); }, hide() { clearInterval(timer); timer = 0; } };
  });

  // ================================================================ redundancy lab
  Deck.register('redundancy', (node, ds) => {
    const kind = ds.case || 'logging';
    let timer = 0;
    if (kind === 'logging') {
      const CAP = 30; const S = { lam: 40, a: [1, 1], q: 0, done: 0, seen: [0, 0], now: 0 };
      const sl = slider('Log records arriving', { min: 0, max: 100, step: 5, value: S.lam, format: (v) => v + '/s' }, (v) => { S.lam = v; }, 'Log records per second written by all services.');
      const box = h('div', { class: 'svgbox' }), kp = h('div', { class: 'row' }), ins = h('div', { class: 'answer', style: { '--chip': 'var(--gold)' } });
      function tick() {
        S.now += 0.1; const n = S.a.filter(Boolean).length;
        const cons = Math.min(S.q + S.lam * .1, n * CAP * .1); S.q = Math.max(0, S.q + S.lam * .1 - cons); S.done += cons;
        S.a.forEach((a, i) => { if (a) S.seen[i] = S.now; }); draw();
      }
      function draw() {
        const svg = s('svg', { viewBox: '0 0 1180 170' });
        const n = S.a.filter(Boolean).length;
        svg.append(s('rect', { x: 20, y: 40, width: 220, height: 90, rx: 12, fill: '#fff4de', stroke: '#F7A30F', 'stroke-width': 2 }), s('text', { x: 130, y: 70, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800 }, 'Queue (RabbitMQ)'), s('text', { x: 130, y: 96, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: S.q > 50 ? '#c4121e' : '#8a5500' }, fmt(S.q) + ' waiting'));
        S.a.forEach((a, i) => {
          const x = 460, y = 14 + i * 76; const g = s('g', { class: 'node-g ' + (a ? '' : 'dead'), tabindex: 0, 'data-tip': a ? 'Click to crash this instance.' : 'Click to restart it.', onpointerdown: () => { S.a[i] = S.a[i] ? 0 : 1; } });
          g.append(s('rect', { x, y, width: 220, height: 64, rx: 12, fill: '#e0f1ff', stroke: a ? '#2184FF' : '#c4121e', 'stroke-width': 3 }), s('text', { x: x + 110, y: y + 28, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800 }, 'Logging Service ' + 'AB'[i]), s('text', { x: x + 110, y: y + 50, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: a ? '#2d6a00' : '#c4121e' }, a ? 'polling the queue · ' + CAP + '/s' : 'CRASHED'));
          svg.append(g);
          svg.append(s('line', { x1: 244, y1: 85, x2: x, y2: y + 32, stroke: a ? '#F7A30F' : '#ccd', 'stroke-width': a ? 3 : 1.5, class: a ? 'flow-edge' : null }), s('line', { x1: x + 220, y1: y + 32, x2: 800, y2: 85, stroke: a ? '#2e8a00' : '#ccd', 'stroke-width': a ? 3 : 1.5, class: a ? 'flow-edge' : null }));
        });
        const peerDead = (i) => !S.a[1 - i];
        svg.append(s('path', { d: 'M570,78 L570,90', stroke: '#c4121e', 'stroke-width': 3, 'stroke-dasharray': '3 3' }), s('text', { x: 590, y: 88, 'font-size': 12, 'font-weight': 800, fill: '#c4121e' }, 'Is Alive?'));
        svg.append(s('rect', { x: 800, y: 40, width: 200, height: 90, rx: 14, fill: '#e6f5d6', stroke: '#7FCC27', 'stroke-width': 2 }), s('text', { x: 900, y: 74, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800 }, 'SQL Server'), s('text', { x: 900, y: 102, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 800, fill: '#2d6a00' }, fmt(S.done) + ' stored'));
        if (n < 2) svg.append(s('text', { x: 1090, y: 70, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: '#c4121e' }, n ? '“Is Alive? No!”' : 'BOTH DOWN'), s('text', { x: 1090, y: 92, 'text-anchor': 'middle', 'font-size': 12, fill: '#c4121e' }, n ? 'survivor raises the alarm' : 'logs wait in the queue'));
        box.replaceChildren(svg);
        kp.replaceChildren(h('div', { class: 'kpi', style: { flex: 1 } }, h('div', { class: 'v' }, fmt(n * CAP) + '/s'), h('div', { class: 'l' }, 'processing capacity')), h('div', { class: 'kpi ' + (S.lam > n * CAP ? 'hot' : 'good'), style: { flex: 1 } }, h('div', { class: 'v' }, S.lam > n * CAP ? 'growing' : 'stable'), h('div', { class: 'l' }, 'backlog trend')), h('div', { class: 'kpi', style: { flex: 1 } }, h('div', { class: 'v' }, fmt(S.q)), h('div', { class: 'l' }, 'waiting in queue')));
        ins.textContent = n === 2 ? 'Active / Active: both instances read the same queue and share the work. Each record goes to exactly one of them, so there are no duplicates.' : n === 1 ? (S.lam > CAP ? 'One instance cannot keep up with this load: the queue grows. Redundancy kept the service alive, but capacity matters too.' : 'One instance died, the other noticed (“Is Alive? No!”) and keeps going. Nothing was lost: the queue buffered the records.') : 'No instance alive: services still write to the queue, nothing is lost, and everything is processed after a restart. This is why a queue sits in front of the logging service.';
      }
      node.append(h('div', { class: 'flexcol', style: { gap: '8px' } }, h('div', { class: 'row' }, h('div', { style: { minWidth: '420px' } }, sl), h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Crash instance A.', onclick: () => { S.a[0] = 0; } }, 'Crash A'), h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Crash instance B.', onclick: () => { S.a[1] = 0; } }, 'Crash B'), h('button', { class: 'btn small', type: 'button', 'data-tip': 'Bring both instances back.', onclick: () => { S.a = [1, 1]; } }, 'Restart both')), box, kp, ins));
      draw();
      return { show() { if (!timer) timer = setInterval(tick, 100); }, hide() { clearInterval(timer); timer = 0; } };
    }
    // payment: pay-day simulator (one copy / two active / active+passive)
    const FAIL = 3, EMP = 250, SAL = 3000, PAY = EMP * SAL;
    const ROLES = { one: ['active', 'none'], aa: ['active', 'active'], ap: ['active', 'standby'] };
    const S = { mode: 'one', a: [1, 1], role: ROLES.one.slice(), down: [0, 0], files: null, fireT: -99, now: 0, done: [0, 0, 0, 0], crashedAtFire: false, last: null };
    const TASKS = [
      ['One copy only: crash it, then press “Month-end”.', 'The only copy is down when the timer fires: nobody is paid.'],
      ['Two active copies: press “Month-end”.', 'Both copies fire at the same time: everyone is paid twice.'],
      ['Active + passive: press “Month-end”.', 'Only the active copy writes the file: everyone is paid once.'],
      ['Active + passive: crash the ACTIVE copy, wait 3 s until the other says ACTIVE, press “Month-end”.', 'The standby has taken over: still paid exactly once.'],
    ];
    const box = h('div', { class: 'svgbox' }), result = h('div', { class: 'answer', style: { '--chip': 'var(--gold)', flex: '1.15' } }), tasks = h('div', { class: 'panel', style: { flex: '1' } });
    const modeSeg = seg([['one', '1 · One copy', 'A single Payment Interface: simple, but a single point of failure.'], ['aa', '2 · Two active copies', 'Two copies, both ready to run the monthly job (like the logging service).'], ['ap', '3 · Active + passive', 'Two copies, but only one runs the job. The other watches the “Is Alive” signal and takes over.']], 'one', (v) => setMode(v));
    function setMode(v) { S.mode = v; S.role = ROLES[v].slice(); S.a = [1, 1]; S.down = [0, 0]; S.files = null; S.last = null; modeSeg.set(v); draw(); }
    function tick() {
      S.now += .1;
      if (S.mode === 'ap') {
        for (let i = 0; i < 2; i++) { if (S.a[i]) S.down[i] = 0; else S.down[i] += .1; }
        if (S.role[0] === 'active' && !S.a[0] && S.a[1] && S.down[0] >= FAIL && S.role[1] === 'standby') S.role = ['dead', 'active'];
        if (S.role[1] === 'active' && !S.a[1] && S.a[0] && S.down[1] >= FAIL && S.role[0] === 'standby') S.role = ['active', 'dead'];
        if (S.a[0] && S.role[0] === 'dead') S.role[0] = S.role[1] === 'active' ? 'standby' : 'active';
        if (S.a[1] && S.role[1] === 'dead') S.role[1] = S.role[0] === 'active' ? 'standby' : 'active';
      }
      draw();
    }
    function fire() {
      const runners = [0, 1].filter((i) => S.a[i] && (S.role[i] === 'active'));
      const n = runners.length, anyDown = S.a.some((x, i) => !x && S.role[i] !== 'none');
      S.files = runners; S.fireT = S.now; S.last = { n, mode: S.mode };
      if (S.mode === 'one' && n === 0) S.done[0] = 1;
      if (S.mode === 'aa' && n === 2) S.done[1] = 1;
      if (S.mode === 'ap' && n === 1 && !anyDown) S.done[2] = 1;
      if (S.mode === 'ap' && n === 1 && anyDown) S.done[3] = 1;
      draw();
    }
    const T = (x, y, txt, o) => s('text', Object.assign({ x, y, 'text-anchor': 'middle', 'font-size': 13, fill: '#12182b' }, o || {}), txt);
    function draw() {
      const svg = s('svg', { viewBox: '0 0 1180 176', role: 'img', 'aria-label': 'Payment Interface: timer, instances, payment file, legacy payment system' });
      svg.append(s('defs', {}, s('marker', { id: 'pay-ar', viewBox: '0 0 10 10', refX: 9, refY: 5, markerUnits: 'userSpaceOnUse', markerWidth: 11, markerHeight: 11, orient: 'auto' }, s('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#7a8499' }))));
      const firing = S.now - S.fireT < 1.6;
      const arrow = (x1, y1, x2, y2, on, col) => svg.append(s('path', { d: `M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`, fill: 'none', stroke: on ? col : '#b7c0d2', 'stroke-width': on ? 3.5 : 2, 'stroke-dasharray': on ? '7 5' : null, class: on ? 'flow-edge' : null, 'marker-end': 'url(#pay-ar)' }));
      const ys = [2, 106], H = 68, nf = S.files == null ? null : S.files.length, dup = nf === 2;
      // timer
      svg.append(s('rect', { x: 14, y: 52, width: 160, height: 72, rx: 14, fill: firing ? '#fff0c9' : '#fff4de', stroke: '#F7A30F', 'stroke-width': firing ? 4 : 2.5 }), T(94, 80, '⏰ Timer', { 'font-size': 16, 'font-weight': 800 }), T(94, 99, 'wakes the job', { 'font-size': 12, fill: '#454B67' }), T(94, 114, 'once a month', { 'font-size': 12, fill: '#454B67' }));
      [0, 1].forEach((i) => {
        const x = 270, y = ys[i], r = S.role[i], a = S.a[i];
        if (r === 'none') { svg.append(s('rect', { x, y, width: 340, height: H, rx: 14, fill: 'none', stroke: '#c9d2e3', 'stroke-width': 2, 'stroke-dasharray': '6 5' }), T(x + 170, y + 40, 'no second copy in this design', { 'font-size': 13, fill: '#8a94ab' })); return; }
        const on = a && r === 'active';
        const g = s('g', { class: 'node-g ' + (a ? '' : 'dead'), tabindex: 0, 'data-tip': a ? 'Click to crash this copy.' : 'Click to restart this copy.', onpointerdown: () => { S.a[i] = S.a[i] ? 0 : 1; if (S.a[i] && S.mode === 'ap') { if (S.role[1 - i] !== 'active') S.role[i] = 'active'; else if (S.role[i] === 'dead') S.role[i] = 'standby'; } } });
        const status = !a ? 'CRASHED (click to restart)' : r === 'active' ? 'ACTIVE: runs the job' : S.down[1 - i] > 0 ? `STANDBY: peer silent ${S.down[1 - i].toFixed(1)} s…` : 'STANDBY: only watching';
        g.append(s('rect', { class: 'nb', x, y, width: 340, height: H, rx: 14, fill: on ? '#e6f5d6' : '#eef2f8', stroke: a ? (on ? '#2e8a00' : '#8fa0bd') : '#c4121e', 'stroke-width': 3 }), T(x + 170, y + 24, 'Payment Interface ' + 'AB'[i], { 'font-size': 16, 'font-weight': 800 }), T(x + 170, y + 43, status, { 'font-size': 13.5, 'font-weight': 800, fill: !a ? '#c4121e' : on ? '#2d6a00' : '#454B67' }), T(x + 170, y + 59, 'reads salaries from the database', { 'font-size': 11.5, fill: '#5a6380' }));
        svg.append(g);
        arrow(174, 88, x, y + H / 2, firing && on, '#F7A30F');
        arrow(x + 340, y + H / 2, 700, y + H / 2, firing && on, '#2e8a00');
      });
      if (S.mode !== 'one') svg.append(s('line', { x1: 440, y1: 70, x2: 440, y2: 106, stroke: S.mode === 'ap' ? '#c4121e' : '#c2cde0', 'stroke-width': 2.5, 'stroke-dasharray': '5 4', class: S.mode === 'ap' ? 'flow-edge' : null }), T(440, 92, S.mode === 'ap' ? '♥ Is Alive?' : 'no heartbeat', { 'font-size': 12, 'font-weight': 800, fill: S.mode === 'ap' ? '#c4121e' : '#8a94ab', stroke: '#F7F7F7', 'stroke-width': 5, 'paint-order': 'stroke' }));
      // payment files: one slot per copy, filled by the copy that wrote it
      [0, 1].forEach((k) => {
        const y = ys[k], wrote = nf != null && S.files.includes(k);
        const empty = () => svg.append(s('rect', { x: 700, y, width: 170, height: H, rx: 10, fill: 'none', stroke: '#d3dae8', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
        if (nf === 0 && k === 0) { svg.append(s('rect', { x: 700, y, width: 170, height: H, rx: 10, fill: '#fde4e6', stroke: '#c4121e', 'stroke-width': 2.5, 'stroke-dasharray': '6 4' }), T(785, y + 30, 'NO FILE', { 'font-weight': 800, fill: '#a40f1b', 'font-size': 15 }), T(785, y + 50, 'nobody wrote one', { fill: '#a40f1b', 'font-size': 12 })); return; }
        if (nf == null && k === 0) { empty(); svg.append(T(785, y + 38, 'no file yet', { fill: '#8a94ab', 'font-size': 13 })); return; }
        if (!wrote) { empty(); return; }
        svg.append(s('rect', { x: 700, y, width: 170, height: H, rx: 10, fill: dup ? '#fde4e6' : '#e6f5d6', stroke: dup ? '#c4121e' : '#2e8a00', 'stroke-width': 2.5 }), T(785, y + 28, '📄 payment file' + (dup ? ' ' + (k + 1) : ''), { 'font-weight': 800, 'font-size': 14 }), T(785, y + 50, '€' + fmt(PAY), { 'font-weight': 800, 'font-size': 15, fill: dup ? '#a40f1b' : '#2d6a00' }));
      });
      // legacy payment system
      const okc = nf == null ? '#8a94ab' : nf === 1 ? '#2e8a00' : '#c4121e';
      svg.append(arrowPath(870, ys[0] + H / 2, 1000, 84), arrowPath(870, ys[1] + H / 2, 1000, 96));
      svg.append(s('rect', { x: 1000, y: 52, width: 172, height: 72, rx: 14, fill: '#f0f0f0', stroke: okc, 'stroke-width': 3, 'stroke-dasharray': '7 4' }), T(1086, 76, 'Payment System', { 'font-size': 15, 'font-weight': 800 }), T(1086, 93, 'legacy, external (C++)', { 'font-size': 11.5, fill: '#454B67' }), T(1086, 113, nf == null ? 'reads the file once a month' : nf === 0 ? 'nothing to read' : nf === 1 ? 'pays €' + fmt(PAY) : 'pays €' + fmt(PAY * 2) + '!', { 'font-size': 12.5, 'font-weight': 800, fill: okc }));
      box.replaceChildren(svg);
      // result
      const L = S.last;
      let col = 'var(--gold)', head, body;
      if (!L) { head = 'Month-end has not happened yet'; body = h('span', {}, `Every month the timer wakes the Payment Interface. It reads ${EMP} salaries (about €${fmt(SAL)} each, a teaching figure) and writes ONE file for the legacy system. The rule: each employee is paid once. Not zero times, not twice.`); }
      else if (L.n === 0) { col = 'var(--red)'; head = 'Paid 0 times: nobody gets a salary'; body = h('span', {}, 'The timer fired but no copy was running, so no file was written. ', h('b', {}, 'A single copy is a single point of failure.')); }
      else if (L.n === 1) { col = 'var(--green)'; head = `Paid once: €${fmt(PAY)}`; body = h('span', {}, L.mode === 'ap' ? 'Exactly one copy wrote the file. If the active one dies, the standby notices after 3 s without “Is Alive” and takes over. ' : 'One copy wrote the file. Fine today, but try crashing it first. ', h('b', {}, L.mode === 'ap' ? 'Redundancy without duplication.' : '')); }
      else { col = 'var(--red)'; head = `Paid TWICE: €${fmt(PAY * 2)} sent, €${fmt(PAY)} too much`; body = h('span', {}, 'Both active copies woke up at the same moment and each wrote a file. ', h('b', {}, 'A job that must run once cannot be Active / Active.'), ' (Logging could: two copies sharing a queue never duplicate a record.)'); }
      result.style.setProperty('--chip', col); result.replaceChildren(h('div', { style: { font: '800 19px var(--font)', marginBottom: '4px' } }, head), body);
      tasks.replaceChildren(h('h3', {}, 'Try these four, in order'), ...TASKS.map(([a, b], k) => h('div', { style: { display: 'grid', gridTemplateColumns: '26px 1fr', gap: '6px', padding: '2px 0', borderBottom: '1px solid var(--border)' } }, h('span', { style: { font: '800 15px var(--font)', color: S.done[k] ? 'var(--good)' : 'var(--muted)' } }, S.done[k] ? '✓' : (k + 1) + '.'), h('div', { style: { fontSize: '13px', lineHeight: 1.3, color: S.done[k] ? 'var(--good)' : 'inherit' } }, a, S.done[k] ? h('div', { style: { fontWeight: 700 } }, b) : null))));
    }
    function arrowPath(x1, y1, x2, y2) { return s('path', { d: `M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`, fill: 'none', stroke: '#b7c0d2', 'stroke-width': 2, 'marker-end': 'url(#pay-ar)' }); }
    node.append(h('div', { class: 'flexcol', style: { gap: '8px' } },
      h('div', { class: 'row' }, h('b', {}, 'Design:'), modeSeg, h('button', { class: 'btn gold', type: 'button', 'data-tip': 'The month ends: the timer fires now.', onclick: fire }, 'Month-end: fire the timer ▶'), h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Restart every copy, clear the result and the four tasks.', onclick: () => { S.done = [0, 0, 0, 0]; setMode('one'); } }, 'Reset')),
      box, h('div', { class: 'row', style: { alignItems: 'stretch', gap: '10px', flexWrap: 'nowrap' } }, result, tasks)));
    draw();
    return { show() { if (!timer) timer = setInterval(tick, 100); }, hide() { clearInterval(timer); timer = 0; } };
  });
})();
