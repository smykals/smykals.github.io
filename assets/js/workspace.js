// Homepage behavior: sidebar, workspace scenes, detail panels and portfolio search.
// Everything on the page is readable without this script: links still go to their pages,
// all workspace scenes show in sequence, and the search control is the only thing that needs it.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked: preference just isn't remembered */ } }
  };
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  /* One overlay at a time ------------------------------------------------------------ */
  // Each overlay: { el, scrim, onClose }. Opening one closes the other, so panels never stack or trap focus.
  const overlays = {};
  let active = null, returnFocus = null;

  function trap(e) {
    if (!active) return;
    const el = overlays[active].el;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), input, [tabindex="0"]', el).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(name, from, focusEl) {
    if (active && active !== name) close({ restore: false, quiet: true });
    const o = overlays[name];
    if (!returnFocus || active !== name) returnFocus = from || document.activeElement;
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
    const name = active; active = null;
    if (o.onClose) o.onClose(quiet);
    if (restore && returnFocus && document.contains(returnFocus) && returnFocus.offsetParent !== null) returnFocus.focus();
    returnFocus = null;
    return name;
  }
  document.addEventListener('keydown', trap);

  /* Sidebar ----------------------------------------------------------------------------- */
  const side = $('#side'), toggle = $('#side-toggle'), navScrim = $('#nav-scrim'), menuOpen = $('#menu-open');
  function setCollapsed(c, save = true) {
    document.body.classList.toggle('side-collapsed', c);
    toggle.setAttribute('aria-expanded', String(!c));
    toggle.querySelector('.lbl').textContent = c ? 'Expand sidebar' : 'Collapse sidebar';
    toggle.dataset.tip = c ? 'Expand sidebar' : 'Collapse sidebar';
    if (save) store.set('ws-sidebar', c ? 'collapsed' : 'expanded');
  }
  setCollapsed(store.get('ws-sidebar') === 'collapsed', false);
  toggle.addEventListener('click', () => setCollapsed(!document.body.classList.contains('side-collapsed')));

  overlays.nav = { el: side, scrim: navScrim, persistent: true, onClose: () => { side.classList.remove('open'); menuOpen.setAttribute('aria-expanded', 'false'); } };
  menuOpen.addEventListener('click', () => { side.classList.add('open'); menuOpen.setAttribute('aria-expanded', 'true'); open('nav', menuOpen, $('.side-list a', side)); });
  $('#menu-close').addEventListener('click', () => close());
  navScrim.addEventListener('click', () => close());
  side.addEventListener('click', (e) => { if (e.target.closest('.side-list a') && active === 'nav') close({ restore: false }); });
  // The sidebar is only an overlay on small screens.
  matchMedia('(max-width: 900px)').addEventListener('change', () => { if (active === 'nav') close({ restore: false }); });

  const navLinks = $$('.side-list a[data-nav]');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => {
      const on = a.dataset.nav === e.target.id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }), { rootMargin: '-35% 0px -60% 0px' });
  navLinks.forEach((a) => { const t = document.getElementById(a.dataset.nav); if (t) io.observe(t); });

  /* Workspace scenes ---------------------------------------------------------------------- */
  const stage = $('#workspace');
  const tabs = $$('[role="tab"]', stage);
  const scenes = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  stage.classList.add('js-tabs');
  function show(id, scroll = false, focusTab = false) {
    const i = Math.max(0, scenes.findIndex((s) => s.id === id));
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; scenes[k].hidden = k !== i; });
    if (focusTab) tabs[i].focus();
    if (scroll) { stage.scrollIntoView({ block: 'start' }); history.replaceState(null, '', '#' + scenes[i].id); }
  }
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => show(scenes[k].id));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); show(scenes[e.key === 'Home' ? 0 : tabs.length - 1].id, false, true); }
      else if (d) { e.preventDefault(); show(scenes[(k + d + tabs.length) % tabs.length].id, false, true); }
    });
  });
  show(location.hash.startsWith('#scene-') ? location.hash.slice(1) : scenes[0].id, location.hash.startsWith('#scene-'));

  // Same-page links: scenes switch tabs; anything inside an overlay closes it first.
  function goTo(hash) {
    if (hash.startsWith('#scene-')) { show(hash.slice(1), true); return; }
    const t = document.querySelector(hash);
    if (t) { t.scrollIntoView(); history.replaceState(null, '', hash); }
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2 || e.defaultPrevented) return;
    const hash = a.getAttribute('href');
    const inOverlay = active && overlays[active].el.contains(a);
    if (!hash.startsWith('#scene-') && !inOverlay) return; // ordinary anchor: let the browser handle it
    e.preventDefault();
    if (inOverlay) close({ restore: false });
    setTimeout(() => goTo(hash), 20);
  });

  /* Detail panels -------------------------------------------------------------------------- */
  const drawer = $('#drawer'), body = $('#drawer-body'), kicker = $('#drawer-kicker');
  let viewId = null;
  function markOpener(on) {
    $$('[data-view][aria-expanded]').forEach((el) => el.removeAttribute('aria-expanded'));
    if (on && viewId) $$(`[data-view="${viewId}"]`).forEach((el) => el.setAttribute('aria-expanded', 'true'));
  }
  overlays.detail = {
    el: drawer, scrim: $('#scrim'),
    onClose: () => { markOpener(false); viewId = null; if (history.state && history.state.view) history.back(); }
  };
  function openView(id, from, push = true) {
    const tpl = document.getElementById('view-' + id);
    if (!tpl) return false;
    body.replaceChildren(tpl.content.cloneNode(true));
    const title = $('.d-title', body); if (title) title.id = 'drawer-title';
    kicker.textContent = tpl.dataset.kicker || '';
    viewId = id;
    if (push) history.pushState({ view: id }, '', '#view-' + id);
    open('detail', from, $('#drawer-close'));
    drawer.scrollTop = 0;
    markOpener(true);
    return true;
  }
  document.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-view]');
    if (!hit || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (openView(hit.dataset.view, hit)) e.preventDefault();
  });
  $('#drawer-close').addEventListener('click', () => close());
  $('#scrim').addEventListener('click', () => close());
  window.addEventListener('popstate', (e) => {
    const id = e.state && e.state.view;
    if (id) openView(id, null, false);
    else if (active === 'detail') close(); // state is already popped, so onClose won't go back again
  });
  if (location.hash.startsWith('#view-')) {
    const id = location.hash.slice(6);
    history.replaceState(null, '', location.pathname + location.search);
    openView(id, document.querySelector(`[data-view="${id}"]`));
  }

  /* Portfolio search ------------------------------------------------------------------------- */
  const sheet = $('#search'), form = $('#search-form'), input = $('#search-q'), list = $('#search-results'), status = $('#search-status'), suggest = $('#search-suggest');
  overlays.search = { el: sheet, scrim: $('#scrim') };
  $$('.ask-open').forEach((b) => b.addEventListener('click', () => open('search', b, input)));
  $('[data-close]', sheet).addEventListener('click', () => close());

  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mark = (text, terms) => {
    let out = esc(text);
    terms.filter((t) => t.length > 2).forEach((t) => { out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return out;
  };
  const LABEL = { professional: 'Professional', lab: 'Lab', journal: 'Journal', about: 'About' };

  async function run(q) {
    q = q.trim();
    if (!q) { list.replaceChildren(); status.textContent = ''; suggest.hidden = false; return; }
    let r;
    try { r = await window.PortfolioSearch.ask(q); }
    catch { list.innerHTML = '<li class="empty"><b>Search isn’t available right now.</b> Use the sidebar to browse experience, skills and projects.</li>'; return; }
    if (!r.results.length) {
      list.innerHTML = `<li class="empty"><b>No matches for “${esc(q)}”.</b> The portfolio may not cover that. Try one of these, or browse <a href="professional-experience.html">full experience</a> and <a href="technical-skills.html">skills</a>.</li>`;
      suggest.hidden = false;
      status.textContent = 'No results.';
      return;
    }
    suggest.hidden = true;
    list.innerHTML = r.results.map((x) => `<li><a href="${esc(x.url)}"><span class="r-cat ${x.category}">${LABEL[x.category] || ''}</span><b>${mark(x.title, x.terms)}</b><span>${mark(x.excerpt, x.terms)}</span></a></li>`).join('');
    status.textContent = `${r.results.length} results for ${q}.`;
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
  let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => run(input.value), 160); });
  $$('button', suggest).forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; run(b.textContent); input.focus(); }));
  list.addEventListener('keydown', (e) => {
    const links = $$('a', list), i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? links[i - 1] : input).focus(); }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { const a = $('a', list); if (a) { e.preventDefault(); a.focus(); } } });
})();
