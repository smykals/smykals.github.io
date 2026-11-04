# Redesign continuation validation

Date: November 4, 2026. Branch: `redesign/workspace-dashboard`.
Continues Claude's implementation at `5566a53`; main checkout was not edited.

## Changes

- Navigation is now `.portfolio-side`. Previously global `.side` positioning also matched `.hub .side` diagram columns, pulling page content into fixed boxes along the left edge. Diagram markup and its `.side` styling remain intact.
- `_includes/portfolio-shell.html` renders the same navigation and sticky controls on portfolio pages, journal pages, and the arcade hub. Links resolve through `relative_url`; Contact stays on the current page. Standalone games keep their own arcade interfaces.
- Shared Contact and footer includes avoid duplicate panels. Header anchors account for the sticky bar; reduced motion disables smooth scrolling and shell transitions. Collapse labels, a shared skip link, focus trapping/return, and inert overlay backgrounds support keyboard use.
- `_includes/site-icons.html` supplies the avatar favicon on every HTML template, including standalone games and journal entries. Source: unchanged `assets/img/shane-avatar.webp` (640 × 640). Exact face crop: left 145, top 44, width 350, height 350. PNG outputs: 16, 32, 48, 180, 192 px. ICO contains 16/32/48 px PNG layers. All full-size avatar sources remain unchanged.
- Verified email, résumé-page, LinkedIn, Instagram and GitHub destinations are retained. Instagram displays only its icon and name.

## Checks completed

- Shared-shell structural checks: 40 rendered pages; one navigation, Contact panel, Contact heading and footer per page; local Contact anchors; no duplicate IDs; shared navigation/contact/footer destinations resolve.
- Favicon coverage: all 44 rendered documents use the shared head, have six valid icon links, and no longer reference the old SVG favicon. PNG dimensions, ICO entries and small-size exports inspected.
- Main content and diagrams: 32 source-page comparisons against the preserved pre-change snapshot passed. Three avatar source hashes unchanged. Homepage copy, charts, units, metrics, diagrams and workspace behavior files retained.
- DOM interaction simulation: 120 runs across 40 pages with desktop/mobile width and reduced-motion inputs; collapse preference, accessible toggle labels, active section, menu/search opening and closing, focus trap/return, inert background, and same-page Contact focus checked. Search also checked against the real local portfolio index.
- All 44 local HTTP HTML responses were compared byte-for-byte with real Jekyll output; every shared-shell page and favicon link passed. JavaScript syntax and `git diff --check` passed.

## Verification limits and local preview

Jekyll 4.4.1 and Ruby 3.3.8 are now installed in Ubuntu WSL. A real Jekyll build passed using the existing YAML front matter and `_config.yml`. The active preview now serves that generated output with Jekyll/WEBrick and watches source changes. The temporary preview launcher validates all generated HTML for unresolved Liquid and verifies each shared shell before serving. Output and helper files remain outside the repository. The previous Python Liquid/Markdown substitute is no longer the active preview.

The reported literal tags were reproduced at `http://127.0.0.1:4000/`. Claude's older preview-only `preview_server.py` was still answering there: it strips YAML front matter and interprets only a subset of Liquid, with no include support. Its responses contained `{% include site-icons.html %}` and `{% include portfolio-shell.html %}` even though the templates had valid front matter. A separate generated preview directory already contained expanded includes but was not the response being received. The old helper was backed up, replaced with a real Jekyll build-and-serve launcher, and the two identified superseded portfolio preview processes were stopped. No includes, navigation markup, or sidebar content offset were removed to hide the failure.

The experience graph's edge labels now have a bounded quarter-width cell with wrapping buttons; the final mobile rules also override later desktop height and transform declarations. CSS cascade checks passed at 320, 390, 640, 760, 761, 900, 901, 1024, 1280 and 1440 px. Cell geometry stayed within the graph at seven graph widths. The text, SVG path and capability interactions are unchanged. These checks do not replace a rendered browser inspection.

Browser access host was unavailable. Native Firefox control was also blocked by the tool's URL-policy limitation. Desktop/mobile screenshots, actual rendered geometry and sticky offsets, browser keyboard behavior, and actual reduced-motion rendering remain unverified. DOM simulation is not browser acceptance.

Preview: `http://127.0.0.1:4000/` (real Jekyll/WEBrick; source watching enabled).
To rebuild elsewhere, run `jekyll build --destination <temporary-directory>` and `jekyll serve --host 127.0.0.1 --port 4000`, then inspect homepage, professional experience, a hub diagram case study, software projects, journal index/post, arcade hub and game wrappers at desktop and mobile widths.

Authenticated GitHub Pages configuration was checked: legacy publishing from `main` at `/`, with the generated Pages workflow and no custom repository workflows. Pushing the redesign branch does not publish the site. No merge or deployment is authorized by this change.

The deployed HTTP homepage and professional-experience page were checked separately and contained no unresolved includes. GitHub Pages remains configured for the unchanged main branch, so the observed include failure affects the local redesign preview. The custom domain's HTTPS certificate produced a hostname mismatch during verification; this is separate from Liquid rendering. No push or deployment was performed for this local repair.
