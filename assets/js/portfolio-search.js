// Portfolio search: matches a question against approved portfolio content
// (assets/data/portfolio-index.json). Runs entirely in the browser; no AI and no external calls.
//
// The UI only calls PortfolioSearch.ask(query) and renders { results, suggestions }.
// A grounded AI provider could later implement the same ask() contract, answering only
// from these entries, returning the entries it used as links, and saying when the
// portfolio doesn't cover a question. It is intentionally not built here.
window.PortfolioSearch = (() => {
  const SYNONYMS = {
    networking: ['network', 'networks', 'cisco', 'switching', 'vlan', 'wireless', 'routing', 'campus'],
    network: ['networking'],
    fortinet: ['fortigate', 'firewall', 'boundary'],
    firewall: ['fortinet', 'fortigate'],
    team: ['teams', 'leadership', 'led', 'supervisor', 'technicians', 'training'],
    teams: ['team'],
    led: ['leadership', 'team', 'supervisor'],
    lead: ['leadership', 'team'],
    leadership: ['team', 'supervisor', 'led'],
    manage: ['leadership', 'supervisor'],
    managed: ['leadership', 'supervisor'],
    manufacturing: ['plant', 'production', 'ot', 'plc', 'factory'],
    factory: ['manufacturing', 'plant'],
    plant: ['manufacturing', 'production'],
    ot: ['plc', 'scada', 'hmi', 'manufacturing', 'industrial'],
    'it/ot': ['ot', 'manufacturing', 'boundary'],
    industrial: ['ot', 'plc', 'manufacturing'],
    troubleshooting: ['fault', 'root', 'isolation', 'investigation', 'troubleshoot'],
    troubleshoot: ['troubleshooting'],
    resume: ['experience', 'roles', 'history'],
    'résumé': ['experience', 'roles', 'history'],
    lab: ['homelab', 'proto', 'personal'],
    homelab: ['lab'],
    projects: ['project', 'lab', 'software'],
    datacenter: ['data', 'center'],
    virtualization: ['proxmox', 'vmware', 'hosts'],
    vpn: ['wireguard', 'remote'],
    ai: ['gpu', 'ollama', 'aiio'],
    monitoring: ['monitrope', 'telemetry']
  };
  const STOP = new Set('a an and are about any do does find for from has have he his i in is it me my of on or show shane tell the to what where which who with you your experience'.split(' '));

  let index = null;
  async function load() {
    if (index) return index;
    const res = await fetch('assets/data/portfolio-index.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('index unavailable');
    index = (await res.json()).entries;
    return index;
  }

  const tokens = (q) => {
    const all = q.toLowerCase().replace(/[^\w/é+.\- ]+/g, ' ').split(/\s+/).filter(Boolean);
    const kept = all.filter((t) => !STOP.has(t));
    return kept.length ? kept : all.filter((t) => t.length > 2 && t !== 'shane');
  };

  function expand(words) {
    const out = new Map();
    words.forEach((w) => {
      out.set(w, Math.max(out.get(w) || 0, 1));
      const stem = w.replace(/(ing|s)$/, '');
      if (stem.length > 2) out.set(stem, Math.max(out.get(stem) || 0, 0.9));
      (SYNONYMS[w] || SYNONYMS[stem] || []).forEach((s) => out.set(s, Math.max(out.get(s) || 0, 0.6)));
    });
    return out;
  }

  function score(entry, terms) {
    const title = entry.title.toLowerCase(), summary = (entry.summary || '').toLowerCase(), kw = entry.keywords.join(' | ').toLowerCase();
    let s = 0, hits = 0;
    terms.forEach((weight, t) => {
      let h = 0;
      if (title.includes(t)) h += 3;
      if (kw.includes(t)) h += 2.5;
      if (summary.includes(t)) h += 1;
      if (h) { hits += weight; s += h * weight; }
    });
    return hits ? s * (1 + hits / 4) : 0;
  }

  function excerpt(text, terms, max = 190) {
    if (!text) return '';
    const low = text.toLowerCase();
    let at = -1;
    for (const t of terms.keys()) { const i = low.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
    let start = Math.max(0, at - 60);
    if (start > 0) start = text.indexOf(' ', start) + 1;
    let out = text.slice(start, start + max);
    if (start + max < text.length) out = out.replace(/\s+\S*$/, '') + '…';
    return (start > 0 ? '…' : '') + out;
  }

  const SUGGEST = ['Show me networking experience', 'What teams has Shane led?', 'Find Fortinet projects', 'Show manufacturing IT/OT experience'];

  async function ask(query) {
    const entries = await load();
    const terms = expand(tokens(query));
    if (!terms.size) return { query, results: [], suggestions: SUGGEST };
    const results = entries
      .map((e) => ({ e, s: score(e, terms) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(({ e }) => ({ title: e.title, url: e.url, category: e.category, excerpt: excerpt(e.summary, terms), terms: [...terms.keys()] }));
    return { query, results, suggestions: results.length ? [] : SUGGEST };
  }

  return { ask, suggestions: SUGGEST };
})();
