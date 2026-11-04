// Workspace stage tabs: rack, Checking the Line, Fortinet lab. Without this script all three scenes show in sequence.
(() => {
  const stage = document.getElementById('stage');
  if (!stage) return;
  const tabs = [...stage.querySelectorAll('[role="tab"]')];
  const scenes = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  stage.classList.add('js-tabs');

  function show(sceneId, scroll = false, focusTab = false) {
    const i = Math.max(0, scenes.findIndex((s) => s.id === sceneId));
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; scenes[k].hidden = k !== i; });
    if (focusTab) tabs[i].focus();
    if (scroll) {
      stage.scrollIntoView({ block: 'start' });
      history.replaceState(null, '', '#' + scenes[i].id);
    }
  }
  window.wsShowScene = show;

  tabs.forEach((t, k) => {
    t.addEventListener('click', () => show(scenes[k].id));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); show(scenes[e.key === 'Home' ? 0 : tabs.length - 1].id, false, true); }
      else if (d) { e.preventDefault(); show(scenes[(k + d + tabs.length) % tabs.length].id, false, true); }
    });
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#scene-"]');
    if (!a || a.closest('#drawer')) return;
    e.preventDefault();
    show(a.getAttribute('href').slice(1), true);
    const nav = document.getElementById('nav'); if (nav) nav.classList.remove('open');
  });
  const initial = location.hash.startsWith('#scene-') ? location.hash.slice(1) : scenes[0].id;
  show(initial, location.hash.startsWith('#scene-'));
})();

// Workspace drawer: rack units, KPI cards, charts and lab hotspots open a focused view.
// Every hotspot is a real link or has the same content elsewhere, so the page works without this script.
(() => {
  const drawer = document.getElementById('drawer');
  const scrim = document.getElementById('scrim');
  const body = document.getElementById('drawer-body');
  const kicker = document.getElementById('drawer-kicker');
  const closeBtn = document.getElementById('drawer-close');
  if (!drawer) return;

  let opener = null;
  let openId = null;

  const focusables = () => [...drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];

  function render(id) {
    const tpl = document.getElementById('view-' + id);
    if (!tpl) return false;
    body.replaceChildren(tpl.content.cloneNode(true));
    const title = body.querySelector('.d-title');
    if (title) title.id = 'drawer-title';
    kicker.textContent = tpl.dataset.kicker || '';
    return true;
  }

  function markOpener(on) {
    document.querySelectorAll('[data-view][aria-expanded]').forEach((el) => el.removeAttribute('aria-expanded'));
    if (on && openId) document.querySelectorAll(`[data-view="${openId}"]`).forEach((el) => el.setAttribute('aria-expanded', 'true'));
  }

  function open(id, from, push = true) {
    if (!render(id)) return false;
    opener = from || opener;
    openId = id;
    drawer.hidden = false; scrim.hidden = false;
    drawer.classList.remove('in'); scrim.classList.remove('in');
    void drawer.offsetWidth; // restart the entrance
    drawer.classList.add('in'); scrim.classList.add('in');
    document.documentElement.classList.add('drawer-open');
    drawer.scrollTop = 0;
    markOpener(true);
    if (push) history.pushState({ view: id }, '', '#view-' + id);
    closeBtn.focus();
    return true;
  }

  function close(fromHistory = false) {
    if (drawer.hidden) return;
    drawer.hidden = true; scrim.hidden = true;
    document.documentElement.classList.remove('drawer-open');
    markOpener(false);
    openId = null;
    if (!fromHistory && history.state && history.state.view) history.back();
    else if (!fromHistory && location.hash.startsWith('#view-')) history.replaceState(null, '', location.pathname + location.search);
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  document.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-view]');
    if (!hit || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (open(hit.dataset.view, hit)) e.preventDefault();
  });

  // Links inside the drawer that point to this page close it first, then scroll.
  body.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const target = a.getAttribute('href');
    close();
    setTimeout(() => {
      if (target.startsWith('#scene-') && window.wsShowScene) { window.wsShowScene(target.slice(1), true); return; }
      const t = document.querySelector(target); if (t) { t.scrollIntoView(); history.replaceState(null, '', target); }
    }, 30);
  });

  closeBtn.addEventListener('click', () => close());
  scrim.addEventListener('click', () => close());

  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Back button closes the drawer; a shared #view- link opens it.
  window.addEventListener('popstate', (e) => {
    const id = (e.state && e.state.view) || (location.hash.startsWith('#view-') ? location.hash.slice(6) : null);
    if (id) open(id, null, false); else close(true);
  });
  if (location.hash.startsWith('#view-')) {
    const id = location.hash.slice(6);
    history.replaceState(null, '', location.pathname + location.search);
    open(id, document.querySelector(`[data-view="${id}"]`));
  }
})();
