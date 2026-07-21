---
title: "The 10-Minute Cache You Can't Change"
excerpt: "Lighthouse flags this site's cache lifetimes on every audit, and no fix exists: GitHub Pages caps every response at ten minutes. Here's what that actually costs — measured — and why it's less than it reads."
date: 2026-07-20
minutes: 4
tags: [Performance, HTTP, GitHub Pages]
category: Field notes
terms: [lighthouse, cache-control, github-pages, cdn, etag, http-status-code]
published: true
---

Every {% include term.html id="lighthouse" %} audit of this site includes
the same finding: *"Use efficient cache lifetimes — estimated savings
138KB."* It sat in my fix list next to items I could fix, looking equally
actionable. It isn't. It's a property of the ground this site is built on
— and knowing a platform's immovables is part of having chosen it.

## The measurement

Ask production for any resource and read the headers:

```text
$ curl -sI https://jihaoyb.github.io/assets/css/main.css

cache-control: max-age=600
etag: "6a5ef4a8-1421f"
via: 1.1 varnish
x-served-by: cache-bur-kbur8200071-BUR
```

Every response — document, stylesheet, fonts, images — carries the same
{% include term.html id="cache-control" %} value: `max-age=600`. Ten
minutes, uniform, with no knob anywhere.
{% include term.html id="github-pages" text="GitHub Pages" %} offers no
header configuration — no config file, no settings page — and the
community has asked for one for years. The other headers explain the
architecture: `via: 1.1 varnish` and that `x-served-by` node is Fastly's
{% include term.html id="cdn" %} edge — `BUR` is Burbank, a cache node
twenty minutes from my desk answering for a repo that lives in a
datacenter somewhere else entirely.

Ten minutes is the platform's freshness promise to itself. Fastly holds a
copy; GitHub purges it when you deploy; and the short lifetime is the
backstop that guarantees nobody anywhere sees stale content for longer
than ten minutes even if a purge misfires. Uniform and short because it
protects *their* correctness, not your bandwidth.

## Why it costs less than it reads

The audit's "savings" number imagines every repeat visitor re-downloading
everything after ten minutes. But expiry doesn't mean re-download — it
means *re-ask*. Each response carries an {% include term.html id="etag" %},
and a returning browser sends it back:

```text
$ curl -o /dev/null -w "%{http_code}  %{size_download} bytes  %{time_total}s" \
       -H 'If-None-Match: "6a5ef4a8-7360"' https://jihaoyb.github.io/

304  0 bytes  0.024s
```

A `304 Not Modified` — the polite {% include term.html id="http-status-code" %}
for "you already have it." **Zero bytes of body, 24 milliseconds.** After
the ten minutes, a repeat visitor pays one cheap handshake per resource,
not a download; with HTTP/2 multiplexing them over one connection, a
whole revisit revalidates for a few kilobytes of headers. (A nerd treat
hiding in plain sight: that ETag is the deploy timestamp and file size in
hex — `6a5ef4a8` decodes to the moment this site last deployed.)

<figure class="lab-figure">
<svg viewBox="0 0 700 240" role="img" aria-label="Timeline of repeat visits. Within ten minutes of the first visit, resources come straight from the browser cache with no network at all. A dashed marker labels the ten-minute expiry; after it, each resource revalidates with a 304 answer — zero bytes of body in about 24 milliseconds — instead of re-downloading." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="36" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">A REPEAT VISITOR'S TIMELINE</text>
  <text x="120" y="66" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">FIRST VISIT</text>
  <text x="420" y="66" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--accent-2)">10 MINUTES</text>
  <path d="M420 74 V220" style="fill:none;stroke:var(--muted);stroke-width:1.25;stroke-dasharray:3 5;opacity:.7"/>
  <text x="36" y="118" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">BEFORE</text>
  <rect x="120" y="96" width="292" height="44" rx="12" style="fill:var(--surface-2)"/>
  <text x="140" y="115" style="font-size:12.5px;font-weight:600;fill:var(--ink)">served from browser cache</text>
  <text x="140" y="131" style="font-size:11px;fill:var(--muted)">no network at all</text>
  <text x="36" y="192" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">AFTER</text>
  <rect x="428" y="170" width="128" height="44" rx="12" style="fill:var(--surface-2)"/>
  <rect x="428" y="170" width="4" height="44" rx="2" style="fill:var(--accent)"/>
  <text x="446" y="189" style="font-size:12.5px;font-weight:600;fill:var(--ink)">re-ask, not</text>
  <text x="446" y="205" style="font-size:12.5px;font-weight:600;fill:var(--ink)">re-download</text>
  <rect x="572" y="178" width="92" height="28" rx="14" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="618" y="196" text-anchor="middle" style="font-size:11px;fill:var(--muted)">304 · 24 ms</text>
</svg>
<figcaption>Expiry starts a conversation, not a transfer. The marker is the platform's; everything around it is still fast.</figcaption>
</figure>

## Where it did change a decision

This limit isn't purely academic — it priced one real trade-off on this
site. Self-hosting the web fonts meant giving up Google's year-long CDN
cache for GitHub's ten minutes. We took the deal anyway: the win was
removing two third-party origins from the *first* visit's critical path,
and the cost is a 304 handshake on revisits. First visits are where this
site is won or lost; the immovable made the arithmetic explicit instead
of vague.

The escape hatch, if the math ever flips, is the standard one — put a CDN
you control (Cloudflare and friends) in front and set your own headers.
That's real infrastructure with real failure modes, which is exactly why
the right first move was measuring whether the flag costs anything worth
fixing. Here, it doesn't: the audit line stays yellow, the site stays
simple, and I stop reading that row as a to-do. Some findings are chores;
some are just the terrain, labeled.
