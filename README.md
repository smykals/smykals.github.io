# smykals.github.io
Technical Portfolio | Infrastructure • Networking • Systems • IT/OT • Technical Leadership

## Local preview

This is a Jekyll site. Source HTML contains Liquid includes and must pass through Jekyll before it is served. Opening source files directly, using an ordinary static server on this checkout, or using the old partial Liquid preview helper will display include tags and omit the shared navigation. YAML front matter is already present on the pages that use includes.

On this Windows machine, Jekyll 4.4.1 is installed in Ubuntu WSL. From PowerShell:

```powershell
wsl jekyll serve --source /mnt/c/Users/ShaneStark/Documents/GitHub/smykals.github.io-workspace --destination /tmp/portfolio-jekyll-site --host 127.0.0.1 --port 4000 --disable-disk-cache --force_polling
```

Open <http://127.0.0.1:4000/>. Stop any older preview server on port 4000 first. The destination is outside the repository; do not serve the unbuilt checkout. `jekyll build` with the same source and destination produces a static build without starting a server. No GitHub publication or push is needed for local preview.
