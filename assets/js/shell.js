// Site shell: sidebar navigation, portfolio search, footer links and one-overlay-at-a-time
// handling for every page. The homepage ships this markup statically; inner pages get it
// injected here and keep their original header and footer when JavaScript is off.
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

  /* Navigation model: same destinations everywhere; the homepage uses in-page anchors. */
  const ICON = {
    overview: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
    experience: '<rect x="3" y="7.5" width="18" height="12" rx="1.5"/><path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
    skills: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    work: '<path d="M3 20V10l5 3V10l5 3V6h3l1 6h3v8z"/>',
    lab: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3M7.5 15h9"/>',
    games: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="18" cy="13.5" r="1"/>',
    journal: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
    resume: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    contact: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'
  };
  const NAV = [
    [null, [['overview', 'Overview', '#top', 'index.html']]],
    ['Career', [['experience', 'Experience', '#experience', 'professional-experience.html'], ['skills', 'Skills', '#skills', 'technical-skills.html'], ['work', 'Professional Work', '#work', 'index.html#work']]],
    ['Lab & Play', [['lab', 'Lab Projects', '#lab', 'index.html#lab'], ['games', 'Games', '#games', 'interactive/'], ['journal', 'Field Journal', '#journal', 'journal/']]],
    ['Connect', [['resume', 'Résumé', 'professional-experience.html', 'professional-experience.html'], ['contact', 'Contact', '#contact', 'index.html#contact']]]
  ];
  // Which destination an inner page belongs to, for the active state.
  const SECTION = {
    experience: ['professional-experience.html'], skills: ['technical-skills.html'],
    work: ['weighing-labeling-fault', 'plant-network-refresh', 'production-data-connectivity', 'data-center-core-infrastructure', 'campus-network-leadership', 'field-team-leadership', 'technician-development', 'green-belt-case-study'],
    lab: ['network-lab', 'ot-network-lab', 'proto-lab-evidence', 'virtualization-lab', 'aiio', 'monitrope', 'do2', 'ccna-lab', 'ccna-study-laptop', 'technical-evidence'],
    games: ['interactive/', 'game-'], journal: ['journal/']
  };
  const path = location.pathname.replace(ROOT.replace(location.origin, ''), '');
  const current = Object.keys(SECTION).find((k) => SECTION[k].some((p) => path.includes(p)));

  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const SOCIAL = `<ul class="socials" aria-label="Contact and social links">
    <li><a href="mailto:shanemykalstark@gmail.com" aria-label="Email Shane Stark">${'<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.contact + '</svg>'}Email</a></li>
    <li><a href="https://www.linkedin.com/in/SHANEMYKALSTARK" rel="noopener" aria-label="Shane Stark on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M8 10.5V17M8 7.5v.01M11.5 17v-6.5M11.5 13.5c0-2 1.2-3 2.7-3s2.3 1 2.3 3V17"/></svg>LinkedIn</a></li>
    <li><a href="https://www.instagram.com/smykalsbuilds/" rel="noopener" aria-label="@smykalsbuilds on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7v.01"/></svg>Instagram <span class="handle">@smykalsbuilds</span></a></li>
    <li><a href="https://github.com/smykals" rel="noopener" aria-label="smykals on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.4c3-.3 6.1-1.5 6.1-6.7a5.2 5.2 0 0 0-1.4-3.6 4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.7 12.7 0 0 0-6.6 0C5.8 1 4.7 1.3 4.7 1.3a4.9 4.9 0 0 0-.1 3.6A5.2 5.2 0 0 0 3.2 8.4c0 5.2 3.1 6.4 6.1 6.7a3 3 0 0 0-.9 2.3V21"/></svg>GitHub</a></li>
  </ul>`;

  /* Inject the shell on inner pages ------------------------------------------------- */
  if (!$('#side')) {
    const nav = NAV.map(([group, items]) => `<div class="side-group">${group ? `<span>${group}</span>` : ''}${items.map(([k, label, , page]) =>
      `<a href="${ROOT}${page}" data-nav="${k}" data-tip="${label}"${k === current ? ' class="active" aria-current="page"' : ''}>${svg(k)}<span class="lbl">${label}</span></a>`).join('')}</div>`).join('');
    const back = $('.site-head .back');
    const shell = document.createElement('div');
    shell.innerHTML = `
      <div class="mbar"><button type="button" class="mbar-btn" id="menu-open" aria-controls="side" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span></button><a class="mbar-name" href="${ROOT}index.html">Shane Stark</a><button type="button" class="mbar-btn ask-open" aria-controls="search" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><span>Ask</span></button></div>
      <nav class="side" id="side" aria-label="Main">
        <div class="side-head"><a class="side-brand" href="${ROOT}index.html"><img src="${ROOT}assets/img/shane-avatar.webp" width="320" height="320" alt=""><span class="lbl">Shane Stark</span></a><button type="button" class="side-close" id="menu-close" aria-label="Close menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
        <div class="side-nav">${nav}</div>
        <button type="button" class="side-toggle" id="side-toggle" aria-expanded="true" aria-controls="side" data-tip="Collapse Sidebar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5"/></svg><span class="lbl">Collapse Sidebar</span></button>
      </nav>
      <div class="scrim nav-scrim" id="nav-scrim" hidden></div>
      <div class="utility">${back ? `<a class="u-back" href="${back.getAttribute('href')}">${back.textContent}</a>` : '<span class="u-label">Shane Stark · Portfolio</span>'}<button type="button" class="ask ask-open" aria-controls="search" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>Ask About My Experience</button></div>`;
    const skip = $('.skip, .skip-link');
    const anchor = skip ? skip.nextSibling : body.firstChild;
    [...shell.children].forEach((el) => body.insertBefore(el, anchor));
    const foot = document.createElement('footer');
    foot.className = 'site-foot';
    foot.innerHTML = `<span>© 2026 Shane Stark. Built by hand, hosted on GitHub Pages.</span>${SOCIAL}`;
    body.appendChild(foot);
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
  function open(name, from, focusEl) {
    if (active && active !== name) close({ restore: false, quiet: true });
    const o = overlays[name];
    if (active !== name) returnFocus = from || document.activeElement;
    active = name;
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
  window.Shell = { open, close, register: (name, o) => { overlays[name] = o; }, isOpen: (n) => active === n, contains: (el) => !!(active && overlays[active].el.contains(el)), ROOT, SOCIAL };

  /* Sidebar ---------------------------------------------------------------------------- */
  const side = $('#side'), toggle = $('#side-toggle'), menuOpen = $('#menu-open');
  function setCollapsed(c, save = true) {
    body.classList.toggle('side-collapsed', c);
    toggle.setAttribute('aria-expanded', String(!c));
    const label = c ? 'Expand Sidebar' : 'Collapse Sidebar';
    toggle.querySelector('.lbl').textContent = label; toggle.dataset.tip = label;
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
