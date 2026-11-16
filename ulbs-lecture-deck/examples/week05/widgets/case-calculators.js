/* Week 5 widgets (content embedded): fleet, volume, retention, cloud cost */
(function () {
  const { h, s, fmt, size, money, slider, seg } = U;

  // ---------------------------------------------------------------- fleet
  Deck.register('fleet', (node) => {
    const W = 600, H = 190, PER = 0.7;
    let fleet = 10000, running = false, raf = 0, last = 0;
    const cv = h('canvas', { width: W, height: H, style: { width: '100%', background: '#0e1b36', borderRadius: '12px' } });
    const ctx = cv.getContext('2d');
    const gate = { x: W - 54, y: H / 2 };
    let dots = [], pings = [];
    const mk = (n) => { dots = Array.from({ length: n }, () => ({ x: Math.random() * (W - 120) + 10, y: Math.random() * (H - 20) + 10, a: Math.random() * 6.28, v: 6 + Math.random() * 14 })); };
    const k = { v: h('div', { class: 'v' }), m: h('div', { class: 'v' }), b: h('div', { class: 'v' }), d: h('div', { class: 'v' }) };
    const kp = (l, e) => h('div', { class: 'kpi' }, e, h('div', { class: 'l' }, l));
    const sl = slider('Vehicles on the road', { min: 1000, max: 250000, step: 1000, value: fleet, format: (v) => fmt(v) }, (v) => { fleet = v; upd(); }, 'Number of vehicles sending telemetry.');
    const note = h('p', { class: 'small' });
    function upd() {
      const mps = fleet * PER;
      k.v.textContent = fmt(fleet); k.m.textContent = fmt(mps); k.b.textContent = size(mps / 1000) + '/s'; k.d.textContent = size(mps * 86400 / 1000);
      note.innerHTML = fleet <= 12000 ? 'Slide numbers: <b>7,000 msgs/s</b> for roughly 10,000 vehicles, so each vehicle sends about <b>0.7 messages per second</b>.' : `At <b>${fmt(fleet)}</b> vehicles the same rule gives <b>${fmt(mps)} msgs/s</b>. The client said 7,000 msgs/s: a good architect asks <i>which</i> fleet size to design for.`;
      const n = U.clamp(Math.round(fleet / 1000), 10, 220); if (dots.length !== n) mk(n);
    }
    function frame(t) {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#16294d'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#223a6a'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const visualRate = Math.min(fleet * PER / 25, 260);
      const pPing = visualRate / dots.length * dt;
      for (const d of dots) {
        d.a += (Math.random() - .5) * 0.6; d.x += Math.cos(d.a) * d.v * dt; d.y += Math.sin(d.a) * d.v * dt;
        if (d.x < 6 || d.x > W - 110) { d.a = Math.PI - d.a; d.x = U.clamp(d.x, 6, W - 110); }
        if (d.y < 6 || d.y > H - 6) { d.a = -d.a; d.y = U.clamp(d.y, 6, H - 6); }
        ctx.fillStyle = '#8fbcff'; ctx.fillRect(d.x - 2, d.y - 2, 4, 4);
        if (Math.random() < pPing) pings.push({ x: d.x, y: d.y, t: 0 });
      }
      pings = pings.filter((p) => (p.t += dt) < 0.7);
      ctx.fillStyle = '#F7A30F';
      for (const p of pings) { const f = p.t / 0.7; ctx.globalAlpha = 1 - f * .5; ctx.beginPath(); ctx.arc(p.x + (gate.x - p.x) * f, p.y + (gate.y - p.y) * f, 2.2, 0, 6.28); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#10ADB6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gate.x, gate.y, 26, 0, 6.28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 11px Open Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GATEWAY', gate.x, gate.y + 4);
      raf = requestAnimationFrame(frame);
    }
    node.append(h('div', { class: 'flexcol' }, cv, h('div', { class: 'row' }, kp('vehicles', k.v), kp('messages / s', k.m), kp('data rate', k.b), kp('per day', k.d)), sl,
      h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { sl.set(10000); fleet = 10000; upd(); }, 'data-tip': 'The fleet on the road today.' }, 'Today: 10,000'), h('button', { class: 'btn small gold', type: 'button', onclick: () => { sl.set(200000); fleet = 200000; upd(); }, 'data-tip': 'The fleet the company expects by the end of the year.' }, 'End of year: 200,000')), note));
    upd();
    return { show() { if (running) return; running = true; last = performance.now(); if (Deck.reduced) { frame(last); running = false; } else raf = requestAnimationFrame(frame); }, hide() { running = false; cancelAnimationFrame(raf); } };
  });

  // ---------------------------------------------------------------- volume
  Deck.register('volume', (node, ds) => {
    const kind = ds.case || 'muscar';
    const out = h('div', { class: 'flexcol' });
    const sliders = h('div', { class: 'flexcol', style: { gap: '8px' } });
    const state = {};
    const mk = (key, label, o, tip) => { state[key] = o.value; const sl = slider(label, o, (v) => { state[key] = v; draw(); }, tip); sl.key = key; sliders.append(sl); return sl; };
    let slidersList = [];
    const tile = (l, v, cls) => h('div', { class: 'kpi ' + (cls || ''), style: { flex: '1' } }, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l));
    const reset = (vals) => { slidersList.forEach((sl) => { sl.set(vals[sl.key]); state[sl.key] = vals[sl.key]; }); draw(); };
    let draw, presets;
    if (kind === 'muscar') {
      slidersList = [
        mk('fleet', 'Vehicles', { min: 1000, max: 200000, step: 1000, value: 10000, format: fmt }, 'Vehicles sending telemetry. The case uses 7,000 messages per second, which is 0.7 per vehicle for 10,000 vehicles.'),
        mk('kb', 'Message size', { min: 0.1, max: 10, step: 0.1, value: 1, format: (v) => v.toFixed(1) + ' KB' }, 'Average message size in kilobytes.'),
        mk('days', 'Retention', { min: 1, max: 365, step: 1, value: 7, format: (v) => v + ' d' }, 'How many days of messages stay in the operational database.'),
      ];
      presets = { 'The slide (10,000 vehicles, 1 KB, 1 week)': { fleet: 10000, kb: 1, days: 7 }, 'Fleet grows 20×': { fleet: 200000, kb: 1, days: 7 }, 'Keep a full year hot': { fleet: 10000, kb: 1, days: 365 } };
      draw = () => {
        const mps = state.fleet * 0.7, mbs = mps * state.kb / 1000, hr = mbs * 3600, day = mbs * 86400, wk = day * state.days, yr = day * 365;
        const over = wk > 4.4e6;
        out.replaceChildren(
          h('div', { class: 'row' }, tile('messages / s', fmt(mps)), tile('per second', size(mbs)), tile('per hour', size(hr)), tile('per day', size(day), 'hot')),
          h('div', { class: 'row' }, tile(`kept ${state.days} day${state.days > 1 ? 's' : ''} (operational DB)`, size(wk), over ? 'hot' : 'good'), tile('per year', size(yr), 'hot')),
          h('div', {}, h('div', { class: 'small' }, `Operational DB budget: about 4 TB in the case study (605 GB × 7 days = 4.2 TB). Now: ${(wk / 4.23e6 * 100).toFixed(0)}% of that.`), h('div', { class: 'meter' }, h('div', { style: { width: Math.min(100, wk / 4.4e6 * 100) + '%', background: over ? 'var(--red)' : 'var(--teal)' } }))),
          h('div', { class: 'answer', style: { '--chip': over ? 'var(--red)' : 'var(--teal)' } }, over ? h('span', {}, h('b', {}, 'Over budget. '), 'Either keep fewer days hot (retention), archive the rest, or plan a much bigger database.') : h('span', {}, h('b', {}, 'That’s a lot! '), `Even the one-week window is ${size(wk)}. The year is ${size(yr)}: it cannot all sit in the fast database.`)));
      };
    } else if (kind === 'dunderly') {
      slidersList = [
        mk('emp', 'Employees', { min: 50, max: 1000, step: 10, value: 500, format: fmt }, 'Number of employees. 250 today, 500 expected in five years.'),
        mk('docs', 'Documents each', { min: 0, max: 30, step: 1, value: 10, format: (v) => v }, 'Scanned documents per employee (contract, reviews, …).'),
        mk('mb', 'Document size', { min: 0.5, max: 20, step: 0.5, value: 5, format: (v) => v.toFixed(1) + ' MB' }, 'Size of one scanned document.'),
      ];
      presets = { 'In 5 years: 500 employees': { emp: 500, docs: 10, mb: 5 }, 'Today: 250 employees': { emp: 250, docs: 10, mb: 5 }, 'High-resolution scans (20 MB)': { emp: 500, docs: 10, mb: 20 } };
      draw = () => {
        const per = 1 + state.docs * state.mb, tot = per * state.emp, docShare = state.docs * state.mb / per * 100;
        out.replaceChildren(
          h('div', { class: 'row' }, tile('1 employee record', '1 MB'), tile(`${state.docs} documents`, size(state.docs * state.mb)), tile('per employee', size(per)), tile('total storage', size(tot), 'hot')),
          h('div', {}, h('div', { class: 'small' }, `Documents are ${docShare.toFixed(0)}% of the data. The rest is the actual employee record.`), h('div', { class: 'meter' }, h('div', { style: { width: docShare + '%', background: 'var(--gold)' } }))),
          h('div', { class: 'answer', style: { '--chip': 'var(--gold)' } }, h('b', {}, 'Not a lot, but… '), `${size(tot)} fits on a laptop. What matters is where the scanned documents live: that choice comes later.`),
          h('div', { class: 'small' }, `Compare with Muscar: its fleet produces ${size(604800)} every day, so Dunderly’s five-year total (${size(25500)}) is written about every ${Math.round(25500 / 604800 * 1440)} minutes.`));
      };
    } else {
      slidersList = [
        mk('users', 'Users', { min: 100, max: 50000, step: 100, value: 10000, format: fmt }, 'Number of generated users. The lab default is 10,000.'),
        mk('posts', 'Posts per user', { min: 10, max: 20, step: 1, value: 15, format: (v) => v + ' avg' }, 'The lab: each user has 10 to 20 posts (average 15).'),
        mk('com', 'Comments per post', { min: 0, max: 10, step: 1, value: 5, format: (v) => v + ' avg' }, 'The lab: 0 to 10 comments per post (average 5).'),
        mk('likes', 'Likes per post', { min: 0, max: 20, step: 1, value: 10, format: (v) => v + ' avg' }, 'The lab: 0 to 20 likes per post (average 10).'),
      ];
      presets = { 'Lab default': { users: 10000, posts: 15, com: 5, likes: 10 }, '5× more users': { users: 50000, posts: 15, com: 5, likes: 10 }, 'Quiet network': { users: 10000, posts: 10, com: 1, likes: 2 } };
      draw = () => {
        const p = state.users * state.posts, c = p * state.com, l = p * state.likes, rows = state.users + p + c + l;
        const bytes = state.users * 250 + p * 220 + c * 160 + l * 40;
        out.replaceChildren(
          h('div', { class: 'row' }, tile('users', fmt(state.users)), tile('posts', fmt(p)), tile('comments', fmt(c)), tile('likes', fmt(l), 'hot')),
          h('div', { class: 'row' }, tile('rows in total', fmt(rows), 'hot'), tile('estimated file size', size(bytes / 1e6)), tile('likes : posts', (l / Math.max(1, p)).toFixed(1) + ' : 1')),
          h('div', { class: 'answer', style: { '--chip': 'var(--blue)' } }, h('b', {}, 'Rough estimate, not a measurement. '), 'Assumed bytes per row: user 250, post 220, comment 160, like 40. Check the real number with ', h('code', {}, 'ls -lh instakill.db'), ' after you run your populate script. The row counts are what the queries must scan: that is why the lab says “use SQL for the statistics”.'));
      };
    }
    const chips = h('div', { class: 'row' }, Object.entries(presets).map(([n, v]) => h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Load this scenario into the sliders.', onclick: () => reset(v) }, n)));
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '1fr 1.25fr' } }, h('div', { class: 'panel' }, h('h3', {}, 'Change the inputs'), sliders, chips), out));
    draw();
  });

  // ---------------------------------------------------------------- retention
  Deck.register('retention', (node) => {
    const PER_DAY = 604.8; // GB per day of telemetry
    const st = { days: 7, mode: 'archive', today: 1 };
    const cal = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: '3px' } });
    const info = h('div', { class: 'flexcol' });
    const sl = slider('Retention period', { min: 1, max: 30, step: 1, value: 7, format: (v) => v + ' d' }, (v) => { st.days = v; draw(); }, 'How many days of data stay in the fast operational database.');
    const modeSeg = seg([['archive', 'Move to archive', 'After the retention period, copy the data to cheap storage, then delete it from the operational DB.'], ['delete', 'Delete', 'After the retention period, throw the data away.']], 'archive', (v) => { st.mode = v; draw(); });
    const adv = h('button', { class: 'btn small', type: 'button', 'data-tip': 'Advance the calendar by one day: a new day arrives on the right, and the oldest hot day leaves the operational database.', onclick: () => { st.today++; draw(); } }, 'Next day ▶');
    const adv7 = h('button', { class: 'btn small', type: 'button', 'data-tip': 'Advance the calendar by seven days.', onclick: () => { st.today += 7; draw(); } }, '+7 days ▶▶');
    const rst = h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Back to day 1 with the default one-week retention and “Move to archive”.', onclick: () => { st.days = 7; st.mode = 'archive'; st.today = 1; sl.set(7); modeSeg.set('archive'); draw(); } }, 'Reset to day 1');
    function draw() {
      cal.replaceChildren();
      const first = Math.max(1, st.today - 29);
      for (let k = 0; k < 30; k++) {
        const d = first + k;
        if (d > st.today) { cal.append(h('div', { title: 'Future day', style: { height: '38px', borderRadius: '5px', border: '1.5px dashed var(--border)', color: '#aab4c8', font: '700 10px var(--mono)', display: 'grid', placeItems: 'center' } }, d)); continue; }
        const age = st.today - d, hot = age < st.days, isToday = d === st.today;
        cal.append(h('div', { title: `Day ${d}${isToday ? ' (today)' : ''}`, style: { height: '38px', borderRadius: '5px', background: hot ? 'var(--teal)' : (st.mode === 'archive' ? 'var(--gold)' : '#cfd6e4'), color: '#fff', font: '700 10px var(--mono)', display: 'grid', placeItems: 'center', outline: isToday ? '3px solid var(--navy)' : 'none', outlineOffset: '1px', textDecoration: !hot && st.mode === 'delete' ? 'line-through' : 'none' } }, d));
      }
      const hotDays = Math.min(st.days, st.today), oldDays = Math.max(0, st.today - st.days);
      info.replaceChildren(
        h('div', { class: 'row' },
          h('div', { class: 'kpi good', style: { flex: 1 } }, h('div', { class: 'v' }, size(hotDays * PER_DAY * 1000)), h('div', { class: 'l' }, `operational DB (fast): ${hotDays} day${hotDays === 1 ? '' : 's'}`)),
          h('div', { class: 'kpi', style: { flex: 1 } }, h('div', { class: 'v' }, st.mode === 'archive' ? size(oldDays * PER_DAY * 1000) : '0 GB'), h('div', { class: 'l' }, st.mode === 'archive' ? `archive: ${oldDays} day${oldDays === 1 ? '' : 's'}` : `archive: nothing kept (${oldDays} deleted)`))),
        h('div', { class: 'answer', style: { '--chip': 'var(--teal)' } }, st.today <= st.days
          ? h('span', {}, h('b', {}, `Day ${st.today}: nothing is old enough to leave yet. `), `Everything stays in the fast database until it is more than ${st.days} day${st.days === 1 ? '' : 's'} old. Press “Next day” or “+7 days”.`)
          : st.mode === 'archive'
            ? h('span', {}, h('b', {}, 'The newest days stay fast; older days move. '), 'Retention keeps the database from exploding and queries fast. Old days are not lost: they are moved (ETL) to the archive and to the data warehouse, where the BI tool uses them.')
            : h('span', {}, h('b', {}, 'Deleting is allowed only if nobody needs history. '), 'Muscar needs trends and forecasts, so “forever” for aggregated data means deleting is not an option here.')));
    }
    node.append(h('div', { class: 'flexcol' },
      h('div', { class: 'row' }, h('div', { style: { flex: 1, minWidth: '380px' } }, sl), h('span', { class: 'small' }, 'After the period:'), modeSeg, adv, adv7, rst),
      h('div', { class: 'row small' }, h('span', { class: 'pill teal' }, '■ operational (fast, small)'), h('span', { class: 'pill gold' }, '■ archive (cheap, slow)'), h('span', { class: 'pill' }, '1 square = 1 day, newest on the right (outlined = today)')),
      cal, info,
      h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Data type'), h('th', {}, 'Used for'), h('th', {}, 'Retention')),
        h('tr', {}, h('td', {}, h('b', {}, 'Operational')), h('td', {}, 'Monitor real-time data from cars. Performance is critical.'), h('td', {}, '1 week')),
        h('tr', {}, h('td', {}, h('b', {}, 'Aggregated')), h('td', {}, 'Reports, BI. Not real-time, can be slower.'), h('td', {}, 'Forever')))));
    draw();
  });

  // ---------------------------------------------------------------- cloud cost
  Deck.register('cloud', (node) => {
    const TIERS = [['Premium', [.15, .15, .15]], ['Hot', [.018, .0173, .0166]], ['Cool', [.01, .01, .01]], ['Cold', [.0036, .0036, .0036]], ['Archive', [.002, .002, .002]]];
    const NOTE = { Premium: 'low latency, for databases and hot paths', Hot: 'frequent access', Cool: 'infrequent access', Cold: 'rare access', Archive: 'almost never read, hours to retrieve' };
    function cost(tb, p) { const gb = tb * 1000; const a = Math.min(gb, 50000), b = Math.min(Math.max(gb - 50000, 0), 450000), c = Math.max(gb - 500000, 0); return a * p[0] + b * p[1] + c * p[2]; }
    let tb = 221, sel = 'Archive';
    const bars = h('div', { class: 'flexcol', style: { gap: '6px' } }), res = h('div', { class: 'flexcol' });
    const sl = slider('Data stored', { min: 1, max: 500, step: 1, value: 221, format: (v) => v + ' TB' }, (v) => { tb = v; draw(); }, 'Terabytes in storage. One year of Muscar telemetry is about 221 TB.');
    const btnYear = h('button', { class: 'btn small gold', type: 'button', 'data-tip': 'Set the slider to one year of Muscar telemetry.', onclick: () => { sl.set(221); tb = 221; draw(); } }, 'One year of telemetry: 221 TB');
    function draw() {
      bars.replaceChildren(); const mx = cost(tb, TIERS[0][1]) || 1;
      TIERS.forEach(([n, p]) => {
        const c = cost(tb, p);
        bars.append(h('button', { class: 'q-btn' + (n === sel ? ' asked' : ''), type: 'button', style: { padding: '5px 10px' }, 'data-tip': 'Select this tier for the details on the right.', onclick: () => { sel = n; draw(); } },
          h('div', { class: 'opt-row', style: { gridTemplateColumns: '90px 1fr 110px' } }, h('b', {}, n), h('div', { class: 'meter' }, h('div', { style: { width: Math.max(1.5, c / mx * 100) + '%', background: n === 'Archive' ? 'var(--gold)' : 'var(--navy)' } })), h('span', { class: 'mono', style: { textAlign: 'right' } }, money(c) + '/mo'))));
      });
      const p = TIERS.find((t) => t[0] === sel)[1], m = cost(tb, p);
      let y1 = 0; for (let k = 1; k <= 12; k++) y1 += cost(tb / 12 * k, p);
      res.replaceChildren(
        h('div', { class: 'row' }, h('div', { class: 'kpi', style: { flex: 1 } }, h('div', { class: 'v' }, money(m)), h('div', { class: 'l' }, `per month, ${sel}`)), h('div', { class: 'kpi', style: { flex: 1 } }, h('div', { class: 'v' }, money(m * 12)), h('div', { class: 'l' }, 'per year if all data sits there'))),
        h('div', { class: 'kpi good' }, h('div', { class: 'v' }, money(y1)), h('div', { class: 'l' }, 'first-year bill if data arrives evenly (month 1: 1/12 of it, month 12: all of it)')),
        h('div', { class: 'answer', style: { '--chip': 'var(--gold)' } }, h('b', {}, sel + ': '), NOTE[sel] + '. ', sel === 'Archive' ? 'This is what the archive needs: huge, rarely read, no fast retrieval, lowest cost.' : sel === 'Premium' ? 'Same data costs ' + fmt(cost(tb, TIERS[0][1]) / Math.max(1, cost(tb, TIERS[4][1]))) + '× the Archive tier.' : 'Pick the cheapest tier whose access speed the use case can live with.'));
    }
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '1.15fr 1fr' } }, h('div', { class: 'flexcol' }, h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, sl), btnYear), bars, h('div', { class: 'small' }, 'Pay-as-you-go prices, USD per GB per month: first 50 TB / next 450 TB / over 500 TB. Storage cost only: reads and transfers are extra.')), res));
    draw();
  });
})();
