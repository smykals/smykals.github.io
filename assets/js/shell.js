// Shared Jekyll includes render the shell; enhance navigation and portfolio search here.
(() => {
  const script = document.currentScript;
  const ROOT = new URL('../../', script.src).href;           // site root, from this file's location
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* preference not remembered */ } }
  };
  const body = document.body;
  const isHome = body.classList.contains('home');
  body.classList.add('themed', 'has-shell');

  // Which destination an inner page belongs to, for the active state.
  const SECTION = {
    experience: ['professional-experience.html'], skills: ['technical-skills.html'],
    work: ['weighing-labeling-fault', 'plant-network-refresh', 'production-data-connectivity', 'data-center-core-infrastructure', 'campus-network-leadership', 'field-team-leadership', 'technician-development', 'green-belt-case-study'],
    lab: ['network-lab', 'ot-network-lab', 'proto-lab-evidence', 'virtualization-lab', 'aiio', 'monitrope', 'do2', 'ccna-lab', 'ccna-study-laptop', 'technical-evidence'],
    games: ['interactive/', 'game-', 'packet-game'], journal: ['journal/']
  };
  const path = location.pathname.replace(ROOT.replace(location.origin, ''), '');
  const current = path.startsWith('journal/') ? 'journal'
    : path.startsWith('interactive/') ? 'games'
    : Object.keys(SECTION).find((k) => SECTION[k].some((p) => path === p || path === p + '.html' || (p === 'game-' && path.startsWith(p)))) || 'overview';

  // Mark the current page using the shared include's navigation model.
  if (!isHome && current) {
    const link = $(`[data-nav="${current}"]`, $('#side'));
    if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
  }
  if (!$('#search')) {
    const sheet = document.createElement('aside');
    sheet.className = 'sheet search'; sheet.id = 'search'; sheet.hidden = true; sheet.tabIndex = -1;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'search-title');
    sheet.innerHTML = `<div class="sheet-bar"><h2 id="search-title">Ask About My Experience</h2><button type="button" class="sheet-close" data-close>Close <span aria-hidden="true">✕</span></button></div>
      <p class="search-note">Portfolio search. Results come only from pages on this site, not from an AI.</p>
      <form class="search-form" role="search" id="search-form"><label class="vh" for="search-q">Search my portfolio</label><input id="search-q" type="search" autocomplete="off" placeholder="Try “Fortinet” or “team leadership”"><button type="submit">Search</button></form>
      <div class="suggest" id="search-suggest"><p>Suggested questions</p><button type="button">Show me networking experience</button><button type="button">What teams has Shane led?</button><button type="button">Find Fortinet projects</button><button type="button">Show manufacturing IT/OT experience</button></div>
      <p class="vh" id="search-status" aria-live="polite"></p><ol class="results" id="search-results"></ol>`;
    body.appendChild(sheet);
    const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'scrim'; scrim.hidden = true; body.appendChild(scrim);
  }

  /* Overlays: one at a time ---------------------------------------------------------- */
  const overlays = {};
  let active = null, returnFocus = null;
  let inerted = [];
  function restoreBackground() { inerted.forEach((el) => { el.inert = false; }); inerted = []; }

  function open(name, from, focusEl) {
    if (active && active !== name) close({ restore: false, quiet: true });
    const o = overlays[name];
    if (active !== name) returnFocus = from || document.activeElement;
    active = name;
    [...body.children].forEach((el) => {
      if (el !== o.el && el !== o.scrim && !el.inert && !['SCRIPT', 'STYLE'].includes(el.tagName)) { el.inert = true; inerted.push(el); }
    });
    if (!o.persistent) o.el.hidden = false;
    if (o.scrim) o.scrim.hidden = false;
    o.el.classList.remove('in'); void o.el.offsetWidth; o.el.classList.add('in');
    document.documentElement.classList.add('overlay-open');
    (focusEl || o.el).focus();
  }
  function close({ restore = true, quiet = false } = {}) {
    if (!active) return;
    const o = overlays[active];
    if (!o.persistent) o.el.hidden = true;
    if (o.scrim) o.scrim.hidden = true;
    document.documentElement.classList.remove('overlay-open');
    active = null;
    restoreBackground();
    if (o.onClose) o.onClose(quiet);
    if (restore && returnFocus && document.contains(returnFocus) && returnFocus.offsetParent !== null) returnFocus.focus();
    returnFocus = null;
  }
  document.addEventListener('keydown', (e) => {
    if (!active) return;
    const el = overlays[active].el;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), input, [tabindex="0"]', el).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  window.Shell = { open, close, register: (name, o) => { overlays[name] = o; }, isOpen: (n) => active === n, contains: (el) => !!(active && overlays[active].el.contains(el)), ROOT };

  /* Sidebar ---------------------------------------------------------------------------- */
  const side = $('#side'), toggle = $('#side-toggle'), menuOpen = $('#menu-open');
  function setCollapsed(c, save = true) {
    body.classList.toggle('side-collapsed', c);
    toggle.setAttribute('aria-expanded', String(!c));
    const label = c ? 'Expand Sidebar' : 'Collapse Sidebar';
    toggle.setAttribute('aria-label', label);
    toggle.querySelector('.lbl').textContent = label; toggle.dataset.tip = label; toggle.title = label;
    if (save) store.set('ws-sidebar', c ? 'collapsed' : 'expanded');
  }
  setCollapsed(store.get('ws-sidebar') === 'collapsed', false);   // first visit: labels shown
  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('shell-ready'))); // no transition on first paint
  toggle.addEventListener('click', () => setCollapsed(!body.classList.contains('side-collapsed')));
  overlays.nav = { el: side, scrim: $('#nav-scrim'), persistent: true, onClose: () => { side.classList.remove('open'); menuOpen.setAttribute('aria-expanded', 'false'); } };
  menuOpen.addEventListener('click', () => { side.classList.add('open'); menuOpen.setAttribute('aria-expanded', 'true'); open('nav', menuOpen, $('.side-group a', side)); });
  $('#menu-close').addEventListener('click', () => close());
  $('#nav-scrim').addEventListener('click', () => close());
  side.addEventListener('click', (e) => { if (e.target.closest('.side-group a') && active === 'nav') close({ restore: false }); });
  matchMedia('(max-width: 900px)').addEventListener('change', () => { if (active === 'nav') close({ restore: false }); });

  if (isHome) {
    const links = $$('.side-group a[data-nav]').filter((a) => a.getAttribute('href').startsWith('#'));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => { const on = a.getAttribute('href') === '#' + e.target.id; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }), { rootMargin: '-30% 0px -65% 0px' });
    links.forEach((a) => { const t = $(a.getAttribute('href')); if (t) io.observe(t); });
  }

  $$('.contact-link, [data-nav="contact"]').forEach((link) => link.addEventListener('click', () => {
    if (active) close({ restore: false });
    $('#contact').focus({ preventScroll: true });
  }));

  /* Portfolio search --------------------------------------------------------------------- */
  const sheet = $('#search'), form = $('#search-form'), input = $('#search-q'), list = $('#search-results'), status = $('#search-status'), suggest = $('#search-suggest');
  overlays.search = { el: sheet, scrim: $('#scrim') };
  let engine = null;
  function loadEngine() {
    if (window.PortfolioSearch) return Promise.resolve(window.PortfolioSearch);
    if (engine) return engine;
    engine = new Promise((res, rej) => { const s = document.createElement('script'); s.src = ROOT + 'assets/js/portfolio-search.js'; s.onload = () => res(window.PortfolioSearch); s.onerror = rej; document.head.appendChild(s); });
    return engine;
  }
  $$('.ask-open').forEach((b) => b.addEventListener('click', () => { loadEngine().catch(() => {}); open('search', b, input); }));
  $('[data-close]', sheet).addEventListener('click', () => close());
  $('#scrim').addEventListener('click', () => close());

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mark = (text, terms) => {
    let out = esc(text);
    terms.filter((t) => t.length > 2).forEach((t) => { out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return out;
  };
  const LABEL = { professional: 'Professional', lab: 'Lab', journal: 'Field Journal', about: 'About', games: 'Games' };
  const resolve = (url) => (url.startsWith('#') ? (isHome ? url : ROOT + 'index.html' + url) : ROOT + url);
  async function run(q) {
    q = q.trim();
    if (!q) { list.replaceChildren(); status.textContent = ''; suggest.hidden = false; return; }
    let r;
    try { const ps = await loadEngine(); r = await ps.ask(q, ROOT); }
    catch { list.innerHTML = '<li class="empty"><b>Search isn’t available right now.</b> Use the sidebar to browse experience, skills and projects.</li>'; return; }
    if (!r.results.length) {
      list.innerHTML = `<li class="empty"><b>No matches for “${esc(q)}”.</b> The portfolio may not cover that. Try a suggested question, or browse <a href="${ROOT}professional-experience.html">full experience</a> and <a href="${ROOT}technical-skills.html">skills</a>.</li>`;
      suggest.hidden = false; status.textContent = 'No results.'; return;
    }
    suggest.hidden = true;
    list.innerHTML = r.results.map((x) => `<li><a href="${esc(resolve(x.url))}"><span class="r-cat ${x.category}">${LABEL[x.category] || ''}</span><b>${mark(x.title, x.terms)}</b>${x.section ? `<span class="r-sec">${mark(x.section, x.terms)}</span>` : ''}<span class="r-ex">${mark(x.excerpt, x.terms)}</span></a></li>`).join('');
    status.textContent = `${r.results.length} results for ${q}.`;
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
  let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => run(input.value), 160); });
  $$('button', suggest).forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; run(b.textContent); input.focus(); }));
  list.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a && a.getAttribute('href').startsWith('#')) close({ restore: false }); });
  list.addEventListener('keydown', (e) => {
    const links = $$('a', list), i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? links[i - 1] : input).focus(); }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { const a = $('a', list); if (a) { e.preventDefault(); a.focus(); } } });
})();
