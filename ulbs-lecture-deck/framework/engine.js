/* Util + deck engine (scaling, navigation, notes, overview, tooltips, lazy widget mounting). */
const U = (() => {
  const SVGNS = 'http://www.w3.org/2000/svg';
  function apply(el, attrs) {
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) { p.startsWith('--') ? el.style.setProperty(p, val) : (el.style[p] = val); }
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  function add(el, kids) { for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); } }
  const h = (tag, attrs, ...kids) => { const el = document.createElement(tag); apply(el, attrs); add(el, kids); return el; };
  const s = (tag, attrs, ...kids) => { const el = document.createElementNS(SVGNS, tag); apply(el, attrs); add(el, kids); return el; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  // bytes helper: input in MB (decimal units, as on the slides)
  function size(mb) {
    const u = [['PB', 1e9], ['TB', 1e6], ['GB', 1e3], ['MB', 1], ['KB', 1e-3]];
    for (const [n, f] of u) if (mb >= f) { const v = mb / f; return fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : 2) + ' ' + n; }
    return fmt(mb * 1000, 1) + ' KB';
  }
  const money = (n) => '$' + fmt(n, n >= 100 ? 0 : 2);
  function slider(label, o, onchange, tip) {
    const out = h('output', {});
    const inp = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value, 'data-tip': tip || '' });
    const show = () => { out.textContent = o.format ? o.format(+inp.value) : inp.value; };
    inp.addEventListener('input', () => { show(); onchange(+inp.value); });
    show();
    const el = h('label', { class: 'slider' }, h('span', { class: 'lab' }, label, o.hint ? h('small', {}, o.hint) : null), inp, out);
    el.set = (v) => { inp.value = v; show(); }; el.get = () => +inp.value; el.input = inp;
    return el;
  }
  function seg(options, value, onchange) {
    const el = h('div', { class: 'seg', role: 'group' });
    const btns = options.map(([val, label, tip]) => h('button', { class: 'seg-btn', type: 'button', 'aria-pressed': String(val === value), 'data-tip': tip || '', onclick: () => set(val, true) }, label));
    btns.forEach((b) => el.append(b));
    let cur = value;
    function set(v, fire) { cur = v; options.forEach(([val], i) => btns[i].setAttribute('aria-pressed', String(val === v))); if (fire) onchange(v); }
    el.set = set; el.get = () => cur;
    return el;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(((window.DeckConfig || {}).storePrefix || 'deck.') + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(((window.DeckConfig || {}).storePrefix || 'deck.') + k, JSON.stringify(v)); } catch (e) { /* works without storage */ } },
  };
  return { h, s, clamp, fmt, size, money, slider, seg, store };
})();

(function () {
  const { h } = U;
  const SEGMENTS = (window.DeckConfig || {}).segments || [{ id: 'main', label: 'Slides', color: '--navy' }];
  const registry = {};
  const Deck = { SEGMENTS, data: window.DeckData || {}, store: U.store, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, register(n, f) { registry[n] = f; }, index: 0, slides: [], goto: null };
  window.Deck = Deck;
  const mounted = new Map();

  function mountWidgets(slide) {
    slide.querySelectorAll('[data-widget]').forEach((node) => {
      if (mounted.has(node)) return;
      const factory = registry[node.dataset.widget];
      if (!factory) { node.append(h('p', { class: 'warn' }, `Widget "${node.dataset.widget}" is not available.`)); return; }
      try { mounted.set(node, factory(node, node.dataset) || {}); }
      catch (err) { console.error('widget failed:', node.dataset.widget, err); node.append(h('p', { class: 'warn' }, `Widget "${node.dataset.widget}" failed: ${err.message}`)); mounted.set(node, {}); }
    });
  }

  function init() {
    if (Deck.reduced) document.documentElement.classList.add('reduced');
    const stage = document.getElementById('stage');
    const slides = Deck.slides = [...document.querySelectorAll('.slide')];
    const N = slides.length;
    const chip = document.getElementById('seg-chip'), counter = document.getElementById('counter'), progress = document.getElementById('progress-bar');
    const notesPanel = document.getElementById('notes'), notesBody = document.getElementById('notes-body');
    const segOf = (sl) => SEGMENTS.find((x) => x.id === sl.dataset.segment) || SEGMENTS[0];

    function show(i, opts = {}) {
      i = U.clamp(i, 0, N - 1);
      const prev = Deck.index;
      slides.forEach((s, k) => { s.classList.toggle('active', k === i); s.classList.toggle('past', k < i); s.setAttribute('aria-hidden', String(k !== i)); s.inert = k !== i; });
      Deck.index = i;
      const slide = slides[i], seg = segOf(slide);
      if (prev !== i) { slide.scrollTop = 0; slide.scrollLeft = 0; }
      mountWidgets(slide);
      if (prev !== i) slides[prev] && slides[prev].querySelectorAll('[data-widget]').forEach((n) => { const a = mounted.get(n); a && a.hide && a.hide(); });
      slide.querySelectorAll('[data-widget]').forEach((n) => { const a = mounted.get(n); a && a.show && a.show(); });
      chip.textContent = seg.chip || seg.label;
      chip.style.setProperty('--chip', `var(${seg.color})`);
      stage.style.setProperty('--chip', `var(${seg.color})`);
      counter.textContent = `${i + 1} / ${N}`;
      progress.style.width = `${(i / (N - 1)) * 100}%`;
      notesBody.innerHTML = '';
      const n = slide.querySelector('.notes');
      notesBody.append(h('h3', {}, slide.dataset.title || `Slide ${i + 1}`));
      if (n) notesBody.insertAdjacentHTML('beforeend', n.innerHTML); else notesBody.append(h('p', {}, 'No notes for this slide.'));
      if (!opts.silent) history.replaceState(null, '', '#' + (i + 1));
    }
    Deck.goto = show;
    Deck.gotoId = (id) => { const k = slides.findIndex((s) => s.dataset.id === id); if (k >= 0) show(k); };

    function fit() { const s = Math.min(innerWidth / 1280, innerHeight / 720); stage.style.transform = `translate(-50%, -50%) scale(${s})`; }
    addEventListener('resize', fit); fit();

    // content zoom (slides only; header/footer stay put). Persisted per browser.
    const slidesEl = document.querySelector('.slides'), zoomBtn = document.getElementById('btn-zoom-reset');
    const ZSTEPS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3];
    let zoom = Number(U.store.get('zoom', 1)); if (!ZSTEPS.includes(zoom)) zoom = 1;
    function setZoom(z) {
      zoom = z; slidesEl.style.setProperty('--z', z); slidesEl.classList.toggle('zoomed', z !== 1);
      zoomBtn.textContent = Math.round(z * 100) + '%'; U.store.set('zoom', z);
      const a = slides[Deck.index]; if (a) { a.scrollTop = 0; a.scrollLeft = 0; }
    }
    const stepZoom = (d) => setZoom(ZSTEPS[U.clamp(ZSTEPS.indexOf(zoom) + d, 0, ZSTEPS.length - 1)]);
    Deck.zoom = (z) => setZoom(z == null ? 1 : z);
    setZoom(zoom);
    addEventListener('wheel', (e) => { if (!e.ctrlKey || e.target.closest('.overlay')) return; e.preventDefault(); stepZoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });

    const overlays = { overview: document.getElementById('overview'), help: document.getElementById('help'), notes: notesPanel };
    function toggle(name, force) {
      const el = overlays[name];
      const on = force == null ? !el.classList.contains('open') : force;
      el.classList.toggle('open', on); el.setAttribute('aria-hidden', String(!on));
      if (name === 'notes') U.store.set('open.notes', on);
    }
    Deck.toggle = toggle;

    const ov = document.getElementById('overview-grid');
    let lastSeg = null;
    slides.forEach((s, k) => {
      const seg = segOf(s);
      if (seg.id !== lastSeg) { ov.append(h('h4', { style: { '--chip': `var(${seg.color})` } }, seg.label)); lastSeg = seg.id; }
      ov.append(h('button', { class: 'ov-tile', type: 'button', 'data-tip': 'Jump to this slide.', style: { '--chip': `var(${seg.color})` }, onclick: () => { toggle('overview', false); show(k); } }, h('b', {}, String(k + 1)), h('span', {}, s.dataset.title || '')));
    });

    // tooltips: any element with data-tip
    const tipEl = document.getElementById('tip');
    let tipTimer = null, tipFor = null;
    function showTip(el) {
      const text = el.dataset.tip; if (!text) return;
      tipFor = el; tipEl.textContent = text; tipEl.classList.add('on');
      const sr = stage.getBoundingClientRect(), k = sr.width / 1280, r = el.getBoundingClientRect();
      const x0 = (r.left - sr.left) / k, y0 = (r.top - sr.top) / k, w = tipEl.offsetWidth, hgt = tipEl.offsetHeight;
      const x = U.clamp(x0 + (r.width / k) / 2 - w / 2, 8, 1272 - w); let y = y0 - hgt - 10;
      if (y < 58) y = (r.bottom - sr.top) / k + 10;
      tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
    }
    function hideTip() { clearTimeout(tipTimer); tipEl.classList.remove('on'); tipFor = null; }
    const closestTip = (e) => (e.target.closest ? e.target.closest('[data-tip]') : null);
    document.addEventListener('pointerover', (e) => { const el = closestTip(e); if (!el || !el.dataset.tip || el === tipFor) return; hideTip(); tipTimer = setTimeout(() => showTip(el), 220); });
    document.addEventListener('pointerout', (e) => { if (closestTip(e)) hideTip(); });
    document.addEventListener('pointerdown', hideTip);
    document.addEventListener('focusin', (e) => { const el = closestTip(e); if (el && e.target.matches(':focus-visible')) showTip(el); });
    document.addEventListener('focusout', hideTip);
    slides.forEach((sl) => sl.addEventListener('transitionstart', hideTip));

    const bind = (id, fn) => document.getElementById(id).addEventListener('click', fn);
    bind('btn-prev', () => show(Deck.index - 1)); bind('btn-next', () => show(Deck.index + 1));
    bind('btn-overview', () => toggle('overview')); bind('btn-notes', () => toggle('notes'));
    bind('btn-zoom-in', () => stepZoom(1)); bind('btn-zoom-out', () => stepZoom(-1)); bind('btn-zoom-reset', () => setZoom(1));
    bind('btn-help', () => toggle('help')); bind('btn-full', fullscreen);
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.close, false)));
    function fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }

    addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && ['=', '+', '-', '0'].includes(e.key)) { e.preventDefault(); if (e.key === '0') setZoom(1); else stepZoom(e.key === '-' ? -1 : 1); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable;
      if (typing && e.key !== 'Escape') { if (!(tag === 'input' && e.target.type === 'range' && (e.key === 'PageDown' || e.key === 'PageUp'))) return; }
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': show(Deck.index + 1); break;
        case ' ': if (tag === 'button' || tag === 'a') return; show(Deck.index + (e.shiftKey ? -1 : 1)); break;
        case 'ArrowLeft': case 'PageUp': show(Deck.index - 1); break;
        case 'Home': show(0); break; case 'End': show(N - 1); break;
        case 'g': case 'G': toggle('overview'); break; case 'n': case 'N': toggle('notes'); break;
        case '+': case '=': stepZoom(1); break; case '-': case '_': stepZoom(-1); break; case '0': setZoom(1); break;
        case 'f': case 'F': fullscreen(); break; case '?': toggle('help'); break;
        case 'Escape': Object.keys(overlays).forEach((k) => { if (k !== 'notes') toggle(k, false); }); break;
        default: return;
      }
      e.preventDefault();
    });
    addEventListener('pointerup', () => { const a = document.activeElement; if (a && a.type === 'range') a.blur(); });

    if (U.store.get('open.notes', false)) toggle('notes', true);
    const start = parseInt(location.hash.slice(1), 10);
    show(Number.isFinite(start) ? start - 1 : 0, { silent: true });
    addEventListener('hashchange', () => { const k = parseInt(location.hash.slice(1), 10); if (Number.isFinite(k) && k - 1 !== Deck.index) show(k - 1, { silent: true }); });
    document.documentElement.classList.add('ready');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
