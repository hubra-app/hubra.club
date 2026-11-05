# hubra.club

[![Pages](https://github.com/hubra-app/hubra.club/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/hubra-app/hubra.club/actions/workflows/pages.yml?query=branch%3Amain)

The Hubra website. Plain static files in `public/`, no external requests:
fonts, icons and images are all served from the site. The look follows the
Hubra apps (same colour tokens, fonts and violet brand panel as the sign-in
page), in light and dark mode.

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | Page sources (German), one per page, with a settings comment at the top |
| `src/pages/en/*.html` | English pages |
| `tools/build.py` | Wraps every page in the shared head, header and footer and writes `public/` |
| `public/` | The built site, committed and published as it is |
| `public/assets/site.css` | All styles, colour tokens at the top (same values as `packages/ui` in hubra-app/hubra) |
| `public/assets/theme.js`, `site.js` | Theme before first paint (shares the `hubra_theme` cookie with the apps), theme switch, phone menu, product tour tabs |
| `public/assets/fonts/` | Bricolage Grotesque and Hanken Grotesk (SIL OFL 1.1), latin + latin-ext |
| `public/.well-known/security.txt` | Where to report security problems |
| `public/bimi.svg` | Sender logo for mail (BIMI, SVG Tiny PS). Copy of `brand/hubra-bimi.svg` in hubra-app/hubra |

Pages, German and English: home (`/`, `/en/`), Funktionen/features,
Module/modules (`/plugins/` points there), Preise/pricing, Roadmap, Fragen/faq, Sicherheit/security,
Kontakt/contact, and the legal pages Datenschutz/privacy, Impressum/imprint,
Nutzungsbedingungen/terms, Auftragsverarbeitung/dpa and cookies; plus 404.
The legal pages are drafts (yellow notice, `noindex`) until they are
reviewed. The Modules page lists every official plugin; when one is released
or added, follow the checklist in
[hubra/docs/plugin-releases.md](https://github.com/hubra-app/hubra/blob/main/docs/plugin-releases.md).

## Editing

1. Change a page in `src/pages/` (and its other language), or the shared
   header and footer in `tools/build.py`.
2. Run `python3 tools/build.py`. It rewrites `public/**/index.html` and
   `public/sitemap.xml` and checks that every internal link exists.
3. Commit `src/` and `public/` together. The **Check** workflow runs
   `python3 tools/build.py --check` on pull requests and fails if `public/`
   is out of date.

In a page, `<!-- toc -->` becomes a table of contents from the `<h2 id>`
headings and `<!-- draft -->` the "not yet reviewed" notice.

Preview locally with `python3 -m http.server -d public 8000` and open
http://localhost:8000.

## Before going live

Make sure `hi@hubra.club` receives mail. If the site moves away from GitHub
Pages, update the hosting provider in `src/pages/datenschutz.html` and
`src/pages/en/privacy.html`. Remove the draft notice and `index: no` from the
legal pages once they have been reviewed.

## Deploy on GitLab Pages

1. Create a GitLab project (e.g. `hubra/hubra.club`) and push this repository.
   `.gitlab-ci.yml` publishes `public/` on every push to the default branch.
2. In the project, open **Deploy › Pages**. Untick **Use unique domain** so the
   site keeps its plain `/` paths.
3. **Deploy › Pages › New domain**: add `hubra.club`, leave
   **Automatic certificate management using Let's Encrypt** on. GitLab shows a
   verification code. Repeat for `www.hubra.club` if you want it.
4. Set these DNS records at the registrar of hubra.club:

   | Name | Type | Value |
   | --- | --- | --- |
   | `hubra.club` | `A` | `35.185.44.232` |
   | `_gitlab-pages-verification-code.hubra.club` | `TXT` | `gitlab-pages-verification-code=…` (from step 3) |
   | `www.hubra.club` | `CNAME` | `<namespace>.gitlab.io` |
   | `_gitlab-pages-verification-code.www.hubra.club` | `TXT` | the code for www |

   GitLab Pages has no IPv6 address, so don't add an `AAAA` record.
5. Back in GitLab, press **Verify** next to each domain. The certificate
   follows within an hour.

## Deploy on GitHub Pages

1. Push this repository to GitHub (a public repository, or a paid plan for
   Pages on a private one).
2. **Settings › Pages › Source: GitHub Actions**. `.github/workflows/pages.yml`
   publishes `public/` on every push to `main`.
3. **Settings › Pages › Custom domain**: `hubra.club`, then tick
   **Enforce HTTPS** once the certificate is issued.
4. DNS records:

   | Name | Type | Value |
   | --- | --- | --- |
   | `hubra.club` | `A` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
   | `hubra.club` | `AAAA` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
   | `www.hubra.club` | `CNAME` | `<owner>.github.io` |

   To stop others from claiming the domain on GitHub, verify it for the
   organisation under **Organisation settings › Pages** (a `TXT` record).

`public/CNAME` is only read by branch-based GitHub Pages; it does no harm
elsewhere.

## Any other web server

Copy `public/` to the web root. The pages use relative links, so the site
also works from a sub-path; only `404.html` assumes it sits at the domain root.
