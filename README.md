# hubra.club

[![Pages](https://github.com/hubra-app/hubra.club/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/hubra-app/hubra.club/actions/workflows/pages.yml?query=branch%3Amain)

The Hubra landing page. Plain static files in `public/`, no build step, no
external requests: fonts, icons and images are all served from the site.

| Path | What it is |
| --- | --- |
| `public/index.html` | German page (de-CH), served at `/` |
| `public/en/index.html` | English page, served at `/en/` |
| `public/impressum/`, `public/datenschutz/` | Legal notice and privacy policy (German) |
| `public/404.html` | Not-found page |
| `public/assets/site.css` | All styles, brand tokens at the top |
| `public/assets/fonts/` | Bricolage Grotesque and Hanken Grotesk (SIL OFL 1.1), latin + latin-ext |
| `public/assets/og.png`, `og-en.png` | Link preview images (1200×630) |

Preview locally with `python3 -m http.server -d public 8000` and open
http://localhost:8000.

Both pages are written by hand. When you change one, change the other too.

## Before going live

Make sure `hi@hubra.club` receives mail. If the site moves away from GitHub
Pages, update the hosting provider in `public/datenschutz/index.html`.

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
