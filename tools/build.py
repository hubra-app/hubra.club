#!/usr/bin/env python3
"""Builds the hubra.club pages from src/pages/ into public/.

Each page in src/pages/ starts with a comment block of settings:

    <!--
    path: /datenschutz/          where the page is served
    lang: de                     de or en
    alt: /en/privacy/            the same page in the other language
    title: Datenschutz           <title>, " · Hubra" is added
    description: ...             meta description
    index: no                    optional: keep the page out of search engines
    -->

The rest of the file is the page's <main> content. The build wraps it in the
shared head, header and footer below, so a change to the navigation is made
once here instead of in every page.

    python3 tools/build.py           write public/**/index.html + sitemap.xml
    python3 tools/build.py --check   fail if public/ is out of date or a link
                                     points at a page or file that doesn't exist

Python 3.9+, standard library only. The output is committed, so GitHub Pages
publishes public/ as it is.
"""

from __future__ import annotations

import html
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "pages"
OUT = ROOT / "public"
SITE = "https://hubra.club"

APP = "https://app.hubra.club"
SSO = "https://sso.hubra.club"

MARK = (
    '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#7441e0"/>'
    '<path d="M21 14V50M21 35a11 11 0 0 1 22 0V50" fill="none" stroke="#fff" stroke-width="8" '
    'stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="45" r="4" fill="#fece2b"/></svg>'
)

# Words that appear on every page, per language.
T = {
    "de": {
        "html_lang": "de-CH",
        "og_locale": "de_CH",
        "home": "/",
        "skip": "Zum Inhalt springen",
        "home_label": "Hubra, Startseite",
        "nav_label": "Hauptnavigation",
        "nav": [("/funktionen/", "Funktionen"), ("/sicherheit/", "Sicherheit"), ("/module/", "Module"), ("/preise/", "Preise"), ("/fragen/", "Fragen"), ("/kontakt/", "Kontakt")],
        "signin": "Anmelden",
        "start": "Verein starten",
        "menu": "Menü",
        "theme": "Farbschema wechseln",
        "other_lang": ("EN", "en", "English"),
        "foot": [
            ("Produkt", [("/funktionen/", "Funktionen"), ("/sicherheit/", "Sicherheit"), ("/module/", "Module"), ("/preise/", "Preise"), ("/fragen/", "Häufige Fragen")]),
            ("Konto", [(APP, "Anmelden"), (SSO + "/signup", "Konto erstellen"), (SSO + "/start", "Verein starten"), (SSO + "/account", "Mein Konto")]),
            ("Rechtliches", [("/impressum/", "Impressum"), ("/datenschutz/", "Datenschutz"), ("/nutzungsbedingungen/", "Nutzungsbedingungen"), ("/auftragsverarbeitung/", "Auftragsverarbeitung"), ("/cookies/", "Cookies")]),
            ("Kontakt", [("/kontakt/", "Kontakt"), ("mailto:hi@hubra.club", "hi@hubra.club"), ("https://github.com/hubra-app", "GitHub"), ("https://plugins.hubra.club/entwickeln/", "Plugins für Entwickler"), ("/.well-known/security.txt", "Sicherheitslücke melden")]),
        ],
        "tagline": "Vereinssoftware aus der Schweiz. Gehostet in Europa.",
        "toc": "Inhalt",
        "draft": (
            "<strong>Entwurf, noch nicht rechtlich geprüft.</strong> Dieser Text ist ein Entwurf und gilt noch nicht. "
            "Er muss vor der Veröffentlichung von Hubra und einer Anwältin oder einem Anwalt geprüft werden. "
            "Gelb markierte Stellen sind Annahmen, die noch bestätigt werden müssen."
        ),
        "copy": "© 2026 Hubra",
    },
    "en": {
        "html_lang": "en",
        "og_locale": "en_GB",
        "home": "/en/",
        "skip": "Skip to content",
        "home_label": "Hubra, home",
        "nav_label": "Main navigation",
        "nav": [("/en/features/", "Features"), ("/en/security/", "Security"), ("/en/modules/", "Modules"), ("/en/pricing/", "Pricing"), ("/en/faq/", "FAQ"), ("/en/contact/", "Contact")],
        "signin": "Sign in",
        "start": "Start a club",
        "menu": "Menu",
        "theme": "Change colour scheme",
        "other_lang": ("DE", "de-CH", "Deutsch"),
        "foot": [
            ("Product", [("/en/features/", "Features"), ("/en/security/", "Security"), ("/en/modules/", "Modules"), ("/en/pricing/", "Pricing"), ("/en/faq/", "FAQ")]),
            ("Account", [(APP, "Sign in"), (SSO + "/signup", "Create an account"), (SSO + "/start", "Start a club"), (SSO + "/account", "My account")]),
            ("Legal", [("/en/imprint/", "Imprint"), ("/en/privacy/", "Privacy"), ("/en/terms/", "Terms of use"), ("/en/dpa/", "Data processing"), ("/en/cookies/", "Cookies")]),
            ("Contact", [("/en/contact/", "Contact"), ("mailto:hi@hubra.club", "hi@hubra.club"), ("https://github.com/hubra-app", "GitHub"), ("https://plugins.hubra.club/en/develop/", "Plugins for developers"), ("/.well-known/security.txt", "Report a vulnerability")]),
        ],
        "tagline": "Club software from Switzerland. Hosted in Europe.",
        "toc": "Contents",
        "draft": (
            "<strong>Draft, not yet legally reviewed.</strong> This text is a draft and does not apply yet. "
            "Hubra and a lawyer must review it before it is published. "
            "Passages marked in yellow are assumptions that still need to be confirmed. "
            "This English version is a translation; the German version prevails."
        ),
        "copy": "© 2026 Hubra",
    },
}

ICON_THEME = (
    '<svg class="i-auto" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none"/></svg>'
    '<svg class="i-light" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>'
    '<svg class="i-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>'
)
ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'


@dataclass
class Page:
    src: Path
    path: str
    lang: str
    alt: str | None
    title: str
    description: str
    index: bool
    body: str

    @property
    def out(self) -> Path:
        if self.path.endswith(".html"):
            return OUT / self.path.lstrip("/")
        return OUT / self.path.lstrip("/") / "index.html"


def read_page(src: Path) -> Page:
    text = src.read_text(encoding="utf-8")
    m = re.match(r"<!--\n(.*?)\n-->\n", text, re.S)
    if not m:
        sys.exit(f"{src}: missing the settings comment at the top")
    meta = {}
    for line in m.group(1).splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    return Page(
        src=src,
        path=meta["path"],
        lang=meta["lang"],
        alt=meta.get("alt") or None,
        title=meta["title"],
        description=meta["description"],
        index=meta.get("index", "yes") != "no",
        body=text[m.end():].strip("\n"),
    )


def link(href: str, label: str, **attrs: str) -> str:
    extra = "".join(f' {k.rstrip("_").replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<a href="{href}"{extra}>{label}</a>'


ICON_WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>'


def expand(body: str, t: dict) -> str:
    """<!-- draft --> becomes the draft notice, <!-- toc --> a table of
    contents built from the page's <h2 id="..."> headings."""
    body = body.replace("<!-- draft -->", f'<div class="notice" role="note">{ICON_WARN}<div><p>{t["draft"]}</p></div></div>')
    if "<!-- toc -->" in body:
        items = "\n".join(
            f'      <li><a href="#{i}">{re.sub(r"<[^>]+>", "", h)}</a></li>'
            for i, h in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
        )
        body = body.replace(
            "<!-- toc -->",
            f'<nav class="toc" aria-label="{t["toc"]}">\n    <h2>{t["toc"]}</h2>\n    <ol>\n{items}\n    </ol>\n  </nav>',
        )
    return body


def render(page: Page, pages_by_path: dict[str, Page]) -> str:
    t = T[page.lang]
    esc = html.escape
    full_title = page.title if page.title.startswith("Hubra") else f"{page.title} · Hubra"
    alt_lang = "en" if page.lang == "de" else "de"
    head = [
        "<!doctype html>",
        f'<html lang="{t["html_lang"]}">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>{esc(full_title)}</title>",
        f'<meta name="description" content="{esc(page.description)}">',
    ]
    if page.index:
        head.append(f'<link rel="canonical" href="{SITE}{page.path}">')
    else:
        head.append('<meta name="robots" content="noindex">')
    if page.alt:
        de, en = (page.path, page.alt) if page.lang == "de" else (page.alt, page.path)
        head += [
            f'<link rel="alternate" hreflang="de-CH" href="{SITE}{de}">',
            f'<link rel="alternate" hreflang="en" href="{SITE}{en}">',
            f'<link rel="alternate" hreflang="x-default" href="{SITE}{de}">',
        ]
    head += [
        '<meta name="theme-color" content="#7441e0">',
        '<meta name="color-scheme" content="light dark">',
        '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
        '<link rel="icon" href="/favicon.ico" sizes="32x32">',
        '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Hubra">',
        f'<meta property="og:title" content="{esc(full_title)}">',
        f'<meta property="og:description" content="{esc(page.description)}">',
        f'<meta property="og:url" content="{SITE}{page.path}">',
        f'<meta property="og:image" content="{SITE}/assets/{"og.png" if page.lang == "de" else "og-en.png"}">',
        f'<meta property="og:locale" content="{t["og_locale"]}">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="preload" href="/assets/fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="stylesheet" href="/assets/site.css">',
        '<script src="/assets/theme.js"></script>',
        '<script src="/assets/site.js" defer></script>',
        "</head>",
    ]

    other_label, other_hreflang, other_name = t["other_lang"]
    other_href = page.alt or T[alt_lang]["home"]
    nav = "\n".join(
        f"      {link(h, l, aria_current='page') if h == page.path else link(h, l)}" for h, l in t["nav"]
    )
    header = f"""<body>
<a class="skip" href="#main">{t["skip"]}</a>

<header class="top" id="top">
  <div class="wrap">
    <a class="brand" href="{t["home"]}" aria-label="{t["home_label"]}">
      {MARK}
      <span class="wordmark">hubra</span>
    </a>
    <nav class="nav" id="nav" aria-label="{t["nav_label"]}">
{nav}
      <span class="nav-extra">
        {link(APP, t["signin"])}
        {link(other_href, other_name, hreflang=other_hreflang, lang=other_hreflang)}
      </span>
    </nav>
    <div class="top-actions">
      <button class="icon-btn theme-btn" type="button" aria-label="{t["theme"]}" title="{t["theme"]}" hidden>{ICON_THEME}</button>
      <a class="lang" href="{other_href}" hreflang="{other_hreflang}" lang="{other_hreflang}" title="{other_name}">{other_label}</a>
      <a class="signin" href="{APP}">{t["signin"]}</a>
      <a class="btn btn-p btn-sm" href="{SSO}/start">{t["start"]}</a>
      <button class="icon-btn menu-btn" type="button" aria-label="{t["menu"]}" aria-expanded="false" aria-controls="nav" hidden>{ICON_MENU}</button>
    </div>
  </div>
</header>
"""

    cols = []
    for heading, links in t["foot"]:
        items = "\n".join(f"          <li>{link(h, l)}</li>" for h, l in links)
        cols.append(f"""      <div>
        <h2>{heading}</h2>
        <ul>
{items}
        </ul>
      </div>""")
    footer = f"""
<footer class="foot">
  <div class="wrap">
    <div class="foot-brand">
      <a class="brand" href="{t["home"]}" aria-label="{t["home_label"]}">
        {MARK}
        <span class="wordmark">hubra</span>
      </a>
      <p>{t["tagline"]}</p>
    </div>
    <div class="foot-cols">
{chr(10).join(cols)}
    </div>
    <div class="foot-base">
      <span>{t["copy"]}</span>
      {link(other_href, other_name, hreflang=other_hreflang, lang=other_hreflang)}
    </div>
  </div>
</footer>
</body>
</html>
"""
    return "\n".join(head) + "\n" + header + "\n" + expand(page.body, t) + "\n" + footer


def sitemap(pages: list[Page]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for p in sorted(pages, key=lambda p: p.path):
        if not p.index or p.path.endswith(".html"):
            continue
        lines.append("  <url>")
        lines.append(f"    <loc>{SITE}{p.path}</loc>")
        if p.alt:
            de, en = (p.path, p.alt) if p.lang == "de" else (p.alt, p.path)
            lines.append(f'    <xhtml:link rel="alternate" hreflang="de-CH" href="{SITE}{de}"/>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{SITE}{en}"/>')
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def check_links(outputs: dict[Path, str]) -> list[str]:
    """Every root-relative href/src must point at a file in public/ (or one
    being built), and every #fragment on a page must exist on that page."""
    problems = []
    ids: dict[Path, set[str]] = {}
    for path, text in outputs.items():
        ids[path] = set(re.findall(r'\sid="([^"]+)"', text))
    for path, text in outputs.items():
        for ref in re.findall(r'\s(?:href|src)="(/[^"]*)"', text):
            target, _, frag = ref.partition("#")
            file = OUT / target.lstrip("/")
            if target.endswith("/") or target == "":
                file = file / "index.html"
            if file not in outputs and not file.exists():
                problems.append(f"{path.relative_to(ROOT)}: {ref} does not exist")
                continue
            if frag and file in ids and frag not in ids[file]:
                problems.append(f"{path.relative_to(ROOT)}: {ref} has no id '{frag}'")
    return problems


def main() -> int:
    check = "--check" in sys.argv[1:]
    pages = [read_page(p) for p in sorted(SRC.rglob("*.html"))]
    by_path = {p.path: p for p in pages}
    for p in pages:
        if p.alt and p.alt not in by_path:
            sys.exit(f"{p.src}: alt page {p.alt} does not exist")
        if p.alt and by_path[p.alt].alt != p.path:
            sys.exit(f"{p.src}: {p.alt} does not point back with alt: {p.path}")

    outputs: dict[Path, str] = {p.out: render(p, by_path) for p in pages}
    outputs[OUT / "sitemap.xml"] = sitemap(pages)

    problems = check_links(outputs)
    if check:
        for path, text in outputs.items():
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                problems.append(f"{path.relative_to(ROOT)} is out of date: run python3 tools/build.py")
    else:
        for path, text in outputs.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        print(f"built {len(pages)} pages")
    for problem in problems:
        print(problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
