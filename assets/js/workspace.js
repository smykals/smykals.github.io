// Homepage behavior on top of shell.js: Experience at a Glance, workspace scenes, detail panels,
// Career Evidence tabs, the capability map, lab-floor connection paths, and pausing animation offscreen.
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

  /* Tab sets: Career Evidence (and any future set) share one accessible pattern --------------- */
  function tabset(list, onShow) {
    const ts = $$('[role="tab"]', list);
    const views = ts.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const pick = (i, focus) => {
      ts.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; views[k].hidden = k !== i; });
      if (focus) ts[i].focus();
      if (onShow) onShow(views[i]);
    };
    ts.forEach((t, k) => {
      t.addEventListener('click', () => pick(k));
      t.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); pick(e.key === 'Home' ? 0 : ts.length - 1, true); }
        else if (d) { e.preventDefault(); pick((k + d + ts.length) % ts.length, true); }
      });
    });
    pick(0);
    return { pick, views };
  }

  /* Capability map: selecting or focusing a capability lights its paths and evidence ---------- */
  const NAMES = { networking: 'Networking', systems: 'Systems', field: 'Field Services', leadership: 'Leadership' };
  const SUPPORT = {
    networking: [['campus-network-leadership.html', 'Campus Network Leadership'], ['plant-network-refresh.html', "Replacing a Plant's Network While It Runs"], ['network-lab.html', 'Network Segmentation Lab'], ['technical-skills.html', 'Technical Skills']],
    systems: [['production-data-connectivity.html', 'Keeping Production Data Reachable'], ['virtualization-lab.html', 'Access, Storage and AI Hosts'], ['aiio.html', 'AIIO Station'], ['monitrope.html', 'MONITROPE']],
    field: [['technician-development.html', 'From Smart Home Professional to Team Trainer'], ['campus-network-leadership.html', 'Campus Network Leadership'], ['weighing-labeling-fault.html', 'Bags Weighed, but Never Labeled'], ['field-team-leadership.html', 'Leading Distributed IT Field Operations']],
    leadership: [['field-team-leadership.html', 'Leading Distributed IT Field Operations'], ['technician-development.html', 'From Technician to Team Trainer'], ['green-belt-case-study.html', 'Green Belt Case Study'], ['campus-network-leadership.html', 'Campus Network Leadership']]
  };
  const cmap = $('.cmap'), prompt = $('#cm-prompt'), links = $('#cm-links'), reset = $('.cm-reset');
  let selected = '';
  function paint(cap, pulse) {
    $$('.cmap path').forEach((p) => {
      const on = p.dataset.c === cap;
      p.classList.toggle('lit', on);
      if (on && pulse && !reduced.matches) { p.classList.remove('pulse'); void p.getBBox(); p.classList.add('pulse'); setTimeout(() => p.classList.remove('pulse'), 1050); }
    });
    $$('.cm-ev li').forEach((li) => li.classList.toggle('cap-on', !!cap && li.dataset.cap.split(' ').includes(cap)));
    cmap.classList.toggle('dim', !!cap);
    if (!cap) { prompt.textContent = 'Select or focus a capability to light up its evidence.'; links.hidden = true; return; }
    const items = $$('.cm-ev li.cap-on a').map((a) => a.textContent);
    prompt.innerHTML = `<b>${NAMES[cap]}</b> shows up in ${items.join(', ')}.`;
    links.innerHTML = SUPPORT[cap].map(([h, t]) => `<a href="${h}">${t}</a>`).join('');
    links.hidden = false;
  }
  function previewCap(cap) { paint(cap || selected, false); }
  function selectCap(cap) {
    selected = cap && selected !== cap ? cap : '';
    $$('.cm-caps [data-cap-select]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.capSelect === selected)));
    reset.disabled = !selected;
    paint(selected, true);
  }
  $$('.cm-caps [data-cap-select]').forEach((b) => {
    b.addEventListener('click', () => selectCap(b.dataset.capSelect));
    b.addEventListener('focus', () => previewCap(b.dataset.capSelect));
    b.addEventListener('mouseenter', () => previewCap(b.dataset.capSelect));
    b.addEventListener('mouseleave', () => previewCap(null));
    b.addEventListener('blur', () => previewCap(null));
  });
  reset.addEventListener('click', () => { selectCap(''); $('.cm-caps button').focus(); });
  $('#ev-map').addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected && !document.documentElement.classList.contains('overlay-open')) { e.stopPropagation(); selectCap(''); } });

  const evTabs = tabset($('.ev-tabs'), (view) => { if (view.id !== 'ev-map') selectCap(''); });
  // Links to an evidence view (for example from the capability map) switch to that tab.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#ev-"]');
    if (!a) return;
    const i = evTabs.views.findIndex((v) => '#' + v.id === a.getAttribute('href'));
    if (i < 0) return;
    e.preventDefault(); evTabs.pick(i, true);
  });

  /* Behind the Build portrait: hover or focus previews it; the button (tap or keyboard) keeps it open */
  const portrait = $('#portrait'), cue = $('.build-cue', portrait);
  cue.addEventListener('click', () => {
    const open = !portrait.classList.contains('flipped');
    portrait.classList.toggle('flipped', open);
    cue.setAttribute('aria-expanded', String(open));
    cue.lastChild.textContent = open ? ' Back to Portrait' : ' Behind the Build';
  });
  portrait.addEventListener('keydown', (e) => { if (e.key === 'Escape' && portrait.classList.contains('flipped')) { cue.click(); cue.focus(); } });

  /* Experience at a Glance -------------------------------------------------------------------- */
  const glance = $('.glance');
  const areas = $$('.gl-area', glance);
  const line = (a) => glance.querySelector(`.gl-lines path[data-area="${a.dataset.area}"]`);
  function light() { areas.forEach((a) => line(a).classList.toggle('lit', a.classList.contains('hl') || a.classList.contains('open'))); }
  areas.forEach((a) => {
    const btn = $('.gl-toggle', a);
    const on = () => { a.classList.add('hl'); light(); };
    const off = () => { a.classList.remove('hl'); light(); };
    a.addEventListener('mouseenter', on); a.addEventListener('mouseleave', off);
    a.addEventListener('focusin', on); a.addEventListener('focusout', (e) => { if (!a.contains(e.relatedTarget)) off(); });
    btn.addEventListener('click', () => {
      const open = !a.classList.contains('open');
      a.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide example' : 'Show an example';
      light();
    });
  });
  // Brief illumination on load, then settle into subtle activity.
  setTimeout(() => glance.classList.remove('boot'), reduced.matches ? 0 : 1700);

  /* Pause scene animation offscreen ------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('paused', !en.isIntersecting)), { rootMargin: '80px' });
  $$('.glance, #workspace, #games').forEach((el) => io.observe(el));
  $('#scene-floor .floor-art').classList.add('live');
})();
