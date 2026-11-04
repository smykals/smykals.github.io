/* smykalsbuilds site script. Every feature here is an enhancement: all content is in the HTML. */
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header progress line with the avatar runner as an occasional guide. */
  var line = document.querySelector('.sb-progress__line');
  var runner = document.querySelector('.sb-runner');
  if (line) {
    var lastY = 0, frame = 0, ticking = false, idle;
    var update = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      line.style.width = (p * 100) + '%';
      if (!runner || reduce) return;
      runner.style.left = (p * 100) + '%';
      runner.classList.toggle('is-on', p > 0.01 && p < 0.995);
      var y = window.scrollY;
      if (Math.abs(y - lastY) > 14) {
        frame = (frame + 1) % 6;
        runner.style.backgroundPosition = (-frame * 18) + 'px 0';
        runner.style.transform = 'translateX(-9px)' + (y < lastY ? ' scaleX(-1)' : '');
        lastY = y;
      }
      clearTimeout(idle);
      idle = setTimeout(function () { runner.style.backgroundPosition = '0 0'; }, 180);
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* Explore by capability: marks matching work, never hides anything. */
  var caps = document.querySelector('.caps');
  if (caps) {
    var names = { networking: 'Networking', systems: 'Systems', itot: 'IT/OT', automation: 'Automation', leadership: 'Leadership' };
    var notes = {
      automation: 'Automation evidence is mostly from my independent projects so far; the professional examples are documentation and standard work that made tasks repeatable.'
    };
    var note = caps.querySelector('[data-caps-note]');
    var defaultNote = note ? note.textContent : '';
    var tagged = document.querySelectorAll('main [data-cap]:not(button)');
    caps.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-cap]');
      if (!btn) return;
      var cap = btn.getAttribute('data-cap');
      caps.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      var count = 0;
      tagged.forEach(function (el) {
        var on = cap !== 'all' && (' ' + el.getAttribute('data-cap') + ' ').indexOf(' ' + cap + ' ') > -1;
        el.classList.toggle('cap-match', on);
        if (on) count++;
      });
      if (cap === 'all') {
        document.body.removeAttribute('data-cap-active');
        if (note) note.textContent = defaultNote;
      } else {
        document.body.setAttribute('data-cap-active', cap);
        if (note) note.textContent = names[cap] + ': ' + count + ' marked items across experience, case studies, projects and the lifecycle sections. ' + (notes[cap] || '');
      }
    });
  }

  /* Incident walkthrough: selecting a step lights the matching part of the line. */
  document.querySelectorAll('[data-steps]').forEach(function (list) {
    var wrap = list.closest('.case__main');
    var nodes = wrap ? wrap.querySelectorAll('[data-node]') : [];
    var items = list.querySelectorAll('li');
    function show(idx) {
      nodes.forEach(function (n) { n.classList.remove('is-ok', 'is-bad', 'is-focus'); });
      for (var i = 0; i <= idx; i++) {
        var spec = (items[i].getAttribute('data-light') || '').split(':');
        var node = wrap.querySelector('[data-node="' + spec[0] + '"]');
        if (!node) continue;
        node.classList.remove('is-ok', 'is-bad');
        node.classList.add(spec[1] === 'bad' ? 'is-bad' : 'is-ok');
        if (i === idx) node.classList.add('is-focus');
      }
      /* Once the sensor is found, the labeler symptom is explained. */
      if (idx === items.length - 1) { var lab = wrap.querySelector('[data-node="labeler"]'); if (lab) { lab.classList.remove('is-bad'); lab.classList.add('is-ok'); } }
      items.forEach(function (it, i) {
        it.classList.toggle('is-current', i === idx);
        it.querySelector('button').setAttribute('aria-pressed', String(i === idx));
      });
    }
    items.forEach(function (it, i) { it.querySelector('button').addEventListener('click', function () { show(i); }); });
  });

  /* Campus core explorer. */
  document.querySelectorAll('[data-core]').forEach(function (core) {
    var detail = core.querySelector('[data-core-detail]');
    var tpl = core.querySelector('template[data-core-parts]');
    if (!detail || !tpl) return;
    var summary = detail.innerHTML;
    var buttons = core.querySelectorAll('button[data-part]');
    function reset() {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      detail.innerHTML = summary;
    }
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-pressed') === 'true') { reset(); return; }
        var part = tpl.content.querySelector('[data-part="' + btn.getAttribute('data-part') + '"]');
        if (!part) return;
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        detail.innerHTML = part.innerHTML + '<button type="button" class="core__back">Back to the summary of my work</button>';
        detail.querySelector('.core__back').addEventListener('click', function () { reset(); btn.focus(); });
      });
    });
  });

  /* Green Belt bars draw in once when they enter the viewport. */
  var bars = document.querySelectorAll('.bars');
  if ('IntersectionObserver' in window && bars.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { io.observe(b); });
  } else {
    bars.forEach(function (b) { b.classList.add('is-in'); });
  }
})();
