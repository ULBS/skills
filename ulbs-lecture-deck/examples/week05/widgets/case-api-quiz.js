/* Week 5 widgets (content embedded): API sandbox, layers, BI sorting, blob storage chooser, load model */
(function () {
  const { h, s, fmt, size, money, slider, seg } = U;

  // ================================================================ API sandbox
  const EPS = {
    telemetry: [
      { m: 'GET', p: '/api/v1/telemetry/errors', d: 'Get latest errors for all cars', codes: [200] },
      { m: 'GET', p: '/api/v1/telemetry/{carId}', ex: '/api/v1/telemetry/101', d: 'Get latest telemetry for a specific car', codes: [200, 404] },
      { m: 'GET', p: '/api/v1/telemetry/errors/{carId}', ex: '/api/v1/telemetry/errors/102', d: 'Get latest errors for a specific car', codes: [200, 404] },
    ],
    employees: [
      { m: 'GET', p: '/api/v1/employee/{id}', ex: '/api/v1/employee/1', d: 'Get employee details by ID', codes: [200, 404] },
      { m: 'GET', p: '/api/v1/employees?name=…', ex: '/api/v1/employees?name=Ana', d: 'List employees by parameters', codes: [200, 400] },
      { m: 'POST', p: '/api/v1/employee', ex: '/api/v1/employee', body: '{"name":"Radu Stan","dept":"Sales"}', d: 'Add employee', codes: [201, 400] },
      { m: 'PUT', p: '/api/v1/employee/{id}', ex: '/api/v1/employee/1', body: '{"dept":"Management"}', d: 'Update employee details', codes: [200, 400, 404] },
      { m: 'DELETE', p: '/api/v1/employee/{id}', ex: '/api/v1/employee/2', d: 'Remove employee: NOT a physical delete!', codes: [200, 404] },
    ],
    documents: [
      { m: 'POST', p: '/api/v1/employee/{id}/document', ex: '/api/v1/employee/1/document', body: '{"name":"review-2025.pdf"}', d: 'Add document', codes: [201, 404] },
      { m: 'DELETE', p: '/api/v1/employees/{id}/document/{docid}', ex: '/api/v1/employees/1/document/1', d: 'Remove document', codes: [200, 404] },
      { m: 'GET', p: '/api/v1/employees/{id}/document/{docid}', ex: '/api/v1/employees/1/document/1', d: 'Get document', codes: [200, 404] },
      { m: 'GET', p: '/api/v1/employees/{id}/documents', ex: '/api/v1/employees/1/documents', d: 'Retrieve documents for employee', codes: [200, 404] },
    ],
    salary: [
      { m: 'POST', p: '/api/v1/salaryRequest/', ex: '/api/v1/salaryRequest/', body: '{"employeeId":3,"newSalary":4200}', d: 'Add salary request (manager)', codes: [200, 400] },
      { m: 'GET', p: '/api/v1/salaryRequests', ex: '/api/v1/salaryRequests', d: 'Get salary requests', codes: [200] },
      { m: 'POST', p: '/api/v1/salaryRequest/{id}/approval', ex: '/api/v1/salaryRequest/1/approval', d: 'Approve salary request (HR)', codes: [200, 404] },
      { m: 'POST', p: '/api/v1/salaryRequest/{id}/rejection', ex: '/api/v1/salaryRequest/1/rejection', d: 'Reject salary request (HR)', codes: [200, 404] },
      { m: 'DELETE', p: '/api/v1/salaryRequest/{id}', ex: '/api/v1/salaryRequest/1', d: 'Remove salary request', codes: [200, 404] },
    ],
    vacation: [
      { m: 'PUT', p: '/api/v1/vacation/{empid}', ex: '/api/v1/vacation/3', body: '{"days":25}', d: 'Set available vacation days (HR)', codes: [200, 404] },
      { m: 'GET', p: '/api/v1/vacation/{empid}', ex: '/api/v1/vacation/3', d: 'Get available vacation days', codes: [200, 404] },
      { m: 'POST', p: '/api/v1/vacation/{empid}/reduction', ex: '/api/v1/vacation/3/reduction', body: '{"days":5}', d: 'Reduce vacation days (employee)', codes: [200] },
    ],
  };
  const TAB_LABEL = { telemetry: 'Muscar · Viewer', employees: 'Employees', documents: 'Documents', salary: 'Salary', vacation: 'Vacation' };

  function makeServer() {
    const D = {
      cars: { 101: { carId: 101, speed: 87, lat: 45.79, lon: 24.15, status: 'OK' }, 102: { carId: 102, speed: 0, lat: 45.8, lon: 24.12, status: 'ENGINE_FAULT' }, 103: { carId: 103, speed: 64, lat: 46.77, lon: 23.59, status: 'LOW_BATTERY' } },
      emp: [{ id: 1, name: 'Ana Pop', dept: 'Sales', deleted: false }, { id: 2, name: 'Dan Mureșan', dept: 'Accounting', deleted: false }, { id: 3, name: 'Ioana Barbu', dept: 'HR', deleted: false }],
      docs: [{ id: 1, empId: 1, name: 'contract.pdf' }],
      sal: [{ id: 1, employeeId: 2, newSalary: 3500, status: 'pending' }],
      vac: { 1: 21, 2: 14, 3: 9 },
      nextEmp: 4, nextDoc: 2, nextSal: 2,
    };
    const J = (o) => o;
    const body = (b) => { try { return b && b.trim() ? JSON.parse(b) : {}; } catch (e) { return null; } };
    const R = [
      ['GET', /^\/api\/v1\/telemetry\/errors$/, [200], () => [200, Object.values(D.cars).filter((c) => c.status !== 'OK').map((c) => ({ carId: c.carId, error: c.status }))]],
      ['GET', /^\/api\/v1\/telemetry\/errors\/(\w+)$/, [200, 404], (m) => (D.cars[m[1]] ? [200, D.cars[m[1]].status === 'OK' ? [] : [{ carId: +m[1], error: D.cars[m[1]].status }]] : [404, { error: 'car not found' }])],
      ['GET', /^\/api\/v1\/telemetry\/(\w+)$/, [200, 404], (m) => (D.cars[m[1]] ? [200, D.cars[m[1]]] : [404, { error: 'car not found' }])],
      ['GET', /^\/api\/v1\/employee\/(\d+)$/, [200, 404], (m) => { const e = D.emp.find((x) => x.id === +m[1] && !x.deleted); return e ? [200, e] : [404, { error: 'employee not found' }]; }],
      ['GET', /^\/api\/v1\/employees(\?.*)?$/, [200, 400], (m) => { const q = new URLSearchParams((m[1] || '').slice(1)); for (const k of q.keys()) if (!['name', 'dept', 'birthdate'].includes(k)) return [400, { error: 'unknown parameter: ' + k }]; let l = D.emp.filter((x) => !x.deleted); if (q.get('name')) l = l.filter((x) => x.name.toLowerCase().includes(q.get('name').toLowerCase())); if (q.get('dept')) l = l.filter((x) => x.dept === q.get('dept')); return [200, l]; }],
      ['POST', /^\/api\/v1\/employee$/, [201, 400], (m, b) => { if (!b || !b.name) return [400, { error: '"name" is required' }]; const e = { id: D.nextEmp++, name: b.name, dept: b.dept || '', deleted: false }; D.emp.push(e); return [201, e]; }],
      ['PUT', /^\/api\/v1\/employee\/(\d+)$/, [200, 400, 404], (m, b) => { const e = D.emp.find((x) => x.id === +m[1] && !x.deleted); if (!e) return [404, { error: 'employee not found' }]; if (!b) return [400, { error: 'invalid JSON' }]; Object.assign(e, { name: b.name || e.name, dept: b.dept || e.dept }); return [200, e]; }],
      ['DELETE', /^\/api\/v1\/employee\/(\d+)$/, [200, 404], (m) => { const e = D.emp.find((x) => x.id === +m[1] && !x.deleted); if (!e) return [404, { error: 'employee not found' }]; e.deleted = true; return [200, { id: e.id, deleted: true }]; }],
      ['POST', /^\/api\/v1\/employees?\/(\d+)\/document$/, [201, 404], (m, b) => { const e = D.emp.find((x) => x.id === +m[1] && !x.deleted); if (!e) return [404, { error: 'employee not found' }]; const d = { id: D.nextDoc++, empId: e.id, name: (b && b.name) || 'scan.pdf' }; D.docs.push(d); return [201, d]; }],
      ['DELETE', /^\/api\/v1\/employees?\/(\d+)\/document\/(\d+)$/, [200, 404], (m) => { const i = D.docs.findIndex((x) => x.empId === +m[1] && x.id === +m[2]); if (i < 0) return [404, { error: 'document not found' }]; D.docs.splice(i, 1); return [200, { removed: +m[2] }]; }],
      ['GET', /^\/api\/v1\/employees?\/(\d+)\/document\/(\d+)$/, [200, 404], (m) => { const d = D.docs.find((x) => x.empId === +m[1] && x.id === +m[2]); return d ? [200, d] : [404, { error: 'document not found' }]; }],
      ['GET', /^\/api\/v1\/employees?\/(\d+)\/documents$/, [200, 404], (m) => (D.emp.find((x) => x.id === +m[1] && !x.deleted) ? [200, D.docs.filter((x) => x.empId === +m[1])] : [404, { error: 'employee not found' }])],
      ['POST', /^\/api\/v1\/salaryRequest\/?$/, [200, 400], (m, b) => { if (!b || !b.employeeId || !b.newSalary) return [400, { error: 'employeeId and newSalary are required' }]; const r = { id: D.nextSal++, employeeId: b.employeeId, newSalary: b.newSalary, status: 'pending' }; D.sal.push(r); return [200, r]; }],
      ['GET', /^\/api\/v1\/salaryRequests$/, [200], () => [200, D.sal]],
      ['POST', /^\/api\/v1\/salaryRequest\/(\d+)\/approval$/, [200, 404], (m) => { const r = D.sal.find((x) => x.id === +m[1]); if (!r) return [404, { error: 'request not found' }]; if (r.status !== 'pending') return [409, { error: 'already ' + r.status }]; r.status = 'approved'; return [200, r]; }],
      ['POST', /^\/api\/v1\/salaryRequest\/(\d+)\/rejection$/, [200, 404], (m) => { const r = D.sal.find((x) => x.id === +m[1]); if (!r) return [404, { error: 'request not found' }]; if (r.status !== 'pending') return [409, { error: 'already ' + r.status }]; r.status = 'rejected'; return [200, r]; }],
      ['DELETE', /^\/api\/v1\/salaryRequest\/(\d+)$/, [200, 404], (m) => { const i = D.sal.findIndex((x) => x.id === +m[1]); if (i < 0) return [404, { error: 'request not found' }]; D.sal.splice(i, 1); return [200, { removed: +m[1] }]; }],
      ['PUT', /^\/api\/v1\/vacation\/(\d+)$/, [200, 404], (m, b) => { if (!(m[1] in D.vac)) return [404, { error: 'employee not found' }]; D.vac[m[1]] = +(b && b.days); return [200, { empId: +m[1], days: D.vac[m[1]] }]; }],
      ['GET', /^\/api\/v1\/vacation\/(\d+)$/, [200, 404], (m) => (m[1] in D.vac ? [200, { empId: +m[1], days: D.vac[m[1]] }] : [404, { error: 'employee not found' }])],
      ['POST', /^\/api\/v1\/vacation\/(\d+)\/reduction$/, [200], (m, b) => { if (!(m[1] in D.vac)) return [404, { error: 'employee not found' }]; const n = +(b && b.days); if (!(n > 0) || n > D.vac[m[1]]) return [400, { error: 'not enough vacation days left' }]; D.vac[m[1]] -= n; return [200, { empId: +m[1], days: D.vac[m[1]] }]; }],
    ];
    return {
      D,
      call(method, path, raw) {
        const b = body(raw);
        for (const [m, re, codes, fn] of R) { if (m !== method) continue; const mm = path.match(re); if (mm) { const [st, out] = fn(mm, b); return { status: st, body: out, codes }; } }
        return { status: 404, body: { error: 'no such route' }, codes: [] };
      },
    };
  }

  Deck.register('api', (node, ds) => {
    let srv = makeServer(), tab = ds.tab || 'employees', cur = EPS[ds.tab || 'employees'][0], last = null, flash = null;
    const keys = ds.only ? ds.only.split(',').map((x) => x.trim()).filter((k) => EPS[k]) : Object.keys(EPS);
    const tabs = seg(keys.map((k) => [k, TAB_LABEL[k], 'Show the endpoints of this service.']), tab, (v) => { tab = v; cur = EPS[v][0]; last = null; render(); });
    const list = h('div', { class: 'flexcol', style: { gap: '2px' } });
    const reqBox = h('div', { class: 'flexcol', style: { gap: '6px' } }), resBox = h('div', { class: 'flexcol', style: { gap: '6px' } }), dbBox = h('div');
    function select(ep) { cur = ep; last = null; render(); }
    function render() {
      const eps = EPS[tab];
      list.replaceChildren(...eps.map((e) => h('button', { class: 'ep' + (cur === e ? ' on' : ''), type: 'button', 'data-tip': 'Load this endpoint into the request builder.', onclick: () => select(e) }, h('span', { class: 'http ' + e.m }, e.m), h('span', {}, e.p), h('small', {}, e.d + ' · codes: ' + e.codes.join(', ')))));
      reqBox.replaceChildren();
      if (!cur) { reqBox.append(h('div', { class: 'answer' }, 'Pick an endpoint on the left, edit the path or the body, press Send. The mock server really keeps state: try things in order.')); }
      else {
        const mSel = h('span', { class: 'http ' + cur.m, style: { padding: '5px 9px', fontSize: '14px' } }, cur.m);
        const pathIn = h('input', { class: 'path', type: 'text', value: cur.ex || cur.p, 'aria-label': 'Request path', 'data-tip': 'Edit the path: change the id, break it, see which status comes back.' });
        const bodyIn = cur.body != null ? h('textarea', { class: 'req', 'aria-label': 'Request body', spellcheck: 'false' }, cur.body) : null;
        const send = h('button', { class: 'btn', type: 'button', 'data-tip': 'Send the request to the mock server.', onclick: () => { const r = srv.call(cur.m, pathIn.value.trim(), bodyIn ? bodyIn.value : ''); last = { ...r, req: cur.m + ' ' + pathIn.value.trim() }; flash = true; render(); } }, 'Send ▶');
        reqBox.append(h('div', { class: 'row' }, mSel, pathIn, send)); if (bodyIn) reqBox.append(bodyIn);
      }
      resBox.replaceChildren();
      if (last) {
        const doc = last.codes.includes(last.status);
        resBox.append(h('div', { class: 'row' }, h('span', { class: 'status-chip s' + String(last.status)[0] }, String(last.status)), h('span', { class: 'small' }, last.req), doc ? h('span', { class: 'pill ok' }, 'documented') : h('span', { class: 'pill bad' }, 'not documented: add it?')), h('pre', { class: 'code-sm', style: { maxHeight: '132px' } }, JSON.stringify(last.body, null, 1)));
      } else if (cur) resBox.append(h('div', { class: 'small' }, 'Declared return codes for this endpoint: ' + cur.codes.join(', ')));
      // db view
      const D = srv.D; let rows, head;
      if (tab === 'telemetry') { head = ['carId', 'speed', 'status']; rows = Object.values(D.cars).map((c) => [[c.carId, c.speed, c.status], '']); }
      else if (tab === 'employees') { head = ['id', 'name', 'dept', 'deleted']; rows = D.emp.map((e) => [[e.id, e.name, e.dept, e.deleted ? '1' : '0'], e.deleted ? 'gone' : '']); }
      else if (tab === 'documents') { head = ['id', 'employee', 'name']; rows = D.docs.map((d) => [[d.id, d.empId, d.name], '']); }
      else if (tab === 'salary') { head = ['id', 'employee', 'new salary', 'status']; rows = D.sal.map((r) => [[r.id, r.employeeId, r.newSalary, r.status], '']); }
      else { head = ['employee', 'days left']; rows = Object.entries(D.vac).map(([k, v]) => [[k, v], '']); }
      dbBox.replaceChildren(h('div', { class: 'small', style: { marginBottom: '3px' } }, h('b', {}, 'Database now: '), tab === 'telemetry' ? 'latest telemetry per car' : tab === 'employees' ? 'employees table (see what DELETE really does)' : tab === 'documents' ? 'documents table' : tab === 'salary' ? 'salary_requests table' : 'vacation table'), h('table', { class: 'tbl-mini' }, h('tr', {}, head.map((x) => h('th', {}, x))), rows.map(([r, c]) => h('tr', { class: c }, r.map((x) => h('td', {}, String(x)))))));
    }
    const reset = h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'Reset the mock server and its database.', onclick: () => { srv = makeServer(); last = null; render(); } }, 'Reset server');
    node.append(h('div', { class: 'flexcol', style: { gap: '8px' } }, h('div', { class: 'row' }, keys.length > 1 ? tabs : null, reset), h('div', { class: 'cols two', style: { gridTemplateColumns: '1fr 1.15fr', alignItems: 'start' } }, h('div', { class: 'panel', style: { gap: '4px' } }, h('h3', {}, 'Endpoints'), list), h('div', { class: 'flexcol', style: { gap: '8px' } }, reqBox, resBox, dbBox))));
    render();
  });

  // ================================================================ layers
  const TYPES = [['web', 'Web App & Web API'], ['mobile', 'Mobile App'], ['console', 'Console'], ['service', 'Service'], ['desktop', 'Desktop App'], ['tool', 'Existing tool']];
  const LAY = {
    muscar: [
      { id: 'gw', n: 'Telemetry Gateway', t: 'service', why: 'Nobody opens it: it listens for TCP connections from the cars and pushes data on, around the clock. That is a background service.', L: [['Service Interface', 'TCP listener for the cars'], ['Pipeline', 'pushes every message to Kafka']], note: 'No business logic and no data store: the gateway must be as thin and fast as possible.' },
      { id: 'pr', n: 'Telemetry Processor', t: 'service', why: 'It reads from the pipeline and writes to the database without any user interface: a background service.', L: [['Service Interface', 'consumes messages from Kafka'], ['Business Logic', 'validates the messages'], ['Data Access', 'writes documents'], ['Data Store', 'MongoDB']], note: 'Same four layers as a classic application, but the top layer is fed by a queue instead of a person.' },
      { id: 'vw', n: 'Telemetry Viewer', t: 'web', why: 'End users look at dashboards in a browser: a web front end plus a Web API behind it.', L: [['Service Interface', 'REST API (3 endpoints)'], ['Business Logic', 'filters, latest values'], ['Data Access', 'queries'], ['Data Store', 'MongoDB']], note: 'Back end = Web API; front end = JavaScript web UI.' },
      { id: 'bi', n: 'BI Application', t: 'tool', why: 'A BI application is ALWAYS built on an existing tool. The application type does not matter, and designing it is not the architect’s job.', L: [['Existing BI tool', 'configured by a BI expert'], ['Data Warehouse', 'aggregated data']], note: 'Lesson: always ask a BI expert.' },
    ],
    dunderly: [
      { id: 'vs', n: 'View Service', t: 'web', why: 'It answers browsers and returns static files (HTML, CSS, JS): a web application.', L: [['User Interface', 'HTML / CSS / JS pages'], ['Business Logic', ''], ['Data Access', ''], ['Data Store', 'SQL Server']], note: 'The View Service only shows data: the other services own the logic.' },
      { id: 'es', n: 'Employees Service', t: 'web', why: 'Other parts (the browser) call it over HTTP: a Web API with CRUD operations. It does not display anything itself.', L: [['Service Interface', 'REST API'], ['Business Logic', 'rules for employees and documents'], ['Data Access', ''], ['Data Store', 'SQL Server']], note: 'Same shape for Salary and Vacation.' },
      { id: 'lg', n: 'Logging Service', t: 'service', why: 'Reads log records from the queue, validates them and stores them. No users involved: a background service.', L: [['Polling', 'asks the queue every few seconds'], ['Business Logic', 'validates the records'], ['Data Access', ''], ['Data Store', 'SQL Server']], note: 'Polling replaces the user interface as the entry point.' },
      { id: 'pi', n: 'Payment Interface', t: 'service', why: 'Wakes up once a month, reads salaries and writes a file for the legacy payment system: a timer-driven service.', L: [['Timer', 'fires once a month'], ['Business Logic', 'builds the payment data'], ['Data Access', 'reads salaries'], ['Data Store', 'SQL Server']], note: 'Timer replaces the user interface as the entry point.' },
    ],
  };
  Deck.register('layers', (node, ds) => {
    const items = LAY[ds.case || 'muscar'];
    let cur = items[0], picked = null;
    const picker = h('div', { class: 'flexcol', style: { gap: '4px' } }), typeBox = h('div', { class: 'row' }), fb = h('div', { class: 'answer', style: { '--chip': 'var(--purple)' } }), stackBox = h('div', { class: 'cols two' });
    const stack = (title, layers, hi) => h('div', { class: 'panel', style: { gap: '4px', flex: 1 } }, h('h3', {}, title), layers.map((l, i) => h('div', { style: { border: '2px solid ' + (i === 0 && hi ? 'var(--teal)' : 'var(--border)'), background: i === 0 && hi ? '#dff6f7' : '#fff', borderRadius: '8px', padding: '5px 10px', textAlign: 'center', fontSize: '14px' } }, h('b', {}, l[0]), l[1] ? h('div', { class: 'small', style: { fontSize: '12px' } }, l[1]) : null)));
    function render() {
      picker.replaceChildren(...items.map((it) => h('button', { class: 'q-btn' + (cur === it ? ' asked' : ''), type: 'button', 'data-tip': 'Choose this component.', onclick: () => { cur = it; picked = null; render(); } }, it.n)));
      typeBox.replaceChildren(...TYPES.map(([k, l]) => h('button', { class: 'btn small ' + (picked === k ? (k === cur.t ? 'gold' : 'red') : 'ghost'), type: 'button', 'data-tip': 'Is this the right application type for the selected component?', onclick: () => { picked = k; render(); } }, l)));
      fb.replaceChildren();
      if (!picked) fb.append(h('span', {}, h('b', {}, cur.n + ': '), 'which application type? Pick one.'));
      else fb.append(picked === cur.t ? h('span', {}, h('b', { style: { color: 'var(--good)' } }, '✓ Correct. '), cur.why) : h('span', {}, h('b', { style: { color: 'var(--bad)' } }, '✗ Not quite. '), 'Think about who or what calls this component. ', picked ? '' : ''));
      stackBox.replaceChildren();
      if (picked === cur.t) stackBox.append(stack('Traditional application', [['User Interface / Service Interface'], ['Business Logic'], ['Data Access'], ['Data Store']], false), stack('In our case: ' + cur.n, cur.L, true), h('div', { class: 'answer', style: { gridColumn: '1 / -1', '--chip': 'var(--teal)' } }, h('b', {}, 'Internal architecture: '), cur.note));
      else stackBox.append(h('div', { class: 'small' }, 'Get the application type right to unlock the layer diagram.'));
    }
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '.7fr 1.6fr', alignItems: 'start' } }, h('div', { class: 'panel' }, h('h3', {}, 'Components'), picker), h('div', { class: 'flexcol', style: { gap: '8px' } }, h('b', { style: { fontSize: '16px' } }, 'Step 1 · Application type'), typeBox, fb, stackBox)));
    render();
  });

  // ================================================================ BI sorting
  Deck.register('bi', (node) => {
    const Q = [['Where is car 4711 right now?', 'v', 'Current state of one car: real-time, from the operational DB.'], ['Show the latest errors for all cars.', 'v', 'The newest data: an endpoint of the Telemetry Viewer.'], ['How many cars broke down during the last month?', 'b', 'History plus aggregation: a classic BI question.'], ['What is the total distance the cars drove?', 'b', 'Aggregates over everything ever stored.'], ['What was the latest speed of car 102?', 'v', 'One value, now: operational.'], ['Forecast: how many breakdowns next quarter?', 'b', 'Trends and forecasts need the warehouse and a BI tool.'], ['Which cars reported an ENGINE_FAULT in the last hour?', 'v', 'Recent window, inside the one-week retention: operational.'], ['Which car model breaks most often per 10,000 km?', 'b', 'Needs the full history, joined and aggregated: BI.']];
    let i = 0, score = 0, done = false, ans = null;
    const card = h('div', { class: 'flexcol', style: { gap: '10px', alignItems: 'stretch' } });
    function render() {
      card.replaceChildren();
      if (i >= Q.length) { card.append(h('div', { class: 'big-quote' }, `Score: ${score} / ${Q.length}`), h('div', { class: 'answer', style: { '--chip': 'var(--teal)' } }, h('b', {}, 'Rule of thumb: '), 'Operational = now (last week), fast, one car at a time. BI = history, aggregates, trends; may be slower. And remember the lesson: ', h('b', {}, 'always use a BI expert for the BI part.')), h('button', { class: 'btn small', type: 'button', onclick: () => { i = 0; score = 0; ans = null; render(); } }, 'Play again')); return; }
      const [q, a, why] = Q[i];
      card.append(h('div', { class: 'small' }, `Question ${i + 1} of ${Q.length} · score ${score}`), h('div', { class: 'big-quote', style: { minHeight: '72px' } }, '“' + q + '”'), h('div', { class: 'row' },
        h('button', { class: 'btn' + (ans && a === 'v' ? ' gold' : ''), type: 'button', disabled: ans ? true : null, 'data-tip': 'Answered by the Telemetry Viewer (operational, real time).', onclick: () => pick('v') }, 'Telemetry Viewer (operational)'), h('button', { class: 'btn' + (ans && a === 'b' ? ' gold' : ''), type: 'button', disabled: ans ? true : null, 'data-tip': 'Answered by the BI Application (history and analysis).', onclick: () => pick('b') }, 'BI Application (analysis)')));
      if (ans) card.append(h('div', { class: 'answer', style: { '--chip': ans === a ? 'var(--green)' : 'var(--red)' } }, h('b', {}, ans === a ? '✓ ' : '✗ '), why), h('button', { class: 'btn small', type: 'button', onclick: () => { i++; ans = null; render(); } }, i === Q.length - 1 ? 'See score' : 'Next ▶'));
    }
    function pick(x) { ans = x; if (x === Q[i][1]) score++; render(); }
    const left = h('div', { class: 'panel' }, h('h3', {}, 'Two different jobs'), h('table', { class: 't' }, h('tr', {}, h('th', {}, ''), h('th', {}, 'Telemetry Viewer'), h('th', {}, 'BI Application')), h('tr', {}, h('td', {}, h('b', {}, 'Data')), h('td', {}, 'Operational, last week'), h('td', {}, 'Aggregated, forever')), h('tr', {}, h('td', {}, h('b', {}, 'Speed')), h('td', {}, 'Real time, critical'), h('td', {}, 'Can be slower')), h('tr', {}, h('td', {}, h('b', {}, 'Built')), h('td', {}, 'Our code (Node.js)'), h('td', {}, 'Existing BI tool')), h('tr', {}, h('td', {}, h('b', {}, 'Who')), h('td', {}, 'Architect + developers'), h('td', {}, 'BI expert'))));
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '1fr 1.2fr', alignItems: 'start' } }, left, h('div', { class: 'panel' }, h('h3', {}, 'Where does this question belong?'), card)));
    render();
  });

  // ================================================================ blob storage chooser
  Deck.register('blob', (node) => {
    const S = { mb: 5, tx: true, net: true, exp: false, cost: false, scale: false };
    const out = h('div', { class: 'flexcol', style: { gap: '6px' } });
    const sl = slider('Document size', { min: 0, max: 100, step: 1, value: 40, format: () => fmtMB(S.mb) }, (v) => { S.mb = Math.pow(10, -1 + v / 100 * 5); S.mb = Math.round(S.mb * 10) / 10 || 0.1; sl.querySelector('output').textContent = fmtMB(S.mb); draw(); }, 'Size of one document: from 100 KB to 10 GB (logarithmic).');
    function fmtMB(m) { return m >= 1000 ? (m / 1000).toFixed(1) + ' GB' : m >= 1 ? m.toFixed(m < 10 ? 1 : 0) + ' MB' : Math.round(m * 1000) + ' KB'; }
    const cb = (k, label, tip) => { const i = h('input', { type: 'checkbox', checked: S[k] || null, onchange: () => { S[k] = i.checked; draw(); } }); return h('label', { class: 'chk', 'data-tip': tip }, i, h('span', {}, label)); };
    const ALT = [
      { n: 'Relational DB (BLOB column)', ex: 'SQL Server FILESTREAM, Oracle BLOB', pros: 'part of the app transaction · part of the DB backup / DR', cons: 'clunky syntax · limited size', f: () => { const r = []; r.push(S.mb > 2000 ? ['bad', 'too big for a BLOB column'] : S.mb > 100 ? ['warn', 'big for a BLOB column'] : ['ok', 'size fits']); r.push(S.tx ? ['ok', 'same transaction as the employee row'] : ['ok', 'transactions not needed, still handy']); r.push(S.scale ? ['warn', 'millions of docs bloat the database'] : ['ok', 'volume is modest']); return r; } },
      { n: 'File system + pointer in DB', ex: 'plain files, path stored in the DB', pros: 'unlimited size · easy to execute', cons: 'not part of the transaction · unmanageable as it grows', f: () => { const r = [['ok', 'any size']]; r.push(S.tx ? ['bad', 'not in the transaction: row and file can disagree'] : ['ok', 'no transaction needed']); r.push(S.scale ? ['bad', 'unmanageable at scale'] : ['warn', 'backups need a second plan']); return r; } },
      { n: 'Object store', ex: 'CEPH', pros: 'great scale · unlimited size', cons: 'complex setup · dedicated knowledge · new product in the mix', f: () => { const r = [['ok', 'any size, great scale']]; r.push(S.exp ? ['ok', 'team has the expertise'] : ['bad', 'needs dedicated knowledge we do not have']); r.push(S.tx ? ['warn', 'not part of the DB transaction'] : ['ok', 'fine without transactions']); return r; } },
      { n: 'Cloud storage', ex: 'Azure Storage Account, AWS S3', pros: 'great scale · easy to execute', cons: 'requires an internet connection · cost', f: () => { const r = [['ok', 'any size, great scale']]; r.push(S.net ? ['ok', 'internet is available'] : ['bad', 'no internet connection']); r.push(S.cost ? ['ok', 'budget for monthly fees'] : ['warn', 'adds a recurring cost']); r.push(S.tx ? ['warn', 'not part of the DB transaction'] : ['ok', '']); return r.filter((x) => x[1]); } },
    ];
    const pts = { ok: 2, warn: 0, bad: -4 };
    function draw() {
      const res = ALT.map((a) => { const r = a.f(); return { a, r, sc: r.reduce((x, y) => x + pts[y[0]], 0) }; });
      const best = Math.max(...res.map((x) => x.sc));
      out.replaceChildren(...res.map(({ a, r, sc }) => h('div', { class: 'card' + (sc === best ? ' winner' : ''), style: { padding: '8px 12px' } }, h('div', { class: 'row' }, h('b', { style: { fontSize: '16px' } }, a.n), h('span', { class: 'small' }, a.ex), sc === best ? h('span', { class: 'badge-w' }, 'BEST FIT') : null), h('div', { class: 'row', style: { gap: '5px', marginTop: '4px' } }, r.map(([c, t]) => h('span', { class: 'pill ' + c }, (c === 'ok' ? '✓ ' : c === 'bad' ? '✗ ' : '! ') + t))), h('div', { class: 'small', style: { marginTop: '3px', fontSize: '12.5px' } }, h('b', {}, 'Slide: '), 'pros: ' + a.pros + ' · cons: ' + a.cons))));
    }
    const dun = h('button', { class: 'btn small gold', type: 'button', 'data-tip': 'Set the controls to Dunderly’s situation.', onclick: () => { Object.assign(S, { mb: 1, tx: true, net: true, exp: false, cost: false, scale: false }); rebuild(); } }, 'Dunderly’s situation');
    const big = h('button', { class: 'btn small ghost', type: 'button', 'data-tip': 'A very different world: huge media files, millions of them, with a cloud budget.', onclick: () => { Object.assign(S, { mb: 2000, tx: false, net: true, exp: false, cost: true, scale: true }); rebuild(); } }, 'A video platform');
    const ctrl = h('div', { class: 'panel' });
    function rebuild() { sl.querySelector('input').value = String(Math.round((Math.log10(S.mb) + 1) / 5 * 100)); sl.querySelector('output').textContent = fmtMB(S.mb); ctrl.replaceChildren(h('h3', {}, 'Describe the situation'), sl, cb('tx', 'The document must be saved in the same transaction as the employee record', 'If the row is saved, the document must be saved too, or both fail.'), cb('net', 'An internet connection is always available', 'Cloud storage needs the internet.'), cb('exp', 'The team has storage-engineering expertise', 'Object stores need dedicated knowledge.'), cb('cost', 'There is budget for monthly cloud fees', 'Cloud storage is pay-as-you-go.'), cb('scale', 'Massive scale: millions of documents', 'Great scale is where files in a database stop making sense.'), h('div', { class: 'row' }, dun, big)); draw(); }
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '.9fr 1.3fr', alignItems: 'start' } }, ctrl, out));
    rebuild();
  });

  // ================================================================ load model (week 6)
  Deck.register('loadmodel', (node) => {
    const P = { users: 10, think: 1, wshare: 40, sw: 60, c: 8 };
    function erlangC(c, a) { let sum = 0, term = 1; for (let k = 0; k < c; k++) { if (k > 0) term *= a / k; sum += term; } const tc = term * a / c, top = tc * c / (c - a); return top / (sum + top); }
    function lat(users, c) {
      const lam = users / P.think, lw = lam * P.wshare / 100, sw = P.sw / 1000, sr = 0.004, a = lw * sw;
      let w; if (lw === 0) w = 0; else if (a / c >= 1) return Infinity; else w = erlangC(c, a) / (c / sw - lw);
      return (P.wshare / 100 * (w + sw) + (1 - P.wshare / 100) * sr) * 1000;
    }
    const W = 640, H = 250, cv = h('canvas', { width: W, height: H, style: { width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px' } }), ctx = cv.getContext('2d');
    const kp = h('div', { class: 'row' }), ins = h('div', { class: 'answer', style: { '--chip': 'var(--purple)' } });
    const S = [
      slider('Concurrent users', { min: 1, max: 200, step: 1, value: P.users, format: (v) => v }, (v) => { P.users = v; draw(); }, 'The number of simulated Locust users.'),
      slider('Think time', { min: 0.5, max: 5, step: 0.5, value: P.think, format: (v) => v.toFixed(1) + ' s' }, (v) => { P.think = v; draw(); }, 'Seconds a user waits between requests.'),
      slider('Share of writes', { min: 0, max: 100, step: 5, value: P.wshare, format: (v) => v + '%' }, (v) => { P.wshare = v; draw(); }, 'How many requests change data (post, like, comment). SQLite allows ONE writer at a time.'),
      slider('Write time', { min: 5, max: 150, step: 5, value: P.sw, format: (v) => v + ' ms' }, (v) => { P.sw = v; draw(); }, 'How long one write holds the database.'),
      slider('Postgres workers', { min: 2, max: 32, step: 1, value: P.c, format: (v) => v }, (v) => { P.c = v; draw(); }, 'Writes Postgres can process in parallel.'),
    ];
    function draw() {
      const maxU = 200, cap = 600, X = (u) => 44 + (u - 1) / (maxU - 1) * (W - 60), Y = (l) => H - 28 - Math.min(l, cap) / cap * (H - 46);
      ctx.clearRect(0, 0, W, H); ctx.font = '12px Open Sans, sans-serif'; ctx.fillStyle = '#454B67'; ctx.strokeStyle = '#d7e1eb'; ctx.lineWidth = 1;
      for (let l = 0; l <= cap; l += 100) { ctx.beginPath(); ctx.moveTo(40, Y(l)); ctx.lineTo(W - 10, Y(l)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(l + (l === cap ? '+' : ''), 36, Y(l) + 4); }
      ctx.textAlign = 'center'; for (let u = 0; u <= maxU; u += 50) ctx.fillText(u || 1, X(Math.max(u, 1)), H - 10);
      const line = (c, col) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); let st = false; for (let u = 1; u <= maxU; u++) { const l = lat(u, c); const y = Y(isFinite(l) ? l : cap * 2); if (!st) { ctx.moveTo(X(u), y); st = true; } else ctx.lineTo(X(u), y); } ctx.stroke(); };
      line(P.c, '#2184FF'); line(1, '#EE1927');
      ctx.strokeStyle = '#0B2F63'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(P.users), 10); ctx.lineTo(X(P.users), H - 28); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#EE1927'; ctx.textAlign = 'left'; ctx.fillText('SQLite (1 writer)', 300, 22); ctx.fillStyle = '#2184FF'; ctx.fillText('PostgreSQL (' + P.c + ' writers)', 300, 40); ctx.fillStyle = '#454B67'; ctx.textAlign = 'left'; ctx.fillText('mean latency, ms (top = off the chart)', 46, 12);
      const a = lat(P.users, 1), b = lat(P.users, P.c), lim = P.wshare ? Math.floor(P.think / (P.wshare / 100 * P.sw / 1000)) : Infinity;
      const f = (v) => (isFinite(v) ? v.toFixed(0) + ' ms' : 'unbounded');
      kp.replaceChildren(h('div', { class: 'kpi ' + (a > 150 ? 'hot' : 'good'), style: { flex: 1 } }, h('div', { class: 'v' }, f(a)), h('div', { class: 'l' }, 'SQLite mean latency')), h('div', { class: 'kpi good', style: { flex: 1 } }, h('div', { class: 'v' }, f(b)), h('div', { class: 'l' }, 'Postgres mean latency')), h('div', { class: 'kpi', style: { flex: 1 } }, h('div', { class: 'v' }, isFinite(lim) ? '≈ ' + lim : '∞'), h('div', { class: 'l' }, 'users until SQLite saturates')));
      ins.textContent = a > 150 || !isFinite(a) ? 'SQLite’s single writer is the bottleneck: requests queue behind it, latency explodes and Locust would show failures (“database is locked”). Postgres still has headroom.' : 'Still comfortable for both. Move the users slider right, or raise the share of writes, and watch the red line leave first.';
    }
    node.append(h('div', { class: 'cols two', style: { gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' } }, h('div', { class: 'flexcol', style: { gap: '8px' } }, cv, kp, ins), h('div', { class: 'panel narrow' }, h('h3', {}, 'Teaching model (not a measurement)'), S, h('div', { class: 'small' }, 'Queueing model (Erlang C): writes wait for a free writer; reads run in parallel. Your own Locust numbers are the truth: use this to predict before you measure.'))));
    draw();
  });
})();
