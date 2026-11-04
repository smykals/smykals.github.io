// Homepage behavior on top of shell.js: Explore My Experience, workspace scenes, detail panels,
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

  /* Explore My Experience: pick an area to see an example and light up related work ---------- */
  const explore = $('#explore'), exDetail = $('#ex-detail'), exPrompt = exDetail.innerHTML;
  const exNodes = $$('.ex-node', explore);
  let pick = '';
  function choose(cap) {
    pick = cap && pick !== cap ? cap : '';
    exNodes.forEach((n) => n.setAttribute('aria-pressed', String(n.dataset.capPick === pick)));
    const scope = $$('.kpis [data-cap], .featured [data-cap], .skills-sum [data-cap]');
    scope.forEach((el) => el.classList.toggle('pick-on', !!pick && el.dataset.cap.split(' ').includes(pick)));
    if (!pick) { delete document.body.dataset.pick; exDetail.innerHTML = exPrompt; return; }
    document.body.dataset.pick = pick;
    exDetail.replaceChildren(document.getElementById('ex-' + pick).content.cloneNode(true));
    const n = $$('.pick-on').length;
    const tail = document.createElement('p');
    tail.className = 'ex-related';
    tail.innerHTML = `<span>${n} related item${n === 1 ? '' : 's'} highlighted below.</span><button type="button" class="ex-reset">Reset</button>`;
    exDetail.appendChild(tail);
    $('.ex-reset', exDetail).addEventListener('click', () => { const was = pick; choose(''); $(`.ex-node[data-cap-pick="${was}"]`, explore).focus(); });
  }
  exNodes.forEach((n) => n.addEventListener('click', () => choose(n.dataset.capPick)));
  explore.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pick && !document.documentElement.classList.contains('overlay-open')) choose(''); });
  const pauseBtn = $('.ex-pause', explore);
  pauseBtn.addEventListener('click', () => {
    const stop = pauseBtn.getAttribute('aria-pressed') !== 'true';
    pauseBtn.setAttribute('aria-pressed', String(stop));
    $('.ex-pause-label', pauseBtn).textContent = stop ? 'Resume Motion' : 'Pause Motion';
    explore.classList.toggle('ex-stopped', stop);
  });

  /* Career graph details: selecting a role, chart or environment shows the context ------------- */
  $$('[data-detail]').forEach((btn) => btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const group = $$(`[aria-controls="${panel.id}"]`);
    const open = btn.getAttribute('aria-expanded') !== 'true';
    group.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (!open) { panel.innerHTML = panel.dataset.prompt; return; }
    btn.setAttribute('aria-expanded', 'true');
    panel.replaceChildren(document.getElementById(btn.dataset.detail).content.cloneNode(true));
  }));
  $$('.ev-detail').forEach((p) => { p.dataset.prompt = p.innerHTML; });

  /* Checking the Line: investigate in any valid order; findings persist --------------------- */
  // Every finding below is taken from the published case study (weighing-labeling-fault.html).
  const cl = $('#trace'), clStage = $('.cl-stage', cl), clLog = $('#cl-log'), clEnd = $('#cl-conclusion');
  const FIND = {
    port: { ok: true, text: '<b>Switch port: healthy.</b> The port serving the PLC was up, with no errors or flapping.', wire: 'w-net' },
    vlan: { ok: true, text: '<b>VLAN: healthy.</b> The port was in the expected VLAN and the PLC could reach the labeler.', wire: 'w-net2' },
    plc: { ok: true, text: '<b>PLC signals: healthy.</b> With electrical engineering, I confirmed the PLC was communicating and sending the signals we expected.', wire: null },
    sensor: { ok: false, text: '<b>Weighing sensor: root cause.</b> With the network and PLC ruled out, the missing input pointed to the sensor. It was faulty and was replaced.', wire: 'w-sensor' }
  };
  const done = new Set();
  const partBtn = (k) => $(`.cl-part[data-part="${k}"]`, cl);
  function log(html, cls) {
    const empty = $('.cl-empty', clLog); if (empty) empty.remove();
    const li = document.createElement('li'); li.innerHTML = html; if (cls) li.className = cls; clLog.appendChild(li);
  }
  function check(k) {
    $$('.cl-part', cl).forEach((b) => b.classList.toggle('active', b.dataset.part === k));
    if (k === 'labeler') { log('The symptom shows at the labeler: bags arrive weighed, but no label is applied. The case study records no separate labeler fault; the question was which upstream input never arrived.', 'note'); return; }
    if (done.has(k)) return;
    if (k === 'sensor' && !['port', 'vlan', 'plc'].every((x) => done.has(x))) {
      log('Not enough evidence yet to judge the sensor. In this incident it was identified only after the switch port, VLAN and PLC signals were shown healthy.', 'note'); return;
    }
    const f = FIND[k]; done.add(k);
    const b = partBtn(k); b.classList.add(f.ok ? 'ok' : 'bad'); $('.cl-state', b).textContent = f.ok ? 'Healthy' : 'Root cause';
    if (f.wire) $(`.cl-wire.${f.wire}`, cl).classList.add(f.ok ? 'ok' : 'bad');
    log(f.text);
    if (k === 'sensor') {
      clStage.classList.add('fixed');
      const lb = partBtn('labeler'); lb.classList.remove('symptom'); lb.classList.add('ok'); $('.cl-state', lb).textContent = 'Labeling resumed';
      $('.cl-nolabel', cl).textContent = 'Label applied';
      clEnd.hidden = false;
    }
  }
  $$('.cl-part', cl).forEach((b) => b.addEventListener('click', () => { stopGuide(); check(b.dataset.part); }));
  let guide = null;
  function stopGuide() { clearTimeout(guide); guide = null; $('#cl-guide').textContent = 'Watch the Investigation'; }
  function resetLine() {
    stopGuide(); done.clear(); clStage.classList.remove('fixed');
    $$('.cl-part', cl).forEach((b) => { b.classList.remove('ok', 'bad', 'active'); $('.cl-state', b).textContent = b.dataset.part === 'labeler' ? 'Symptom here' : 'Not yet checked'; });
    partBtn('labeler').classList.add('symptom');
    $$('.cl-wire', cl).forEach((w) => w.classList.remove('ok', 'bad'));
    $('.cl-nolabel', cl).textContent = 'No label applied';
    clLog.innerHTML = '<li class="cl-empty">Nothing established yet. Every component starts as not yet checked.</li>';
    clEnd.hidden = true;
  }
  $('#cl-reset').addEventListener('click', resetLine);
  $('#cl-guide').addEventListener('click', () => {
    if (guide) { stopGuide(); return; }
    resetLine();
    const order = ['labeler', 'port', 'vlan', 'plc', 'sensor'];   // the documented sequence
    const step = (i) => { if (i >= order.length) { stopGuide(); return; } check(order[i]); guide = setTimeout(() => step(i + 1), reduced.matches ? 900 : 1800); };
    $('#cl-guide').textContent = 'Stop the Walkthrough';
    step(0);
  });

  /* Fortinet packet path: documented before/after plus one illustrative case ----------------- */
  const PK = {
    before: { allow: false, text: '<span class="ev-tag">Documented</span>The firewall received the connection and found a route to the OT zone, but rejected the session at the forward-policy check: the administrative path had no explicit inter-zone permit policy.' },
    after: { allow: true, text: '<span class="ev-tag">Documented</span>I added a narrowly scoped permit rule for the required management traffic, with internal NAT disabled. The Proxmox web interface became reachable from the authorized management path. This validates that path, not every segmentation policy.' },
    other: { allow: false, text: '<span class="ev-tag">Illustrative</span>Traffic with no matching permit policy is stopped at the same forward-policy check, as the first case showed. This is a generic example, not a published rule from my configuration.' }
  };
  const lane = $('.pk-lane'), pkExplain = $('#pk-explain');
  $$('[data-pk]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-pk]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const c = PK[b.dataset.pk];
    lane.classList.remove('run', 'allow', 'deny'); void lane.offsetWidth;
    lane.classList.add('run', c.allow ? 'allow' : 'deny');
    pkExplain.innerHTML = c.text;
  }));

  /* MONITROPE screenshots: user-controlled, labeled as screenshots ---------------------------- */
  const SHOTS = [
    ['Screenshot%202026-10-20%20135921.png', 'Overview page, 18 discovered devices', 'MONITROPE 0.6.0 Overview page showing the first-week checklist, 18 discovered devices, the network hive and the MONITROPE Intelligence panel'],
    ['Screenshot%202026-10-20%20140124.png', 'Discovery: four approved scopes', 'MONITROPE Discovery page listing four approved scopes with blurred address ranges'],
    ['Screenshot%202026-10-20%20140142.png', 'Events with stored evidence', 'MONITROPE Events page listing device discovery events with their stored evidence'],
    ['Screenshot%202026-10-20%20140000.png', 'Proof: discovery proven, learning at day 0 of 7', 'MONITROPE Proof page showing Discovery proven and Learning at day 0 of 7'],
    ['Screenshot%202026-10-20%20140016.png', 'Proof: root-cause analysis not yet proven', 'MONITROPE Proof page showing root-cause analysis not yet proven and one failed deployment check']
  ];
  let shot = 0;
  const shotImg = $('#shot-img');
  function showShot(i) {
    shot = (i + SHOTS.length) % SHOTS.length;
    const [file, cap, alt] = SHOTS[shot];
    shotImg.src = 'assets/images/monitrope%20real%20app%20images/' + file; shotImg.alt = alt;
    $('#shot-cap').textContent = cap; $('#shot-count').textContent = `${shot + 1} of ${SHOTS.length}`;
  }
  $('.shot-prev').addEventListener('click', () => showShot(shot - 1));
  $('.shot-next').addEventListener('click', () => showShot(shot + 1));

  /* Pause scene animation offscreen ------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('paused', !en.isIntersecting)), { rootMargin: '80px' });
  $$('#explore, #workspace, #games').forEach((el) => io.observe(el));
  $('#scene-floor .floor-art').classList.add('live');
})();
