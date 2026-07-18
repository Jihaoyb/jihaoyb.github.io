---
title: "Making the Wait Shorter"
excerpt: "The white-flash fix made this site's loading wait wear the right color. A Lighthouse audit said the wait itself was too long — 63 on mobile. Nine commits later it's 96, and the receipts explain themselves."
date: 2026-07-17
minutes: 6
tags: [Performance, Lighthouse, Web]
category: Build log
terms: [lighthouse, core-web-vitals, render-blocking, variable-fonts, critical-css, wcag]
published: true
---

[The first-paint post](/lab/the-first-paint-nobody-styles/) ended with a
boundary: the fix made the loading wait *wear the right color*, but nothing
about it made the wait shorter. Then we pointed
{% include term.html id="lighthouse" %} at the deployed site and it put a
number on that boundary: **performance 63** on mobile.

Desktop scored 98 on the same site, same day. That gap is the first lesson:
Lighthouse's mobile run emulates a mid-tier phone on a slow connection —
your *worst realistic visitor* — while desktop hardware hides every
mistake. The issues it lists are identical in both runs; mobile is just
where they cost something. Audit the number that hurts.

## What 63 was made of

The report grouped into three kinds of problem:

**Bytes nobody needed.** The stylesheet shipped 41KB compressed — and a
third of it was Font Awesome and a gallery plugin that no visible page has
ever used, inherited from the academic theme this site was forked from.
The analytics collector was 70KB of JavaScript loaded before the page was
interactive, for a script whose job starts *after* that. The hero portrait
sent 800 pixels of width into a 637-pixel slot.

**A request in the wrong place.** Web fonts came from Google's CDN — a
{% include term.html id="render-blocking" %} request to a third-party
origin, paid on every cold visit before anything could paint.

**Two correctness bugs hiding as performance line items.** The SEO audit's
"document has no meta description" traced to a theme bug — the tag was
guarded by `page.excerpt` while its *value* falls back to the site-wide
description, so every page without an excerpt (the homepage included)
shipped none at all. And chasing the font request exposed something
better: the fonts link was gated to the homepage layout, so **Lab posts
had been rendering in fallback fonts since the section launched** and
nobody noticed. Audits find what reading the site every day cannot.

## The fixes, in the order they paid

- **Prune before optimizing.** Deleting the unused theme imports cut the
  compiled CSS by 56% — from 41KB to 16KB on the wire. No clever
  technique, just the [Coverage-tab question](/lab/the-204-that-looked-like-an-error/):
  *do we run what we ship?*
- **Self-host the fonts.** Two {% include term.html id="variable-fonts" %}
  files — Fraunces and Space Grotesk, latin subsets, 59KB total — now live
  on this origin, declared in `@font-face` and preloaded. Two third-party
  origins left the critical path, and every layout gets real typography,
  posts finally included. (One sharp edge: font preloads require
  `crossorigin` *even for same-origin files* — font fetches are CORS-mode,
  and without the attribute the preload is silently discarded and the font
  downloads twice.)
- **Size images to their measured slot.** Not to a guess: the hero renders
  at 87vw on phones and a fixed 474px on desktop, so it now ships in
  480/640/800 rungs with a `sizes` attribute built from those numbers, and
  the preload carries the same set so the early fetch picks the same file.
- **Load analytics when the page is idle.** The gtag stub and its queue
  exist from the first byte — no data lost — but the 70KB collector waits
  for first interaction or idle. Blocking time fell from 390ms to 100ms.
- **The accessibility pair.** The same audit run surfaced
  [ghost focus](/lab/ghost-focus/) and a contrast failure: this site's
  orange accent reads 3.7:1 on light paper, under the
  {% include term.html id="wcag" %} AA bar of 4.5 for small text. Small
  accent text now uses a deeper cut of the same orange, chosen by
  computing contrast against every light surface rather than eyeballing.

<figure class="lab-figure">
<svg viewBox="0 0 700 264" role="img" aria-label="Bar chart of bytes before and after: stylesheet 41 to 16 kilobytes on the wire; analytics at load 70 to 0 kilobytes, deferred to idle; hero image 94 to 35 kilobytes at the mobile size. Third-party origins on the critical path went from two to zero." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="36" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">WHAT THE FIRST PAINT NO LONGER WAITS FOR</text>
  <text x="36" y="80" style="font-size:12.5px;fill:var(--ink)">stylesheet</text>
  <rect x="180" y="66" width="205" height="16" rx="8" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="393" y="79" style="font-size:11px;fill:var(--muted)">41 KB</text>
  <rect x="180" y="88" width="80" height="16" rx="8" style="fill:var(--accent)"/>
  <text x="268" y="101" style="font-size:11px;font-weight:600;fill:var(--ink)">16 KB</text>
  <text x="36" y="146" style="font-size:12.5px;fill:var(--ink)">analytics at load</text>
  <rect x="180" y="132" width="350" height="16" rx="8" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="538" y="145" style="font-size:11px;fill:var(--muted)">70 KB</text>
  <rect x="180" y="154" width="4" height="16" rx="2" style="fill:var(--accent)"/>
  <text x="192" y="167" style="font-size:11px;font-weight:600;fill:var(--ink)">0 — deferred to idle</text>
  <text x="36" y="212" style="font-size:12.5px;fill:var(--ink)">hero image</text>
  <rect x="180" y="198" width="470" height="16" rx="8" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="560" y="211" text-anchor="start" style="font-size:11px;fill:var(--muted)"> </text>
  <text x="644" y="211" text-anchor="end" style="font-size:11px;fill:var(--muted)">94 KB</text>
  <rect x="180" y="220" width="175" height="16" rx="8" style="fill:var(--accent)"/>
  <text x="363" y="233" style="font-size:11px;font-weight:600;fill:var(--ink)">35 KB (640w rung)</text>
  <text x="36" y="258" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">THIRD-PARTY ORIGINS ON THE CRITICAL PATH: 2 → 0</text>
</svg>
<figcaption>Before-bars in quiet outline, after-bars in accent. The stylesheet stays render-blocking by design — it just stopped carrying dead weight.</figcaption>
</figure>

## The receipts

Production, mobile emulation, before and after the nine commits:

| | before | after |
|---|---|---|
| Performance | 63 | **96** |
| Accessibility | 95 | **100** |
| SEO | 92 | **100** |
| First Contentful Paint | 2.9 s | **1.2 s** |
| Largest Contentful Paint | 5.1 s | **1.8 s** |
| Total Blocking Time | 390 ms | **100 ms** |
| Cumulative Layout Shift | 0 | **0** |

That last row is the quiet flex: through every fade, folder animation, and
reveal this site runs, the layout never moves — entrance animations built
on opacity and transforms don't shift anything, which is why all that
choreography never cost a point of {% include term.html id="core-web-vitals" %}.

## Two lessons the numbers don't show

**Audit the deployed thing.** Running Lighthouse against a local dev
server reports failures the *server* owns, not the site: no HTTPS, no
HTTP/2, no compression, and a back/forward-cache "failure" caused entirely
by the dev server's `no-store` header. Production passes all of them. Half
of reading an audit is knowing which environment you pointed it at.

**Say no with reasons.** The stylesheet is still render-blocking — by
design. The full {% include term.html id="critical-css" %} treatment
(inline everything above the fold, load the rest async) trades one flash
for reflowing content, and this site already paints correct paper tones
during the wait. Likewise: no JavaScript minification (GitHub Pages can't
run build steps, and hand-committing minified copies invites drift), and
the 10-minute CDN cache is the platform's, not ours. A 96 with named
trade-offs beats a 100 you can't explain.
