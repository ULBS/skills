#!/usr/bin/env python3
"""Assemble one portable HTML slide deck.

Usage:  python3 -I build.py <project_dir> [out.html]

<project_dir> holds:
  deck.json     title, headerTitle, segments, widgets ... (see examples/week05/deck.json)
  slides.html   the <section class="slide"> elements ({{LOGO}} is replaced by the logo data URI)
  data.js       optional, fills window.DeckData (matrix, diagram, sorter, brief, checklist ...)
  widgets/*.js  optional, project-specific widgets (added after the library widgets)
  assets/logo.png, assets/favicon.ico   optional, override the default ULBS logo / favicon
"""
import base64, json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent          # .../framework
SKILL = HERE.parent
proj = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else proj / 'out.html'
cfg = json.loads((proj / 'deck.json').read_text(encoding='utf-8'))

def asset(name, default):
    p = proj / 'assets' / name
    return p if p.exists() else HERE / 'assets' / default

b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
logo_uri = 'data:image/png;base64,' + b64(asset('logo.png', 'LOGO-ULBS_orizontal_negativ.png'))
fav_uri = 'data:image/x-icon;base64,' + b64(asset('favicon.ico', 'favicon.ico'))

def widget_file(name):
    for d in (proj / 'widgets', SKILL / 'widgets'):
        if (d / f'{name}.js').exists():
            return d / f'{name}.js'
    sys.exit(f'widget file not found: {name}')

parts = [HERE / 'engine.js']
if (proj / 'data.js').exists():
    parts.append(proj / 'data.js')
listed = [widget_file(n) for n in cfg.get('widgets', [])]
parts += listed
extra = sorted(p for p in (proj / 'widgets').glob('*.js')) if (proj / 'widgets').exists() else []
parts += [p for p in extra if p not in listed]

prelude = 'window.DeckConfig = %s;\nwindow.DeckData = {};\n' % json.dumps(cfg, ensure_ascii=False)
js = prelude + '\n'.join(p.read_text(encoding='utf-8') for p in parts)
css = (HERE / 'style.css').read_text(encoding='utf-8') + ('\n' + (proj / 'extra.css').read_text(encoding='utf-8') if (proj / 'extra.css').exists() else '')
slides = (proj / 'slides.html').read_text(encoding='utf-8').replace('{{LOGO}}', logo_uri)
count = len(re.findall(r'<section class="slide[ "]', slides))
first_seg = cfg['segments'][0]

html = (HERE / 'shell.html').read_text(encoding='utf-8')
for k, v in {
    'LANG': cfg.get('lang', 'en'), 'TITLE': cfg['title'], 'DESCRIPTION': cfg.get('description', '').replace('"', '&quot;'),
    'HEADER_TITLE': cfg.get('headerTitle', cfg['title']), 'FIRST_CHIP': first_seg.get('chip') or first_seg['label'],
    'FOOTER': cfg.get('footerHtml', ''), 'HELP_NOTE': cfg.get('helpNote', ''), 'COUNT': str(count),
    'FAVICON': fav_uri, 'LOGO_URI': logo_uri,
}.items():
    html = html.replace('{{%s}}' % k, v)
for k, v in {'CSS': css, 'JS': js, 'SLIDES': slides}.items():       # big payloads last
    html = html.replace('{{%s}}' % k, v)
out.write_text(html, encoding='utf-8')
print(f'wrote {out}  {len(html) // 1024} KB  {count} slides  widgets: {[p.stem for p in parts[1:]]}')
