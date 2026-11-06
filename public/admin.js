const keyInput = document.getElementById('key');
const body = document.getElementById('rows');
const msg = document.getElementById('msg');

async function load() {
  msg.textContent = 'Loading...';
  const res = await fetch('/api/leads', { headers: { 'x-admin-key': keyInput.value } });
  if (!res.ok) { msg.textContent = 'Invalid admin key.'; body.replaceChildren(); return; }
  const leads = await res.json();
  msg.textContent = leads.length ? leads.length + ' leads' : 'No leads yet.';
  body.replaceChildren(...leads.map(row));
}

function cell(text) { const td = document.createElement('td'); td.textContent = text || '-'; return td; }

function row(l) {
  const tr = document.createElement('tr');
  tr.append(
    cell(new Date(l.createdAt).toLocaleString()),
    cell(l.name), cell(l.email), cell(l.company), cell(l.industry), cell(l.message)
  );
  const td = document.createElement('td');
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Status for ' + l.name);
  ['new', 'contacted', 'closed'].forEach(s => {
    const o = document.createElement('option'); o.value = o.textContent = s; o.selected = s === l.status; sel.append(o);
  });
  sel.addEventListener('change', () => fetch('/api/leads/' + l._id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': keyInput.value },
    body: JSON.stringify({ status: sel.value })
  }));
  td.append(sel); tr.append(td);
  return tr;
}

document.getElementById('load').addEventListener('click', load);