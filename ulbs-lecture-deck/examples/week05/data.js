/* Week 5 content for the data-driven widgets (matrix, diagram, sorter, brief, checklist). Loaded BEFORE the widget files. */
DeckData.diagram = {
    muscar: {
      H: 300,
      nodes: [
        { id: 'cars', x: 8, y: 53, w: 118, h: 64, title: 'Cars', short: 'Cars', role: ['10,000+ vehicles', 'send telemetry'], tech: 'embedded', kind: 'actor', why: 'The source of the data. More than 10,000 vehicles today, 200,000 expected by the end of the year.', red: 'Not our system: cars simply keep sending.' },
        { id: 'gw', x: 168, y: 53, w: 160, h: 64, title: 'Telemetry Gateway', short: 'Gateway', role: ['Receives telemetry', 'from cars'], tech: 'Node.js', kind: 'svc', rep: { t: 'lb', n: 3 }, why: 'Python is too slow for 7,000 msgs/s. We need great performance, Linux, and reuse of the team’s JavaScript skills: Node.js.', red: '3 instances behind a load balancer: if one dies, the others keep receiving.' },
        { id: 'pl', x: 368, y: 53, w: 160, h: 64, title: 'Telemetry Pipeline', short: 'Pipeline', role: ['Queues messages', 'for processing'], tech: 'Kafka', kind: 'queue', rep: { t: 'ha' }, why: 'A queue for streaming high-volume data. Nothing like it in the company, so we looked around: Kafka is popular, massive in capacity and highly available (complex to set up, but worth it).', red: 'Product’s own high availability: a Kafka cluster.' },
        { id: 'pr', x: 568, y: 53, w: 160, h: 64, title: 'Telemetry Processor', short: 'Processor', role: ['Validates the messages', 'and stores them'], tech: 'Node.js', kind: 'svc', rep: { t: 'lb', n: 3 }, why: 'Already used in the system, fast, and with great Kafka support.', red: '3 instances behind a load balancer.' },
        { id: 'db', x: 768, y: 53, w: 160, h: 64, title: 'Operational DB', short: 'Operational DB', role: ['Last week of telemetry,', 'schema-less, fast'], tech: 'MongoDB', kind: 'store', rep: { t: 'ha' }, why: 'We need schema-less messages, quick retrieval and no complex queries: a document store. About 4 TB for one week.', red: 'Product’s own high availability (replica set).' },
        { id: 'vw', x: 968, y: 53, w: 204, h: 64, title: 'Telemetry Viewer', short: 'Viewer', role: ['Queries the operational DB,', 'shows real-time data'], tech: 'Node.js + web UI', kind: 'svc', rep: { t: 'lb', n: 3 }, why: 'Web app for end users (back end Web API, front end in JavaScript). It displays, it does NOT analyze.', red: '3 instances behind a load balancer.' },
        { id: 'ar', x: 640, y: 215, w: 170, h: 64, title: 'Archive DB', short: 'Archive DB', role: ['Old telemetry,', 'rarely read, cheap'], tech: 'Azure Storage', kind: 'store', rep: { t: 'ha' }, why: '221 TB a year, not accessed often, no need for fast retrieval, save costs: cloud storage in the Archive tier.', red: 'Cloud storage has built-in redundancy.' },
        { id: 'dw', x: 850, y: 215, w: 150, h: 64, title: 'Data Warehouse', short: 'Data Warehouse', role: ['Aggregated data', 'ready for analysis'], tech: 'chosen by BI expert', kind: 'store', rep: { t: 'ha' }, why: 'Holds the aggregated data “forever”. The BI expert chooses the product.', red: 'Product’s own high availability.' },
        { id: 'bi', x: 1020, y: 215, w: 140, h: 64, title: 'BI Application', short: 'BI App', role: ['Reports, trends,', 'forecasts'], tech: 'existing BI tool', kind: 'tool', rep: { t: 'ha' }, why: 'A BI application is ALWAYS based on an existing tool. Designing the BI solution is not the architect’s job: ask a BI expert.', red: 'Product’s own high availability.' },
      ],
      edges: [['cars', 'gw', 'r', 'l', 'tcp'], ['gw', 'pl', 'r', 'l', 'queue'], ['pl', 'pr', 'r', 'l', 'queue'], ['pr', 'db', 'r', 'l', 'data'], ['db', 'vw', 'r', 'l', 'data'], ['db', 'ar', 'b', 't', 'etl'], ['db', 'dw', 'b', 't', 'etl'], ['dw', 'bi', 'r', 'l', 'data']],
    },
    dunderly: {
      H: 340,
      nodes: [
        { id: 'br', x: 8, y: 142, w: 128, h: 64, title: 'Users’ Browser', short: 'Browser', role: ['HTML page,', 'calls the REST APIs'], tech: 'JavaScript', kind: 'actor', why: 'The 10 concurrent users: managers, HR and employees.', red: 'Not our system.' },
        { id: 'vs', x: 226, y: 6, w: 190, h: 58, title: 'View Service', short: 'View', role: ['Returns static files', '(HTML, CSS, JS)'], tech: '.NET Core', kind: 'svc', rep: { t: 'lb', n: 2 }, why: '.NET Core has great support for web apps, and the team is expert in the Microsoft stack.', red: '2 instances behind a load balancer.' },
        { id: 'es', x: 226, y: 84, w: 190, h: 58, title: 'Employees Service', short: 'Employees', role: ['CRUD on employees', '(and their documents)'], tech: '.NET Core', kind: 'svc', rep: { t: 'lb', n: 2 }, why: 'Allows users to query and change employee data. It does not display it: that is the View Service’s job.', red: '2 instances behind a load balancer.' },
        { id: 'ss', x: 226, y: 162, w: 190, h: 58, title: 'Salary Service', short: 'Salary', role: ['Salary change requests:', 'ask, approve, reject'], tech: '.NET Core', kind: 'svc', rep: { t: 'lb', n: 2 }, why: 'Managers ask for a change, the HR representative approves or rejects.', red: '2 instances behind a load balancer.' },
        { id: 'vc', x: 226, y: 240, w: 190, h: 58, title: 'Vacation Service', short: 'Vacation', role: ['Vacation days:', 'HR sets, employees use'], tech: '.NET Core', kind: 'svc', rep: { t: 'lb', n: 2 }, why: 'Employees manage their vacation days, HR sets the available days.', red: '2 instances behind a load balancer.' },
        { id: 'qu', x: 500, y: 6, w: 120, h: 44, title: 'Queue', short: 'Queue', role: ['Log records'], tech: 'RabbitMQ', kind: 'queue', why: 'No data stream is involved and we want something easy to use: RabbitMQ, not Kafka.', red: 'A single broker is enough for a not-very-critical system.' },
        { id: 'lg', x: 730, y: 6, w: 190, h: 58, title: 'Logging Service', short: 'Logging', role: ['Reads log records', 'from the queue, stores them'], tech: '.NET Core', kind: 'svc', rep: { t: 'pair', label: 'Active / Active', a: ['active', 'active'] }, why: 'Very important, and used by the other services. No logging mechanism exists in the company; ELK is too heavy (“No Go”), so we build a small service.', red: 'Active / Active: both read the queue; an “Is Alive” check tells each one if the other died.' },
        { id: 'ds', x: 520, y: 128, w: 220, h: 96, title: 'Data Store', short: 'Data Store', role: ['Employees, vacation,', 'salary, logs, documents'], tech: 'SQL Server (data + BLOBs)', kind: 'store', why: 'Data is shared between services, so ONE data store is better than one per service. Documents are small (about 1 MB) and the database already exists: keep them there as BLOBs.', red: 'Standard database backup / DR.' },
        { id: 'pi', x: 520, y: 252, w: 220, h: 58, title: 'Payment Interface', short: 'Payment', role: ['Once a month: reads salaries,', 'writes the payment file'], tech: '.NET Core (timer)', kind: 'svc', rep: { t: 'pair', label: 'Active / Passive', a: ['active', 'standby'] }, why: 'Queries the database once a month and passes the payment data to the external system as a file.', red: 'Active / Passive: running both would pay everyone twice!' },
        { id: 'ps', x: 960, y: 252, w: 212, h: 58, title: 'Payment System', short: 'Payment System', role: ['Legacy, C++', 'input: one file a month'], tech: 'external (C++)', kind: 'ext', why: 'A legacy system hosted in the company server farm. Its only input is a file received once a month.', red: 'Not ours.' },
      ],
      edges: [['br', 'vs', 'r', 'l', 'html'], ['br', 'es', 'r', 'l', 'rest'], ['br', 'ss', 'r', 'l', 'rest'], ['br', 'vc', 'r', 'l', 'rest'], ['es', 'ds', 'r', 'l', 'data'], ['ss', 'ds', 'r', 'l', 'data'], ['vc', 'ds', 'r', 'l', 'data'], ['vs', 'qu', 'r', 'l', 'queue'], ['es', 'qu', 'r', 'l', 'queue'], ['qu', 'lg', 'r', 'l', 'queue'], ['lg', 'ds', 'b', 't', 'data'], ['pi', 'ds', 't', 'b', 'data'], ['pi', 'ps', 'r', 'l', 'file']],
    },
  };

DeckData.matrix = {
    'queue-mus': { label: 'Muscar · queue', q: 'Which queue goes between the gateway and the processor?', ctx: 'Data intensive: 7,000 msgs/s, mission critical, nothing exists in the company yet.', opts: ['Self-developed', 'RabbitMQ', 'Apache Kafka'], crit: [['Throughput (7,000 msg/s)', 5], ['Stream processing', 4], ['High availability', 4], ['Easy to set up', 1], ['Easy to use', 1]], sc: [[1, 1, 1, 2, 2], [3, 2, 3, 4, 5], [5, 5, 5, 2, 2]], note: 'Kafka: very popular, handles massive amounts of data, supports high availability. The price: complex set-up and configuration.' },
    'lang-mus': { label: 'Muscar · gateway language', q: 'Which language for the Telemetry Gateway?', ctx: 'Developers know Python and are experts in JavaScript. Linux servers only. Python is too slow for the gateway.', opts: ['Python', 'Node.js', 'Java', 'Go'], crit: [['Raw performance', 5], ['Many parallel connections', 4], ['Runs on Linux', 3], ['Team already knows it', 4]], sc: [[2, 2, 5, 5], [4, 4, 5, 5], [5, 5, 5, 1], [5, 5, 5, 1]], note: 'Node.js: great performance, runs on Linux and leverages JavaScript skills. Try setting “Team already knows it” to 0: the answer changes. Technology follows people.' },
    'store-mus': { label: 'Muscar · data store', q: 'Which store for the operational telemetry?', ctx: 'Schema-less messages, quick retrieval, no complex queries, about 4 TB for one week.', opts: ['MongoDB (documents)', 'Relational (SQL)', 'In-memory key-value'], crit: [['Schema-less messages', 5], ['Quick retrieval', 4], ['Complex queries', 1], ['Holds 4 TB affordably', 3], ['Scales with write load', 4]], sc: [[5, 4, 3, 4, 4], [1, 4, 5, 3, 2], [4, 5, 1, 1, 3]], note: 'A document store fits schema-less messages that are fetched by car. Complex queries are not needed here: that is what the BI side is for.' },
    'queue-dun': { label: 'Dunderly · queue', q: 'Which queue for the log records?', ctx: 'No data stream involved. A small team that wants something easy. Not very critical.', opts: ['Self-developed', 'RabbitMQ', 'Apache Kafka'], crit: [['Throughput (7,000 msg/s)', 1], ['Stream processing', 1], ['High availability', 2], ['Easy to set up', 4], ['Easy to use', 5]], sc: [[1, 1, 1, 2, 2], [3, 2, 3, 4, 5], [5, 5, 5, 2, 2]], note: 'Same technologies, same scores as for Muscar: only the weights changed, and RabbitMQ wins. Scores describe the technology; weights describe your context.' },
    'log-dun': { label: 'Dunderly · logging', q: 'How do we build the logging service?', ctx: 'Nothing exists in the company. The team knows .NET and SQL Server. Small system.', opts: ['ELK stack', 'Own service (.NET + SQL)', 'Plain text files'], crit: [['Powerful search and dashboards', 2], ['Easy to install and maintain', 5], ['Fits a small system', 4], ['Team already knows it', 4], ['One central place for all services', 3]], sc: [[5, 1, 1, 1, 5], [3, 4, 5, 5, 4], [1, 5, 3, 3, 1]], note: 'ELK is powerful (Elastic + Logstash + Kibana) but needs maintenance, is complicated to set up and is meant for large data-intensive systems: “No Go”.' },
  };

DeckData.brief = {
    muscar: {
      from: 'Muscar.auto', role: 'Head of Engineering', subject: 'Telemetry for our autonomous cars', tag: 'teal',
      mail: [
        ['We make ', ['biz', 'autonomous systems for vehicles'], '. Today there are ', ['fleet', 'more than 10,000 cars'], ' on the road, and we expect ', ['grow', 'over 200,000'], ' by the end of the year.'],
        ['Every car reports ', ['tele', 'telemetry'], ': location, speed, breakdowns. We need to ', ['rel', 'reliably receive'], ' all of it, ', ['store', 'store it'], ', and ', ['dash', 'show it on dashboards'], '.'],
        ['Our analysts will also want to ', ['bi', 'run analysis'], ' on the data. Can you design the architecture?'],
      ],
      facts: [['Client', 'Muscar.auto (fictional)'], ['Business', 'Software for autonomous vehicles'], ['Fleet', '10,000+ cars now, 200,000+ by year end'], ['The ask', 'Receive, store, show and analyse car telemetry'], ['Your role', 'Software architect']],
      unknown: ['How many users?', 'Messages per second?', 'Size of a message?', 'How long to keep it?', 'How critical?'],
      hs: {
        biz: ['Context', 'The client is a product company', 'Their cars are the product; this system is a supporting platform. Ask what the business needs from the data, not only what the e-mail says.'],
        fleet: ['Non-functional', 'The “users” are machines', 'Thousands of cars send data all day. Humans barely use the system. A system with few users and a huge number of senders is <b>data intensive</b>.'],
        grow: ['Non-functional', '20 times growth in one year', '10,000 to 200,000 is a factor of 20. Which number do we design for? An architect asks the client; we will flag this again on the next slides.'],
        tele: ['Functional', 'Telemetry is a stream of small messages', 'Location, speed, breakdowns: small, frequent, never-ending. Not a user clicking, a vehicle talking. This points to <b>messaging</b>.'],
        rel: ['Non-functional', '“Reliably” hides a requirement', 'A lost message is lost data. Ask: how critical is it, what SLA? The answer drives queues, redundancy and how much we spend.'],
        store: ['Question to ask', 'Store how much, for how long?', 'The e-mail has no numbers. Step 3 turns the vague “store it” into messages per second, bytes, retention and a bill.'],
        dash: ['Functional', 'A web dashboard', 'Showing the data is the easy part: how many people look at it at once? We will ask the client.'],
        bi: ['Out of scope', 'Analysis belongs to the BI expert', 'We provide clean, reachable data and a way to export it. Building the reports and models is somebody else’s job.'],
      },
    },
    dunderly: {
      from: 'Dunderly', role: 'HR Manager', subject: 'New HR system', tag: 'gold',
      mail: [
        ['We are Dunderly. We sell ', ['biz', 'paper supplies'], ': printer paper, envelopes and more. We need a new ', ['web', 'web based'], ' HR system.'],
        ['The HR department must ', ['crud', 'create, read, update and delete employees'], '. When a manager wants a salary change, the HR manager must ', ['appr', 'approve or reject'], ' it. We also need to ', ['vac', 'manage vacation days'], '.'],
        ['Salaries are paid by our ', ['pay', 'existing payment system'], ', so the new system has to work with it. Please design the architecture.'],
      ],
      facts: [['Client', 'Dunderly (fictional)'], ['Business', 'Paper supplies, not a software company'], ['The ask', 'A new HR system'], ['Scope', 'Employees, salaries, vacation days, payments'], ['Your role', 'Software architect']],
      unknown: ['How many users?', 'How many employees?', 'How much data?', 'How critical?', 'Which skills does the team have?'],
      hs: {
        biz: ['Context', 'Not a software company', 'A paper company has a small IT team and little appetite for exotic technology. Ask what skills the team already has: it will weigh on the technology choices.'],
        web: ['Constraint', 'The platform is decided upfront', 'A browser application. That already narrows the application type before we draw anything.'],
        crud: ['Functional', 'Four operations on one entity', 'Create, Read, Update, Delete on employees. In step 8 these become a REST API with predictable paths and verbs.'],
        appr: ['Functional', 'A workflow with two roles', 'A manager requests, the HR manager decides. That means roles, permissions and a request that moves through states: pending, approved, rejected.'],
        vac: ['Functional', 'A balance that must stay correct', 'Add days, take days, never go below zero. Small rules like this are where the bugs live.'],
        pay: ['Question to ask', 'We do not own this system', 'An existing, external system. What does it accept, how often, and what happens when it is down or called twice? This interface is the risky part.'],
      },
    },
  };

DeckData.sorter = { muscar: [
      ['Receive telemetry from cars (location, speed, breakdowns)', 'f', 'What the system DOES: functional.'],
      ['Handle 7,000 messages per second', 'n', 'How much the system must cope with: non-functional.'],
      ['Display dashboards that summarize the data', 'f', 'A feature users can see: functional.'],
      ['Performance is critical', 'n', 'A quality of the system, not a feature: non-functional.'],
      ['Store telemetry in a persistent store', 'f', 'What it does with the data: functional.'],
      ['Highest possible SLA (mission critical)', 'n', 'Availability promise: non-functional.'],
      ['Perform analysis on the data', 'f', 'A capability the business asked for: functional.'],
      ['Ten concurrent users', 'n', 'A load figure: non-functional.'],
      ['At most 4 TB in the operational database', 'n', 'A capacity limit: non-functional.'],
    ] };

DeckData.checklist = ['I listed the functional requirements (what the system does).', 'I asked the NFR questions: users, volume, message size, schema, loss, SLA.', 'I did the data-volume arithmetic: per second, day, year.', 'I decided the retention period and what happens after it.', 'I split the system into components, each with one responsibility.', 'I chose how components talk: TCP, queue, REST/HTTP, files.', 'For every component: application type, technology (with a reason) and internal layers.', 'For every service: the API (path, verb, return codes).', 'I planned redundancy and named the single points of failure.', 'I drew the logic, technical and physical diagrams, and wrote down the decisions (ADR).'];;

/* Decision practice: new situations (not the two case studies). Each option carries its own feedback. */
DeckData.decide = [
  { area: 'Numbers first', link: ['m-vol', 'Data volume'], ctx: 'A smart-meter company: 50,000 meters each send a 2 KB reading every 10 seconds.', q: 'About how much data arrives per day?',
    driver: 'Convert everything to messages per second first, then to MB per second, then multiply by 86,400 seconds.',
    opts: [['About 86 GB per day', 0, 'Off by a factor of 10. 50,000 meters every 10 s is 5,000 messages per second, not 500.'], ['About 864 GB per day', 1, '5,000 msg/s × 2 KB = 10 MB/s, × 86,400 s = 864 GB per day. Close to a terabyte a day: that changes how long you can keep it hot.'], ['About 8.6 TB per day', 0, 'Off by a factor of 10 the other way: check the message size (2 KB, not 20 KB).'], ['About 864 MB per day', 0, 'That is a thousand times too small: you used MB where GB is needed.']] },
  { area: 'Numbers first', link: ['m-ask', 'Ask the client'], ctx: 'A client opens with: “We need a platform where field technicians upload inspection photos.” The team starts arguing about frameworks.', q: 'What is the most useful next step for the architecture?',
    driver: 'Technology follows the non-functional requirements. Without numbers, every choice is a guess.',
    opts: [['Pick the framework the team likes best, to move fast', 0, 'Technology comes after requirements: you cannot tell what “best” means yet.'], ['Ask how many uploads per hour, how large a photo is, how long to keep them, and how critical the service is', 1, 'Users, volume, retention and criticality are the numbers that drive every later decision.'], ['Draw the database tables', 0, 'Too early: you do not know the volume or whether a database is even the right place for photos.'], ['Choose the cloud provider and the region', 0, 'A real decision, but it depends on volume, latency and cost, which you do not know yet.']] },
  { area: 'Technology follows context', link: ['m-pipe', 'Build or buy the queue'], ctx: 'A ticket shop must never lose an order. Peak: 200 orders per second. The team has six developers and has never run a message broker.', q: 'Which queue between the web shop and the payment service?',
    driver: 'Throughput is modest and the team is small: ease of use and “good enough” beat raw power.',
    opts: [['Build our own queue in the database', 0, 'Reinventing a queue is slow and risky, and the existing brokers already solve it.'], ['RabbitMQ', 1, 'A general-purpose broker: easy to set up and use, more than enough for 200 messages per second, and orders survive a slow payment service.'], ['Apache Kafka', 0, 'Built for huge data streams. At 200 msg/s you pay its complexity for power you do not need.'], ['No queue: the shop calls the payment service directly', 0, 'When the payment service is slow, orders are lost or the shop freezes. The queue is the shock absorber.']] },
  { area: 'Technology follows context', link: ['m-pipe', 'Build or buy the queue'], ctx: 'A factory sends 80,000 sensor messages per second. Several teams want to replay and analyse the same stream later.', q: 'Which queue fits?',
    driver: 'Same candidates as the previous question, opposite verdict: the context (volume, stream, replay) changed.',
    opts: [['RabbitMQ', 0, 'Great for task queues, but it is not designed for a massive stream that many consumers replay.'], ['Apache Kafka', 1, 'Built for high-throughput streams, keeps the data so consumers can replay it, scales out. Complexity is justified here.'], ['A relational table used as a queue', 0, 'At 80,000 writes per second the table becomes the bottleneck.'], ['Self-developed queue', 0, 'You would rebuild what Kafka already offers, with more risk.']] },
  { area: 'Technology follows context', link: ['m-gw', 'Gateway: type and language'], ctx: 'A service must handle 300 requests per second on Linux servers. The team: five Python developers, nobody knows Java or Go.', q: 'Which language for the service?',
    driver: 'First check that the performance need is met. If it is, team knowledge wins.',
    opts: [['Python', 1, '300 requests per second is well within reach, and the team already masters it. (In a case with 7,000 messages per second, Python was too slow: the load decides.)'], ['Go, because it is the fastest', 0, 'Faster than needed, and nobody knows it: you pay in learning time and bugs.'], ['Java, because it is the industry standard', 0, 'A safe choice in general, but here it ignores the team’s skills for no measurable gain.'], ['C++, for maximum performance', 0, 'Maximum performance nobody asked for, at a high development cost.']] },
  { area: 'Data and retention', link: ['m-store', 'Processor and data store'], ctx: 'An app stores user profiles. Every user has different custom fields, access is always by user id, there are no joins, and the data is about 2 TB.', q: 'Which store?',
    driver: 'Look at the shape of the data and how it is read, not at what is fashionable.',
    opts: [['A document database', 1, 'Schema-less records read by key, no complex queries: a natural fit for documents.'], ['A relational database with one column per possible field', 0, 'Hundreds of mostly empty columns and constant schema changes.'], ['An in-memory key-value store', 0, 'Fast, but 2 TB in memory is expensive and the data must survive restarts.'], ['One file per user on a shared disk', 0, 'No indexing, no queries, hard to scale or back up consistently.']] },
  { area: 'Data and retention', link: ['m-store', 'Processor and data store'], ctx: 'A payments ledger: a transfer must either fully happen or not at all. Auditors run complex reports that join accounts, transfers and customers.', q: 'Which store?',
    driver: 'Transactions and complex queries point to a relational database.',
    opts: [['A document database', 0, 'Good for schema-less data, weak for multi-record transactions and joins across entities.'], ['A relational database', 1, 'ACID transactions keep a transfer all-or-nothing, and SQL joins make the audit reports natural.'], ['An in-memory key-value store', 0, 'No joins, and durability would be an extra problem.'], ['Plain text files', 0, 'No transactions and no queries: an audit nightmare.']] },
  { area: 'Data and retention', link: ['m-ret', 'Retention'], ctx: 'A live dashboard shows the last 24 hours of vehicle positions. Analysts want three years of trends, queried once a week.', q: 'How do you keep the data?',
    driver: 'Two uses, two retentions: fast and small for the live view, cheap and large for history.',
    opts: [['Keep everything in the fast operational database', 0, 'Three years in the fast store: huge cost and slow dashboards.'], ['Keep a day or two in the fast database; move older data to an archive and an aggregated store for the analysts', 1, 'The dashboard stays fast, history stays available and cheap.'], ['Delete everything older than 24 hours', 0, 'Fine for the dashboard, but the analysts lose their three years of trends.'], ['Keep everything only in the cold archive', 0, 'Cheap, but the live dashboard would be far too slow.']] },
  { area: 'Redundancy', link: ['m-redund', 'Pipeline in action'], ctx: 'A stateless web API must serve 500 requests per second. One server handles 200 requests per second. The service should survive the loss of one server.', q: 'How many instances behind the load balancer?',
    driver: 'Capacity after a failure must still cover the load: N + 1.',
    opts: [['One larger server', 0, 'No redundancy: when it dies, the service is down.'], ['Two instances (400 requests per second)', 0, '400 is below 500 even when both are healthy.'], ['Three instances (600 requests per second)', 0, 'Enough when all are up, but with one down you have 400, below the 500 needed.'], ['Four instances (800 requests per second)', 1, 'With one down you still have 600, above 500. Stateless services scale well with active / active copies.']] },
  { area: 'Redundancy', link: ['d-pay', 'Pay-day'], ctx: 'A nightly job e-mails an invoice to every customer. It must run, and it must not send any invoice twice. The server it runs on sometimes dies.', q: 'Which redundancy design?',
    driver: 'When a job must run exactly once, copies must not both run: one active, one watching.',
    opts: [['One instance, restarted by hand when it fails', 0, 'A dead server at night means no invoices until someone notices.'], ['Two active instances that both run the job', 0, 'Every customer gets two e-mails.'], ['One active instance and one passive one that takes over when the “Is Alive” signal stops', 1, 'Runs once, and the standby takes over after a short silence.'], ['Two instances scheduled an hour apart', 0, 'Still two runs: duplicates again.']] },
  { area: 'Application and API', link: ['m-layers', 'Application type and layers'], ctx: 'A component receives data from thousands of devices, validates it and pushes it to a queue. It has no user interface and must run all day.', q: 'Which application type?',
    driver: 'Who or what uses it, and how long does it run?',
    opts: [['Web application', 0, 'There is no browser user and nothing to show.'], ['A service running in the background', 1, 'Always on, no interface, talks to devices and to a queue.'], ['A console tool started by an operator', 0, 'Someone would have to launch it and keep it running.'], ['Desktop application', 0, 'No interface is needed.']] },
  { area: 'Application and API', link: ['d-api', 'Employees API'], ctx: 'You design a REST API for an online shop. A client needs the open orders of customer 42.', q: 'Which endpoint?',
    driver: 'Paths are nouns, the HTTP verb carries the action, and the path is versioned.',
    opts: [['POST /api/getOpenOrders', 0, 'A verb in the path and the wrong HTTP method for a read.'], ['GET /api/v1/customers/42/orders?status=open', 1, 'Nouns in the path, GET for reading, a filter in the query, a version in the path.'], ['GET /api/v1/getOrders/42/open', 0, 'Verbs in the path. HTTP already has the verb.'], ['PUT /api/v1/orders/42', 0, 'PUT replaces a resource; it does not read one, and 42 is a customer, not an order.']] },
  { area: 'Application and API', link: ['d-pay', 'Pay-day'], ctx: 'A new system must send payments to an old system you cannot change. The old system reads one file, once a month, and is not very critical.', q: 'How do you integrate?',
    driver: 'You do not own the legacy system, so you adapt to its interface and keep the integration simple.',
    opts: [['Rewrite the old system to expose a REST API', 0, 'Outside your scope, and far more risk than the problem deserves.'], ['A monthly job that writes the file in the format the old system expects', 1, 'Matches what the old system already does, runs once a month, and needs no changes on its side.'], ['Send every payment immediately over a message queue', 0, 'The old system reads one file a month: it cannot consume a stream.'], ['Give the old system direct access to our database', 0, 'Couples two systems and exposes data you should not share.']] },
  { area: 'Method', link: ['m-gw', 'Gateway: type and language'], ctx: 'Your decision matrix gives Python the best score because “team already knows it” has weight 5 and “raw performance” weight 1. Then the client says: every response must come in under 5 ms.', q: 'What do you do with the matrix?',
    driver: 'Scores describe the technologies; the weights describe the context. When the context changes, change the weights.',
    opts: [['Keep the result: the matrix was already approved', 0, 'The context changed; a decision is only as good as its inputs.'], ['Raise the weight of performance (it is now critical), re-run the matrix, and explain the new result', 1, 'The weights capture the context. A hard latency limit makes performance far more important.'], ['Delete the performance criterion so the result stays', 0, 'Hiding a requirement does not remove it.'], ['Pick the language you personally prefer', 0, 'A matrix exists to make the reasoning visible and discussable.']] },
];

/* method ladder, client interviews, side-by-side comparison */
DeckData.method = [
    ['Requirements', 'What must the system do? Functional vs non-functional.', 'm-req', '--navy'],
    ['Ask about NFRs', 'Users, messages, sizes, loss, SLA: the questions that shape everything.', 'm-ask', '--navy'],
    ['Data volume', 'Do the arithmetic. Decide how long data is kept.', 'm-vol', '--blue'],
    ['Components', 'Split into pieces and choose how they talk (TCP, queue, REST, file).', 'm-comp', '--blue'],
    ['Application type', 'Per component: web, mobile, console, service or desktop?', 'm-gw', '--purple'],
    ['Technology stack', 'Build or buy? Fit the load, the team and the environment.', 'm-pipe', '--purple'],
    ['Internal layers', 'Service interface, business logic, data access, data store.', 'm-layers', '--teal'],
    ['API design', 'Paths, verbs and return codes for the endpoints.', 'm-viewer', '--teal'],
    ['Redundancy', 'No single point of failure: load balancer or is-alive check.', 'm-redund', '--gold'],
    ['Three diagrams', 'Logic, technical, physical: the same system, three views.', 'm-diag', '--gold'],
];

DeckData.interview = {
  muscar: {
    color: '--teal',
    q: [
      ['How many concurrent users?', '10', 'Users', '10 users', 'Very few users: the UI tier does not need to scale. The hard part is somewhere else.'],
      ['How many telemetry messages per second?', '7,000 per second', 'Messages', '7,000 / s', 'This is the number that shapes the whole system: it hits the gateway every second, all day.'],
      ['What is the average size of a message?', '1 KB', 'Message size', '1 KB', '7,000 × 1 KB = 7 MB every second. Next slide: what that becomes in a day and a year.'],
      ['Is the message schema-less?', 'Yes', 'Schema', 'schema-less', 'Different car models report different fields, so a rigid table schema would fight us: look at document-style stores.'],
      ['Can we tolerate some message loss?', 'Sort of…', 'Message loss', 'a little, not for alarms', 'A few lost position pings are acceptable, a lost breakdown alarm is not. Never drop silently.'],
      ['What is the desired SLA?', 'Highest possible', 'SLA', 'highest possible', 'Mission critical: every component needs redundancy, so that no single failure stops telemetry.'],
    ],
    sum: ['Data intensive, not many users', 'Performance is important', 'Mission critical'],
  },
  dunderly: {
    color: '--gold',
    q: [
      ['How many concurrent users?', '10', 'Users', '10 users', 'The same number as Muscar! Users alone do not decide how complex a system gets.'],
      ['How many employees?', '250 today, 500 in five years', 'Employees', '250 → 500', 'A tiny dataset. A single relational database will do; no sharding, no streams.'],
      ['What do we know about the external payment system?', 'Legacy system written in C++, in the company server farm. Input: only files, one file per month.', 'Payment system', 'legacy, file once a month', 'No API to call: we must produce a file once a month. That is a timer-driven batch job, not a web service.'],
      ['How much data does one employee need?', 'About 1 MB of records plus about 10 scanned documents of about 5 MB each', 'Data / employee', '≈ 51 MB', 'Scanned documents dominate the volume, so we need a plan for storing documents.'],
      ['How critical is the system?', 'Not very critical', 'SLA', 'not very critical', 'No mission-critical promises: keep it simple, redundancy is cheap insurance but not a core driver.'],
      ['What does the team know?', 'The Microsoft stack: expert in .NET and SQL Server', 'Team skills', '.NET + SQL Server', 'Technology follows people: the stack the team already masters is a requirement too.'],
    ],
    sum: ['Classic information system', 'Not a lot of users, not a lot of data', 'Interface to an external system'],
  },
};

DeckData.compare = {
  start: 1,
  cols: [['Muscar.auto', '#0b6d73'], ['Dunderly', '#8a5500']],
  rows: [
      ['Type of system', 'Data intensive: a stream of telemetry', 'Classic information system: CRUD and a workflow', 'Name the type first: it tells you where the hard problems are.'],
      ['Concurrent users', '10', '10', 'Identical! The number of users is NOT what makes Muscar hard. Volume and criticality are.'],
      ['Load / data', '7,000 msgs/s ≈ 605 GB a day, 221 TB a year', '250 → 500 employees ≈ 25.5 GB in total', 'Muscar writes Dunderly’s five-year total about every hour.'],
      ['Criticality (SLA)', 'Mission critical, performance critical', 'Not very critical', 'Criticality decides how much redundancy you pay for.'],
      ['Outside world', 'Cars over TCP; ETL to archive and warehouse', 'Legacy C++ system: one file a month', 'The shape of the interface (stream vs file) decides the shape of the component.'],
      ['Queue', 'Kafka (stream processing, massive volume)', 'RabbitMQ (simple, easy)', 'Same job, opposite choice: the context changed the weights.'],
      ['Data store', 'MongoDB (schema-less) + cloud archive', 'SQL Server (relational + BLOBs)', 'Schema-less messages vs relational records with documents.'],
      ['Platform', 'Node.js on Linux', '.NET Core on the Microsoft stack', 'Technology follows the team’s skills and the environment.'],
      ['Redundancy', 'Load balancer and several instances on every tier', 'LB for the APIs, “Is Alive” for logging and payment', 'Redundancy matches the SLA, and the nature of the component.'],
      ['Retention / BI', '1 week operational, aggregated forever, BI expert', 'Not an issue at 25.5 GB, no BI', 'Retention exists because the data is huge.'],
  ],
};
