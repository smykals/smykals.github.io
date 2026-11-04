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
- Fifteen local HTTP checks covered distinct page layouts and every icon asset. JavaScript syntax and `git diff --check` passed.

## Verification limits and local preview

Ruby/Jekyll was not installed in Windows or WSL. A temporary Python Liquid/Markdown renderer was used outside the repository. It expands includes, URLs, posts and Markdown, but does not validate Jekyll's Ruby runtime, Kramdown-specific output, plugin behavior or production build semantics. No preview helpers or installed dependencies were added to the repository.

Browser access host was unavailable. Native Firefox control was also blocked by the tool's URL-policy limitation. Desktop/mobile screenshots, actual rendered geometry and sticky offsets, browser keyboard behavior, and actual reduced-motion rendering remain unverified. DOM simulation is not browser acceptance.

Preview: `http://127.0.0.1:4000/` (temporary local rendering).
With Jekyll available, run `jekyll build --destination <temporary-directory>` and `jekyll serve --host 127.0.0.1 --port 4000`, then inspect homepage, professional experience, a hub diagram case study, software projects, journal index/post, arcade hub and game wrappers at desktop and mobile widths.

Authenticated GitHub Pages configuration was checked: legacy publishing from `main` at `/`, with the generated Pages workflow and no custom repository workflows. Pushing the redesign branch does not publish the site. No merge or deployment is authorized by this change.
