/* Week 5 widgets (content embedded): pipeline simulator, redundancy lab */
(function () {
  const { h, s, fmt, size, money, slider, seg } = U;

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
