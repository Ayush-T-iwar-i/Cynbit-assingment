const root = document.documentElement, t = document.getElementById('theme-toggle');
const sync = () => { const d = root.dataset.theme === 'dark'; t.textContent = d ? '\u2600' : '\u263E'; t.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); };
t.onclick = () => { const n = root.dataset.theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = n; try { localStorage.setItem('theme', n); } catch (e) {} sync(); };
sync();