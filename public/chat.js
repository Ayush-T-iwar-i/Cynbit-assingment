(function () {
  const MARK = '\nSUGGEST:';
  const INITIAL = ['What services do you offer?', 'How can I contact you?', 'Tell me about BitElevate', 'Are you hiring?'];
  const GREETING = 'Hi, I’m Cynbit’s assistant. Ask me about our services, the BitElevate program, careers, or how to reach the team. I understand English, Hindi and Hinglish.';
  const $el = (t, p = {}, ...k) => { const e = document.createElement(t); Object.assign(e, p); e.append(...k); return e; };

  // ---- State (kept for this tab only) ----
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('chat') || 'null'); } catch (e) {}
  saved = saved || {};
  const sid = saved.sid || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  let history = Array.isArray(saved.history) ? saved.history : [];
  let suggestions = Array.isArray(saved.suggestions) ? saved.suggestions : INITIAL;
  let controller = null, busy = false, failed = null;
  const persist = () => { try { sessionStorage.setItem('chat', JSON.stringify({ sid, history: history.slice(-40), suggestions })); } catch (e) {} };

  // ---- Safe rich text: bold, bullet lists, links to cynbit.in, emails and phones. Never uses innerHTML. ----
  function safeHref(u) {
    if (u.startsWith('/') && !u.startsWith('//')) return { href: u, ext: false };
    try {
      const x = new URL(u);
      if (x.protocol === 'mailto:' || x.protocol === 'tel:') return { href: u, ext: false };
      if (x.protocol === 'https:' && (x.hostname === 'cynbit.in' || x.hostname.endsWith('.cynbit.in'))) return { href: x.href, ext: true };
    } catch (e) {}
    return null;
  }
  function link(label, href) {
    const s = safeHref(href);
    if (!s) return document.createTextNode(label);
    const a = $el('a', { href: s.href, textContent: label });
    if (s.ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }
  const TOKEN = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+\d[\d ]{8,}\d)/;
  function inline(parent, text) {
    text.split(TOKEN).forEach(part => {
      if (!part) return;
      let m;
      if ((m = part.match(/^\*\*(.+)\*\*$/))) parent.append($el('strong', { textContent: m[1] }));
      else if ((m = part.match(/^\[(.+)\]\((.+)\)$/))) parent.append(link(m[1], m[2]));
      else if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(part)) parent.append(link(part, 'mailto:' + part));
      else if (/^\+\d[\d ]{8,}\d$/.test(part)) parent.append(link(part, 'tel:' + part.replace(/ /g, '')));
      else parent.append(document.createTextNode(part));
    });
  }
  function rich(el, text) {
    el.replaceChildren();
    let list = null;
    text.split('\n').forEach(line => {
      const li = line.match(/^\s*[-*] (.+)/);
      if (li) { if (!list) { list = $el('ul'); el.append(list); } const i = $el('li'); inline(i, li[1]); list.append(i); return; }
      list = null;
      if (!line.trim()) return;
      const p = $el('p'); inline(p, line); el.append(p);
    });
  }

  // The reply may end with a "SUGGEST:" line; hide it (and any half-streamed marker) from the bubble.
  function visible(text) {
    const i = text.indexOf(MARK);
    if (i >= 0) return text.slice(0, i).trimEnd();
    for (let k = MARK.length - 1; k > 0; k--) if (text.endsWith(MARK.slice(0, k))) return text.slice(0, -k);
    return text;
  }
  function parse(full) {
    const i = full.indexOf(MARK);
    const sug = i < 0 ? [] : full.slice(i + MARK.length).split('|').map(s => s.trim()).filter(Boolean).slice(0, 3).map(s => s.slice(0, 60));
    return { body: (i < 0 ? full : full.slice(0, i)).trim(), sug };
  }

  // ---- UI ----
  const fab = $el('button', { className: 'cb-fab', type: 'button' });
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  fab.append($el('span', { textContent: 'Chat with us' }));
  fab.setAttribute('aria-expanded', 'false');

  const newBtn = $el('button', { className: 'cb-icon cb-new', type: 'button', textContent: '\u21BB' });
  newBtn.setAttribute('aria-label', 'Start a new chat');
  const closeBtn = $el('button', { className: 'cb-icon', type: 'button', textContent: '\u00D7' });
  closeBtn.setAttribute('aria-label', 'Close chat');
  const head = $el('div', { className: 'cb-head' }, $el('div', { className: 'cb-avatar', textContent: 'c' }),
    $el('div', { className: 'cb-title' }, $el('strong', { textContent: 'Cynbit assistant' }), $el('small', {}, $el('span', { className: 'cb-dot' }), 'Online, replies instantly')),
    newBtn, closeBtn);

  const log = $el('div', { className: 'cb-log', tabIndex: 0 });
  log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', 'Chat messages');
  const chips = $el('div', { className: 'cb-chips' });
  const input = $el('textarea', { rows: 1, maxLength: 500, placeholder: 'Ask anything about Cynbit' });
  input.setAttribute('aria-label', 'Your message');
  const send = $el('button', { className: 'cb-send', type: 'submit', textContent: 'Send' });
  const form = $el('form', { className: 'cb-form' }, input, send);
  const handoff = $el('button', { className: 'cb-handoff', type: 'button', textContent: 'Talk to the team' });
  const foot = $el('div', { className: 'cb-foot' }, $el('span', { textContent: 'AI assistant. Double-check important details.' }), handoff);
  const panel = $el('section', { className: 'cb-panel', hidden: true }, head, log, chips, form, foot);
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Cynbit assistant chat');
  document.body.append(panel, fab);

  const fmtTime = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const scroll = () => { log.scrollTop = log.scrollHeight; };
  function addMsg(role, text, t, extra) {
    const body = $el('div', { className: 'cb-body' });
    if (role === 'user') body.textContent = text; else if (text) rich(body, text);
    const wrap = $el('div', { className: 'cb-msg cb-' + role + (extra ? ' ' + extra : '') }, body);
    if (t) wrap.append($el('small', { className: 'cb-time', textContent: fmtTime(t) }));
    log.append(wrap); scroll();
    return { wrap, body };
  }
  function setChips(list) {
    chips.replaceChildren(...list.map(t => $el('button', { type: 'button', textContent: t, onclick: () => ask(t) })));
    chips.hidden = busy || !list.length;
  }
  function renderAll() {
    log.replaceChildren(); failed = null;
    if (!history.length) { addMsg('bot', GREETING, null); suggestions = INITIAL; }
    history.forEach(m => addMsg(m.role === 'user' ? 'user' : 'bot', m.content, m.t));
    setChips(suggestions);
  }
  function setBusy(b) {
    busy = b; send.textContent = b ? 'Stop' : 'Send';
    send.setAttribute('aria-label', b ? 'Stop generating' : 'Send message');
    if (b) chips.hidden = true;
  }

  // ---- Chat ----
  async function ask(text) {
    if (busy) return;
    if (failed) { failed.node.remove(); failed = null; }
    const now = Date.now();
    history.push({ role: 'user', content: text, t: now });
    const userMsg = addMsg('user', text, now);
    const m = addMsg('bot', '', null);
    const dots = $el('span', { className: 'cb-typing' }, $el('i'), $el('i'), $el('i'), $el('span', { className: 'cb-sr', textContent: 'Assistant is typing' }));
    m.body.append(dots); setBusy(true); persist();
    controller = new AbortController();
    let full = '';
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: history.slice(-12).map(({ role, content }) => ({ role, content })), sessionId: sid })
      });
      if (!r.ok) throw new Error(r.status === 429 ? 'You’re sending messages quickly. Please wait a minute and try again.' : 'Something went wrong. Please try again.');
      const rd = r.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        full += dec.decode(value, { stream: true });
        rich(m.body, visible(full)); scroll();
      }
      const { body, sug } = parse(full);
      if (!body) throw new Error('No reply received. Please try again.');
      rich(m.body, body); m.wrap.append($el('small', { className: 'cb-time', textContent: fmtTime(Date.now()) }));
      history.push({ role: 'assistant', content: body, t: Date.now() }); suggestions = sug;
    } catch (e) {
      const partial = e.name === 'AbortError' ? parse(full).body : '';
      if (partial) {
        rich(m.body, partial); m.wrap.append($el('small', { className: 'cb-time', textContent: 'Stopped' }));
        history.push({ role: 'assistant', content: partial, t: Date.now() }); suggestions = INITIAL.slice(0, 3);
      } else {
        m.wrap.remove(); history.pop();
        if (e.name === 'AbortError') { userMsg.wrap.remove(); input.value = text; }
        else {
          const retry = $el('button', { className: 'cb-retry', type: 'button', textContent: 'Try again' });
          const err = addMsg('bot', e.message, null, 'cb-err'); err.wrap.append(retry);
          failed = { node: err.wrap };
          retry.onclick = () => { err.wrap.remove(); userMsg.wrap.remove(); failed = null; ask(text); };
        }
      }
    }
    controller = null; setBusy(false); persist(); setChips(failed ? [] : suggestions); input.focus();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (busy) { if (controller) controller.abort(); return; }
    const t = input.value.trim();
    if (!t) return;
    input.value = ''; input.style.height = 'auto'; ask(t);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });

  function toggle(open) {
    panel.hidden = !open; fab.hidden = open; fab.setAttribute('aria-expanded', String(open));
    if (open) { scroll(); input.focus(); } else fab.focus();
  }
  fab.onclick = () => toggle(true);
  closeBtn.onclick = () => toggle(false);
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  newBtn.onclick = () => { if (controller) controller.abort(); history = []; suggestions = INITIAL; persist(); renderAll(); input.focus(); };

  // Hand the conversation to a human: prefill the contact form with what the visitor asked
  handoff.onclick = () => {
    const f = document.getElementById('lead-form');
    if (!f) { location.href = '/contact'; return; }
    const again = document.getElementById('again');
    if (f.hidden && again) again.click();
    const asked = history.filter(m => m.role === 'user').map(m => m.content).slice(-3).join('\n- ');
    if (asked && !f.elements.message.value) {
      f.elements.message.value = ('From the chat, I asked:\n- ' + asked).slice(0, 2000);
      f.elements.message.dispatchEvent(new Event('input', { bubbles: true }));
    }
    toggle(false); f.scrollIntoView({ behavior: 'smooth', block: 'start' }); f.elements.name.focus({ preventScroll: true });
  };

  renderAll();
})();