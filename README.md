# smykalsbuilds

Career portfolio of Shane Mykal Stark: manufacturing IT/OT, campus and data center network infrastructure, and technical leadership. Hosted on GitHub Pages at https://smykals.github.io (the `CNAME` file for smykalsbuilds.com is committed; DNS activation is pending).

## How the site is built

- Plain HTML pages processed by GitHub Pages' built-in Jekyll. No framework or build step.
- `_includes/` holds the shared head metadata, header and footer used by every page.
- `_layouts/post.html` renders Field Journal entries from `_posts/`. See `journal/README.md` to publish an entry.
- `assets/css/tokens.css` defines the dark (charcoal) and light (warm off-white) color tokens. Any element with `class="tone-light"` switches to the light set; inner pages with `tone-mix` on the body put explanation-only sections on the light background and keep diagrams and screenshots on charcoal.
- `assets/css/brand.css` is the shared chrome. `assets/css/home.css` styles the homepage and the hub pages. Older case and lab pages keep `site.css` and `case.css`, which read the same tokens.
- `assets/js/site.js` adds the capability selector, incident walkthrough, core diagram explorer and header progress line. Every page is fully readable without JavaScript.

## Evidence labels

Professional (red), Lab implemented (bone), Developing (dashed amber), Planned (dotted gray). Use them for anything new so production work, lab work and plans stay distinct.

## Custom domain

See `docs/DOMAIN-SETUP.md` for the exact Namecheap records and GitHub Pages steps.
