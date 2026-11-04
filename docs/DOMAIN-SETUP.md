# Activating smykalsbuilds.com

Status as of November 3, 2026:

- `main` now contains a root `CNAME` file with `smykalsbuilds.com` (commit "Configure smykalsbuilds.com custom domain", added by Shane after the redesign began). The redesign branch is rebased on that commit and keeps the file unchanged.
- That commit is what GitHub creates when the custom domain is saved in the repository's Pages settings, so step 3 below appears to be done. Confirm it in **Settings, Pages**.
- This work did not change or check DNS, the domain verification record, or HTTPS. Those steps are still yours to complete in the order below.
- `_config.yml` still uses `url: "https://smykals.github.io"`. Switch it to `https://smykalsbuilds.com` once the domain resolves (step 2).

Sources, checked November 3, 2026:

- GitHub Docs, [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- GitHub Docs, [Verifying your custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- Namecheap, [How do I link my domain to GitHub Pages](https://www.namecheap.com/support/knowledgebase/article.aspx/9645/2208/how-do-i-link-my-domain-to-github-pages)

Re-check those pages right before activating; the IP addresses below are GitHub's published values and can change.

## Order of operations

GitHub recommends verifying the domain first and adding it in the repository settings **before** changing DNS, so nobody else can claim the domain on GitHub Pages in between.

### 1. Verify the domain on your GitHub account

1. GitHub, profile picture, **Settings**, then **Pages** (under "Code, planning, and automation").
2. **Add a domain**, enter `smykalsbuilds.com`, select **Add domain**.
3. GitHub shows a TXT record. In Namecheap add it (step 3 below shows where):

| Type | Host | Value |
|---|---|---|
| TXT Record | `_github-pages-challenge-smykals` | the value GitHub shows you |

4. Wait until it resolves, then return to the Pages settings, open the `...` menu next to the domain and choose **Continue verifying**, then **Verify**. Check with:

```
dig _github-pages-challenge-smykals.smykalsbuilds.com +nostats +nocomments +nocmd TXT
```

Keep this TXT record permanently.

### 2. Merge the redesign, then update the site URL

In `_config.yml`, change:

```yaml
url: "https://smykals.github.io"
```

to:

```yaml
url: "https://smykalsbuilds.com"
```

This updates canonical links, social preview URLs and the resume's portfolio link.

### 3. Add the domain to the repository (appears done: `CNAME` is on `main`)

Repository **smykals/smykals.github.io**, **Settings**, **Pages**, **Custom domain**: enter `smykalsbuilds.com` and **Save**. With branch publishing, GitHub commits a `CNAME` file containing `smykalsbuilds.com` to the root of the publishing branch. Pull that commit before further local work.

### 4. Add the DNS records in Namecheap

Namecheap, **Domain List**, **Manage** next to smykalsbuilds.com, **Advanced DNS** tab, **Host Records**. The domain must use Namecheap BasicDNS, PremiumDNS or FreeDNS for these records to apply.

Delete any existing records on `@` and `www` that would conflict, including the default parking CNAME and any **URL Redirect Record**. Then **Add New Record** for each:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | `185.199.108.153` | Automatic |
| A Record | `@` | `185.199.109.153` | Automatic |
| A Record | `@` | `185.199.110.153` | Automatic |
| A Record | `@` | `185.199.111.153` | Automatic |
| CNAME Record | `www` | `smykals.github.io` | Automatic |

Optional IPv6 (GitHub recommends keeping the A records as well):

| Type | Host | Value |
|---|---|---|
| AAAA Record | `@` | `2606:50c0:8000::153` |
| AAAA Record | `@` | `2606:50c0:8001::153` |
| AAAA Record | `@` | `2606:50c0:8002::153` |
| AAAA Record | `@` | `2606:50c0:8003::153` |

Click **Save All Changes**. Notes:

- The CNAME target is the GitHub user site host, without a repository name. Do not point it at a `*.pages.github.io` address.
- Do not add a wildcard record such as `*.smykalsbuilds.com`; GitHub warns it creates takeover risk.
- Namecheap says new records normally take effect in about 30 minutes; GitHub allows up to 24 hours.

### 5. Confirm and enforce HTTPS

```
dig smykalsbuilds.com +noall +answer -t A
dig www.smykalsbuilds.com +nostats +nocomments +nocmd
```

The apex should list the four 185.199.x.153 addresses; `www` should be a CNAME to `smykals.github.io`. Back in the repository's Pages settings, wait for the DNS check to pass, then tick **Enforce HTTPS** (the option can take up to 24 hours to appear while the certificate is issued).

### 6. After activation

- GitHub redirects `smykals.github.io` and `www.smykalsbuilds.com` to `smykalsbuilds.com` automatically once both apex and `www` are configured.
- Update the LinkedIn profile, Instagram bio and resume links to `https://smykalsbuilds.com`.
- If analytics are kept, add the new domain to the Google Analytics property.

## Rollback

Remove the custom domain in the repository Pages settings (GitHub removes the `CNAME` file), set `url` back to `https://smykals.github.io`, and delete the A, AAAA and `www` records in Namecheap. Keep the verification TXT record.
