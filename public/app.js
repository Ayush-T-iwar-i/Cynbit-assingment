const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');
const header = document.getElementById('site-header');
const menuBtn = document.getElementById('menu-btn');
const nav = document.getElementById('nav');
const form = document.getElementById('lead-form');
const statusEl = document.getElementById('status');

// Dark / light mode
function syncToggle() {
  const dark = root.getAttribute('data-theme') === 'dark';
  toggle.textContent = dark ? '\u2600' : '\u263E';
  toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
toggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncToggle();
});
syncToggle();

// Mobile menu
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

// Header hides on scroll down, returns on scroll up
let lastY = window.scrollY, ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    if (nav.classList.contains('open') || y < lastY || y < 80) header.classList.remove('hidden');
    else header.classList.add('hidden');
    lastY = y; ticking = false;
  });
}, { passive: true });

// Form
const fields = ['name', 'email', 'message'];
function showErrors(errors = {}) {
  fields.forEach(f => {
    document.getElementById(f + '-error').textContent = errors[f] || '';
    form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  });
  const first = fields.find(f => errors[f]);
  if (first) form.elements[first].focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; statusEl.className = 'status'; statusEl.textContent = 'Sending...';
  try {
    const res = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await res.json();
    if (res.ok) {
      showErrors(); form.reset();
      try { sessionStorage.removeItem('draft'); } catch (e) {}
      updateCount(); form.hidden = true; success.hidden = false; success.focus();
      statusEl.className = 'status ok';
      statusEl.textContent = 'Thanks, we have your inquiry and will reply within 24 hours.';
    } else if (data.errors) {
      showErrors(data.errors); statusEl.textContent = '';
    } else { throw new Error(data.error); }
  } catch (err) {
    statusEl.className = 'status fail';
    statusEl.textContent = err.message || 'Something went wrong. Please try again.';
  } finally { btn.disabled = false; }
});

// Success panel, character counter and draft autosave (kept for this tab only)
const success = document.getElementById('success');
const counter = document.getElementById('message-count');
const draftFields = ['name', 'email', 'company', 'industry', 'message'];
function updateCount() { counter.textContent = form.elements.message.value.length + ' / 2000'; }
try {
  const d = JSON.parse(sessionStorage.getItem('draft') || '{}');
  draftFields.forEach(f => { if (typeof d[f] === 'string') form.elements[f].value = d[f]; });
} catch (e) {}
updateCount();
form.addEventListener('input', () => {
  updateCount();
  try { sessionStorage.setItem('draft', JSON.stringify(Object.fromEntries(draftFields.map(f => [f, form.elements[f].value])))); } catch (e) {}
});
document.getElementById('again').onclick = () => {
  success.hidden = true; form.hidden = false; statusEl.textContent = ''; form.elements.name.focus();
};