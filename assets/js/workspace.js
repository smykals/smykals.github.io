// Homepage behavior on top of shell.js: workspace scenes, detail panels, capability
// highlighting, lab-floor connection paths, and pausing animation offscreen.
// Without this script every scene shows in sequence and every hotspot is a plain link or listed.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const Shell = window.Shell;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* Workspace scenes ------------------------------------------------------------------- */
  const stage = $('#workspace');
  const tabs = $$('[role="tab"]', stage);
  const scenes = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  stage.classList.add('js-tabs');
  function show(id, scroll = false, focusTab = false) {
    const i = Math.max(0, scenes.findIndex((s) => s.id === id));
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; scenes[k].hidden = k !== i; });
    if (focusTab) tabs[i].focus();
    if (scroll) { stage.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); history.replaceState(null, '', '#' + scenes[i].id); }
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

  function goTo(hash) {
    if (hash.startsWith('#scene-')) { show(hash.slice(1), true); return; }
    const t = document.querySelector(hash);
    if (t) { t.scrollIntoView(); history.replaceState(null, '', hash); }
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-view') || a.getAttribute('href').length < 2) return;
    const hash = a.getAttribute('href');
    const inOverlay = Shell.contains(a);
    if (!hash.startsWith('#scene-') && !inOverlay) return; // ordinary anchors: browser default
    e.preventDefault();
    if (inOverlay) Shell.close({ restore: false });
    setTimeout(() => goTo(hash), 20);
  });

  /* Lab floor: connection paths light up for the selected equipment, with one brief pulse --- */
  function lightPaths(ids, pulse) {
    $$('.paths-art path').forEach((p) => p.classList.toggle('lit', ids.includes(p.id)));
    if (!pulse || reduced.matches) return;
    ids.forEach((id) => { const p = document.getElementById(id); if (!p) return; p.classList.remove('pulse'); void p.getBBox(); p.classList.add('pulse'); setTimeout(() => p.classList.remove('pulse'), 1150); });
  }
  $$('[data-paths]').forEach((el) => {
    const ids = el.dataset.paths.split(' ');
    el.addEventListener('mouseenter', () => lightPaths(ids, false));
    el.addEventListener('focus', () => lightPaths(ids, false));
    el.addEventListener('mouseleave', () => { if (!el.hasAttribute('aria-expanded')) lightPaths([], false); });
    el.addEventListener('click', () => lightPaths(ids, true));
  });

  /* Detail panels ---------------------------------------------------------------------------- */
  const drawer = $('#drawer'), body = $('#drawer-body'), kicker = $('#drawer-kicker');
  let viewId = null;
  function markOpener(on) {
    $$('[data-view][aria-expanded]').forEach((el) => el.removeAttribute('aria-expanded'));
    if (on && viewId) $$(`[data-view="${viewId}"]`).forEach((el) => el.setAttribute('aria-expanded', 'true'));
  }
  Shell.register('detail', {
    el: drawer, scrim: $('#scrim'),
    onClose: () => { markOpener(false); viewId = null; lightPaths([], false); if (history.state && history.state.view) history.back(); }
  });
  function openView(id, from, push = true) {
    const tpl = document.getElementById('view-' + id);
    if (!tpl) return false;
    body.replaceChildren(tpl.content.cloneNode(true));
    const title = $('.d-title', body); if (title) title.id = 'drawer-title';
    kicker.textContent = tpl.dataset.kicker || '';
    viewId = id;
    if (push) history.pushState({ view: id }, '', '#view-' + id);
    Shell.open('detail', from, $('#drawer-close'));
    drawer.scrollTop = 0;
    markOpener(true);
    return true;
  }
  document.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-view]');
    if (!hit || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (openView(hit.dataset.view, hit)) e.preventDefault();
  });
  $('#drawer-close').addEventListener('click', () => Shell.close());
  window.addEventListener('popstate', (e) => {
    const id = e.state && e.state.view;
    if (id) openView(id, null, false);
    else if (Shell.isOpen('detail')) Shell.close();
  });
  if (location.hash.startsWith('#view-')) {
    const id = location.hash.slice(6);
    history.replaceState(null, '', location.pathname + location.search);
    openView(id, document.querySelector(`[data-view="${id}"]`));
  }

  /* Capability highlighting ------------------------------------------------------------------- */
  const NAMES = { networking: 'Networking', systems: 'Systems', itot: 'IT/OT', leadership: 'Leadership' };
  const status = $('#cap-status'), reset = $('.cap-reset'), cmap = $('.cmap');
  function selectCap(cap) {
    const on = cap && document.body.dataset.cap !== cap ? cap : '';
    if (on) document.body.dataset.cap = on; else delete document.body.dataset.cap;
    $$('[data-cap-select]').forEach((b) => { if (b !== reset) b.setAttribute('aria-pressed', String(b.dataset.capSelect === on)); });
    reset.disabled = !on;
    const hits = $$('[data-cap]').filter((el) => el !== document.body && on && el.dataset.cap.split(' ').includes(on));
    $$('[data-cap]').forEach((el) => el.classList.toggle('cap-on', hits.includes(el)));
    $$('.cmap path').forEach((p) => p.classList.toggle('lit', p.dataset.c === on));
    cmap.classList.toggle('dim', !!on);
    if (!on) { status.textContent = 'Showing all evidence.'; return; }
    const names = $$('.cm-ev li.cap-on a').map((a) => a.textContent);
    status.textContent = `${NAMES[on]}: ${names.join(', ')}. ${hits.length} related items highlighted across the page.`;
  }
  $$('[data-cap-select]').forEach((b) => b.addEventListener('click', () => selectCap(b.dataset.capSelect)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.dataset.cap && !document.documentElement.classList.contains('overlay-open')) selectCap(''); });

  /* Pause scene animation offscreen ------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('paused', !en.isIntersecting)), { rootMargin: '80px' });
  $$('.glimpse, #workspace, #games').forEach((el) => io.observe(el));
  $('#scene-floor .floor-art').classList.add('live');
})();
