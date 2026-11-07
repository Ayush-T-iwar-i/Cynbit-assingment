const $ = id => document.getElementById(id);
const h = (t, p = {}, ...k) => { const e = document.createElement(t); Object.assign(e, p); e.append(...k); return e; };
const root = document.documentElement;
let token = '', leads = [], page = 0;
try { token = sessionStorage.getItem('atoken') || ''; } catch (e) {}
const api = (path, opts = {}) => fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } });
const fmt = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const tt = $('theme-toggle');
const syncT = () => { const d = root.dataset.theme === 'dark'; tt.textContent = d ? '\u2600' : '\u263E'; tt.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); };
tt.onclick = () => { const n = root.dataset.theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = n; try { localStorage.setItem('theme', n); } catch (e) {} syncT(); };
syncT();

async function enter(k) {
  $('login-msg').textContent = 'Checking...';
  if (k) {
    const lr = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) });
    if (!lr.ok) { $('login-msg').textContent = 'Invalid admin key.'; return; }
    token = (await lr.json()).token;
  }
  const res = await api('/api/leads');
  if (!res.ok) {
    token = ''; try { sessionStorage.removeItem('atoken'); } catch (e) {}
    $('login').hidden = false; $('app').hidden = true; $('login-msg').textContent = 'Session expired. Sign in again.'; return;
  }
  try { sessionStorage.setItem('atoken', token); } catch (e) {}
  leads = await res.json();
  $('login').hidden = true; $('app').hidden = false; $('logout').hidden = false;
  render();
}
$('login-form').onsubmit = e => { e.preventDefault(); enter($('key').value); };
$('logout').onclick = () => { try { sessionStorage.removeItem('atoken'); } catch (e) {} location.reload(); };
if (token) enter();

function render() {
  const q = $('q').value.toLowerCase(), f = $('filter').value, week = Date.now() - 7 * 864e5;
  const count = s => leads.filter(l => l.status === s).length;
  $('stats').replaceChildren(...[['Total leads', leads.length], ['New', count('new')], ['Contacted', count('contacted')], ['Last 7 days', leads.filter(l => new Date(l.createdAt) > week).length]]
    .map(([a, b]) => h('div', { className: 'stat' }, h('strong', { textContent: b }), h('span', { textContent: a }))));
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6 + i); return d; });
  const perDay = days.map(d => leads.filter(l => { const t = new Date(l.createdAt); return t >= d && t < new Date(+d + 864e5); }).length);
  const peak = Math.max(1, ...perDay);
  $('spark').setAttribute('aria-label', 'Leads per day over the last 7 days: ' + perDay.join(', '));
  $('spark').replaceChildren(...perDay.map((n, i) => { const col = h('div', { className: 'sp-col' }, h('span', { className: 'sp-bar', title: n + ' leads' }), h('small', { textContent: days[i].toLocaleDateString([], { weekday: 'short' }) })); col.firstChild.style.height = (n / peak * 60 + 4) + 'px'; return col; }));
  const rows = leads.filter(l => (!f || l.status === f) && [l.name, l.email, l.company, l.industry, l.message].join(' ').toLowerCase().includes(q));
  $('empty').hidden = rows.length > 0;
  const per = 10, pages = Math.max(1, Math.ceil(rows.length / per)); page = Math.min(page, pages - 1);
  $('pager-info').textContent = 'Page ' + (page + 1) + ' of ' + pages;
  $('prev').disabled = page === 0; $('next').disabled = page >= pages - 1;
  $('rows').replaceChildren(...rows.slice(page * per, page * per + per).flatMap(row));
}

function row(l) {
  const note = h('textarea', { rows: 2, value: l.notes || '', placeholder: 'Internal notes (only visible here)' });
  note.setAttribute('aria-label', 'Notes for ' + l.name);
  const save = h('button', { className: 'link-btn', type: 'button', textContent: 'Save note', onclick: async () => {
    const r = await api('/api/leads/' + l._id, { method: 'PATCH', body: JSON.stringify({ notes: note.value }) });
    if (r.ok) { l.notes = note.value; save.textContent = 'Saved'; setTimeout(() => { save.textContent = 'Save note'; }, 1500); }
  } });
  const detail = h('tr', { hidden: true, className: 'detail' }, h('td', { colSpan: 6 }, l.ai && l.ai.summary ? h('p', { className: 'ai', textContent: 'AI summary (' + l.ai.category + '): ' + l.ai.summary }) : '', h('p', { textContent: l.message }), note, save));
  const sel = h('select', { className: 'st-' + l.status });
  sel.setAttribute('aria-label', 'Status for ' + l.name);
  ['new', 'contacted', 'closed'].forEach(s => sel.append(h('option', { value: s, textContent: s, selected: s === l.status })));
  sel.onchange = async () => { const r = await api('/api/leads/' + l._id, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) }); if (r.ok) { l.status = sel.value; render(); } };
  const view = h('button', { className: 'link-btn', type: 'button', textContent: 'Message', onclick: () => { detail.hidden = !detail.hidden; } });
  const del = h('button', { className: 'link-btn danger', type: 'button', textContent: 'Delete', onclick: async () => {
    if (!confirm('Delete the lead from ' + l.name + '?')) return;
    const r = await api('/api/leads/' + l._id, { method: 'DELETE' });
    if (r.ok) { leads = leads.filter(x => x !== l); render(); }
  } });
  const tr = h('tr', {}, h('td', { textContent: fmt(l.createdAt) }), h('td', {}, l.name, l.ai && l.ai.priority ? h('span', { className: 'pri pri-' + l.ai.priority, textContent: l.ai.priority }) : ''),
    h('td', {}, h('a', { href: 'mailto:' + l.email, textContent: l.email })),
    h('td', { textContent: [l.company, l.industry].filter(Boolean).join(' / ') || '-' }),
    h('td', {}, sel), h('td', { className: 'acts' }, view, del));
  return [tr, detail];
}

$('export').onclick = () => {
  const esc = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const csv = [['Date', 'Name', 'Email', 'Company', 'Industry', 'Message', 'Status'], ...leads.map(l => [l.createdAt, l.name, l.email, l.company, l.industry, l.message, l.status])]
    .map(r => r.map(esc).join(',')).join('\n');
  h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'cynbit-leads.csv' }).click();
};

document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('leads-panel').hidden = b.dataset.tab !== 'leads'; $('chats-panel').hidden = b.dataset.tab !== 'chats';
  if (b.dataset.tab === 'chats') loadChats();
});
async function loadChats() {
  const res = await api('/api/conversations'), list = res.ok ? await res.json() : [];
  $('chats').replaceChildren(...(list.length ? list.map(c => h('details', { className: 'chat-item' },
    h('summary', { textContent: fmt(c.updatedAt) + ' - ' + (c.messages[0]?.content || '').slice(0, 70) }),
    ...c.messages.map(m => h('p', { className: 'm-' + m.role, textContent: (m.role === 'user' ? 'Visitor: ' : 'Bot: ') + m.content }))))
    : [h('p', { textContent: 'No chat conversations yet.' })]));
}
$('q').oninput = () => { page = 0; render(); }; $('filter').onchange = () => { page = 0; render(); };
$('prev').onclick = () => { page--; render(); }; $('next').onclick = () => { page++; render(); };