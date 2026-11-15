#!/usr/bin/env node
/* Headless check of a built deck.
 *   node test-deck.js <url> [shotsDir] [--interact]
 * Per slide: overflow beyond the 1280x720 stage, widget load failures, console errors, screenshot.
 * --interact additionally clicks every control of every slide (buttons, segments, heat cells, nodes)
 * with a *slow* press (mouse down, 250 ms, up) so widgets that redraw on a timer prove they keep the click.
 * Env (all optional): PLAYWRIGHT_PATH (playwright module dir), CHROME_PATH (browser executable).
 * Without them: playwright is looked up from the current dir, the script dir and NODE_PATH,
 * and the browser is the one Playwright installed (`npx playwright install chromium`).
 */
const fs = require('fs');
function loadPlaywright() {
  if (process.env.PLAYWRIGHT_PATH) return require(process.env.PLAYWRIGHT_PATH);
  try { return require(require.resolve('playwright', { paths: [process.cwd(), __dirname] })); }
  catch (_) {
    console.error('playwright not found. Run from a folder where it is installed (node_modules/playwright), or set PLAYWRIGHT_PATH=<dir of the playwright module>, or install it: npm i playwright && npx playwright install chromium');
    process.exit(2);
  }
}
const { chromium } = loadPlaywright();
const CHROME = process.env.CHROME_PATH || '';
const url = process.argv[2]; const shots = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
const interact = process.argv.includes('--interact');
if (!url) { console.error('usage: node test-deck.js <url> [shotsDir] [--interact]'); process.exit(2); }
if (shots) fs.mkdirSync(shots, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: CHROME && fs.existsSync(CHROME) ? CHROME : undefined });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  await p.goto(url); await p.waitForTimeout(500);
  const N = await p.evaluate(() => Deck.slides.length);
  let bad = 0;
  for (let i = 0; i < N; i++) {
    await p.evaluate((k) => Deck.goto(k), i); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const s = Deck.slides[Deck.index], sr = s.getBoundingClientRect(), over = [];
      s.querySelectorAll('*').forEach((el) => {
        if (el.closest('.notes') || (el.closest('svg') && el.tagName !== 'svg')) return;
        const r = el.getBoundingClientRect();
        if (r.width && (r.bottom > sr.bottom + 1 || r.right > sr.right + 1)) over.push(el.tagName + '.' + (el.className.baseVal ?? el.className) + ' b=' + Math.round(r.bottom - sr.bottom) + ' r=' + Math.round(r.right - sr.right));
      });
      return { id: s.dataset.id, scroll: s.scrollHeight - s.clientHeight, over: over.slice(0, 3), warn: [...s.querySelectorAll('p.warn')].map((w) => w.textContent).filter((x) => /^Widget "/.test(x)).join('|') };
    });
    if (r.scroll > 0 || r.over.length || r.warn) { bad++; console.log('PROBLEM', i + 1, JSON.stringify(r)); }
    if (interact) {
      const sel = '.slide.active .btn:not([disabled]), .slide.active .seg-btn, .slide.active .q-btn, .slide.active .heat, .slide.active .node-g, .slide.active .ep, .slide.active .hl, .slide.active .chk input';
      const n = Math.min(await p.locator(sel).count(), 40);
      for (let k = 0; k < n; k++) {
        const bb = await p.evaluate(([q, k]) => { const e = document.querySelectorAll(q)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; }, [sel, k]);
        if (!bb) continue;
        await p.mouse.move(bb.x, bb.y); await p.mouse.down(); await p.waitForTimeout(250); await p.mouse.up(); await p.waitForTimeout(40);
      }
    }
    if (shots) await p.screenshot({ path: `${shots}/s${String(i + 1).padStart(2, '0')}_${r.id}.png` });
  }
  // keyboard overlays
  for (const k of ['n', 'g', '?', 'Escape']) await p.keyboard.press(k);
  console.log(`${N} slides, ${bad} with problems, console errors: ${JSON.stringify(errs)}`);
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
