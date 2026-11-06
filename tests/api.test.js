process.env.ADMIN_KEY = 'test-admin-key-123';
process.env.ANTHROPIC_API_KEY = '';
process.env.SMTP_HOST = '';
const test = require('node:test');
const assert = require('node:assert');
const Lead = require('../models/Lead');
const Conversation = require('../models/Conversation');

const created = [];
Lead.create = async d => { created.push(d); return { ...d, _id: 'abc' }; };
Lead.find = () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ name: 'A' }] }) }) });
Conversation.findOneAndUpdate = () => ({ catch: () => {} });

const app = require('../api');
let server, base;
test.before(() => new Promise(r => { server = app.listen(0, () => { base = 'http://127.0.0.1:' + server.address().port; r(); }); }));
test.after(() => server.close());
const post = (p, body, h = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) });

test('rejects an invalid lead with field errors', async () => {
  const r = await post('/api/leads', { name: 'A', email: 'bad', message: 'short' });
  assert.equal(r.status, 400);
  const d = await r.json();
  assert.ok(d.errors.name && d.errors.email && d.errors.message);
});

test('saves a valid lead', async () => {
  created.length = 0;
  const r = await post('/api/leads', { name: 'Ayush Tiwari', email: 'a@b.co', message: 'We need a website for our clinic.' });
  assert.equal(r.status, 201);
  assert.equal(created.length, 1);
});

test('honeypot submissions are dropped silently', async () => {
  created.length = 0;
  const r = await post('/api/leads', { name: 'Bot', email: 'a@b.co', message: 'spam spam spam spam', website: 'x' });
  assert.equal(r.status, 201);
  assert.equal(created.length, 0);
});

test('admin routes require a valid token', async () => {
  assert.equal((await fetch(base + '/api/leads')).status, 401);
  assert.equal((await fetch(base + '/api/leads', { headers: { Authorization: 'Bearer fake.token' } })).status, 401);
});

test('admin login flow', async () => {
  assert.equal((await post('/api/admin/login', { key: 'wrong' })).status, 401);
  const r = await post('/api/admin/login', { key: 'test-admin-key-123' });
  assert.equal(r.status, 200);
  const { token } = await r.json();
  const list = await fetch(base + '/api/leads', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(list.status, 200);
  assert.equal((await list.json()).length, 1);
});

test('chat streams a safe fallback when no API key is set', async () => {
  const r = await post('/api/chat', { messages: [{ role: 'user', content: 'How can I contact you?' }], sessionId: 's1' });
  assert.equal(r.status, 200);
  const txt = await r.text();
  assert.ok(txt.includes('support@cynbit.in') && txt.includes('\nSUGGEST:'));
});

test('chat rejects a request without a user message', async () => {
  assert.equal((await post('/api/chat', { messages: [] })).status, 400);
});

test('unknown routes return the 404 page', async () => {
  const r = await fetch(base + '/does-not-exist');
  assert.equal(r.status, 404);
  assert.ok((await r.text()).includes("doesn’t exist"));
});

test('audit page is served', async () => {
  const r = await fetch(base + '/audit.html');
  assert.equal(r.status, 200);
  assert.ok((await r.text()).includes('How this page was improved'));
});

const { localAnswer, buildSystem, stripSuggest } = require('../knowledge');

test('offline answers cover the main topics', () => {
  assert.match(localAnswer('hello').text, /assistant/i);
  assert.match(localAnswer('What is your pricing?').text, /scope/i);
  assert.match(localAnswer('Are you hiring interns?').text, /careers/i);
  assert.match(localAnswer('how do I contact you').text, /opportunities@cynbit\.in/);
  assert.match(localAnswer('tell me about BitElevate').text, /BitElevate/);
  assert.match(localAnswer('qwerty zxcv').text, /not sure/i);
  assert.ok(localAnswer('hi').suggest.length >= 2);
});

test('system prompt is grounded and carries relevant verified answers', () => {
  const s = buildSystem('what is your phone number');
  assert.ok(s.includes('+91 89479 62667') && s.includes('SUGGEST:') && s.includes('https://www.cynbit.in/services'));
});

test('stripSuggest removes the suggestion line', () => {
  assert.equal(stripSuggest('Hello\nSUGGEST: a | b'), 'Hello');
});