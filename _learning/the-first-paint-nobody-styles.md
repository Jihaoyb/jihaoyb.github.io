---
title: "The First Paint Nobody Styles"
excerpt: "This site fades between pages — except the very first paint, which flashed white before the CSS ever arrived. The fix is thirty lines in the head, and every one of them has to sit above the stylesheet."
date: 2026-07-14
minutes: 5
tags: [CSS, Performance, Debugging]
category: Build log
terms: [render-blocking, dom, local-storage, critical-css]
published: true
---

This site takes its transitions seriously. Pages fade out and in, the
`<html>` element carries the paper tone so the fade never reveals a raw
backdrop, and a saved dark theme applies before the first frame. All of that
shipped a few posts ago, and clicking around the site it feels seamless.

Then I opened the site after a few days away and caught it doing the one
thing all that work was supposed to prevent: a **flash of white**, then the
content popping in. Reload — gone. Every navigation after — smooth. Only the
first visit in a while misbehaved, which is exactly the kind of bug that
hides from the person who works on the site all day.

## The paint before your first paint

Everything this site knows about color lives in one stylesheet. That file is
{% include term.html id="render-blocking" %}: the browser refuses to paint
anything until it has downloaded, parsed, and applied it. On a warm cache
that's a rounding error. On a cold first visit it's a real window of time —
and during that window the browser still has to show *something*.

What it shows is its own default canvas. Not your `--paper` token, not your
dark theme — the user-agent default, which is white unless the page has said
otherwise somewhere the browser can already see. And here's the trap: this
site *did* say otherwise, in `color-scheme` declarations and `<html>`
background rules… all of them inside the very stylesheet the browser was
waiting for. The instructions for surviving the wait were locked in the box
that hadn't arrived.

So a dark-mode visitor's first load went: white canvas for as long as the
CSS took, then dark paper snapping in, then the fade-in choreography playing
to an audience that had already seen the flash.

Two details made this bug good at hiding. Warm caches make the window
imperceptible, so it only appears "the first time in a while." And browsers
*paint-hold* same-origin navigations — while the next page's CSS downloads,
they keep showing the previous page — so clicking around the site can never
reproduce it. This flash only exists at the front door.

## Measuring a window you can't screenshot

You can't easily photograph the blocked window (the compositor won't even
produce a frame), but you can interrogate it. I put a proxy in front of my
local build that delays the stylesheet by 12 seconds, and injected a probe
at the top of `<head>` that samples what the root element actually computes
to while everything waits. The {% include term.html id="dom" %} keeps
building during the block — scripts placed *above* the stylesheet link still
run — so the probe can take timestamped readings from inside the window.

Before the fix, a dark-preference visitor's first 12 seconds looked like
this:

```text
t+500ms   bg=rgba(0,0,0,0)  scheme=normal  ← transparent root, UA-white canvas
t+3000ms  bg=rgba(0,0,0,0)  scheme=normal
t+10000ms bg=rgba(0,0,0,0)  scheme=normal
load      bg=rgb(24,20,15)  scheme=dark    ← dark paper snaps in at 12.2s
```

Twelve seconds of white, then the snap. That's the bug, in numbers.

## The fix: thirty lines above the stylesheet

The repair is three small layers, and their *position* matters as much as
their content:

```html
<!-- 1. Parse-time declaration — no CSS needed -->
<meta name="color-scheme" content="light dark">

<!-- 2. Saved theme, applied before first paint -->
<script>
  var t = localStorage.getItem("theme");
  if (t === "light" || t === "dark") {
    document.documentElement.setAttribute("data-theme", t);
    document.querySelector('meta[name="color-scheme"]')
      .setAttribute("content", t);
  }
</script>

<!-- 3. The paper tones, inline -->
<style>
  html { background-color: #f6f1e9; color-scheme: light; }
  @media (prefers-color-scheme: dark) {
    html:not([data-theme]) { background-color: #18140f; color-scheme: dark; }
  }
  html[data-theme="dark"] { background-color: #18140f; color-scheme: dark; }
</style>

<!-- only now: -->
<link rel="stylesheet" href="/assets/css/main.css">
```

The meta tag is the load-bearing piece. `color-scheme` in a `<meta>` is
processed the moment it's parsed — before any stylesheet exists — so the
browser knows "this page supports dark" in time to paint its *blank* canvas
dark. The boot script reads the saved theme from
{% include term.html id="local-storage" text="localStorage" %} and narrows
that meta to one side, so someone who chose light mode on a dark-mode OS
gets a light canvas instead of an inverted flash. And the inline style block
paints the window in this site's actual paper tones rather than the
browser's generic ones — it's a tiny dose of
{% include term.html id="critical-css" %}, scoped to the two rules the first
frame genuinely cannot do without.

The trap I fell into on the first attempt: I put the style block *below*
the stylesheet link, and the probe showed it never applying during the
window. Scripts and styles that come after a render-blocking stylesheet
wait for it — a classic `<script>` can't run until the CSSOM above it is
ready, so the parser stalls right there and nothing beneath it even enters
the document until the CSS lands. The entire kit has to sit above the link,
or it's just more cargo in the box that hasn't arrived.

After the fix, the same 12-second torture test:

```text
t+500ms   bg=rgb(24,20,15)  scheme=dark  ← paper-dark, 11.5s before the CSS
t+3000ms  bg=rgb(24,20,15)  scheme=dark
t+10000ms bg=rgb(24,20,15)  scheme=dark
load      bg=rgb(24,20,15)  scheme=dark  ← identical: nothing snaps
```

Same values during the wait as after it — there is no longer a "before" to
flash. The saved-theme and light-preference cases probe the same way: right
paper tone from the first frame.

<figure class="lab-figure">
<svg viewBox="0 0 700 268" role="img" aria-label="Timeline diagram of a dark-mode visitor's first visit with the stylesheet delayed. A dashed vertical marker labeled 'CSS arrives' crosses two lanes. Before the fix: the canvas is white from zero until the marker, where dark paper snaps in and the fade plays. After the fix: one continuous paper-dark bar runs from the first frame straight through the marker — nothing visibly changes when the CSS lands." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="36" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">FIRST VISIT, DARK-MODE VISITOR — STYLESHEET DELAYED</text>
  <text x="120" y="66" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">0 MS</text>
  <text x="428" y="66" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--accent-2)">CSS ARRIVES — 12 S COLD</text>
  <path d="M428 74 V248" style="fill:none;stroke:var(--muted);stroke-width:1.25;stroke-dasharray:3 5;opacity:.7"/>
  <text x="36" y="128" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">BEFORE</text>
  <rect x="120" y="96" width="302" height="56" rx="12" style="fill:#ffffff;stroke:var(--line);stroke-width:1.25"/>
  <text x="140" y="120" style="font-size:13px;font-weight:600;fill:#151515">white</text>
  <text x="140" y="137" style="font-size:11px;fill:#4c4c4c">browser default canvas</text>
  <rect x="434" y="96" width="230" height="56" rx="12" style="fill:#18140f;stroke:var(--line);stroke-width:1.25"/>
  <text x="454" y="120" style="font-size:13px;font-weight:600;fill:#ece3d6">dark paper snaps in</text>
  <text x="454" y="137" style="font-size:11px;fill:#a89e8d">then the fade plays</text>
  <text x="36" y="208" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">AFTER</text>
  <rect x="120" y="176" width="544" height="56" rx="12" style="fill:#18140f;stroke:var(--line);stroke-width:1.25"/>
  <rect x="120" y="176" width="4" height="56" rx="2" style="fill:var(--accent)"/>
  <text x="140" y="200" style="font-size:13px;font-weight:600;fill:#ece3d6">paper-dark from the first frame</text>
  <text x="140" y="217" style="font-size:11px;fill:#a89e8d">meta + boot script + inline paper tones — the moment passes unseen</text>
</svg>
<figcaption>The same twelve seconds, before and after. In the before-lane the marker is a visible seam; in the after-lane the bar runs straight through it. The fix doesn't make the CSS faster — it makes the wait wear the right color.</figcaption>
</figure>

## What testing shook loose

The fix above is where the story was supposed to end. Then real testing —
clicking around with the network and console panels open — surfaced two
more finds, each of which earned its own field note: a
[status 204 that looked like an error](/lab/the-204-that-looked-like-an-error/)
(it was analytics working as designed — but it exposed dev traffic
polluting the real data), and an
[intermittent "Transition was skipped" AbortError](/lab/transition-was-skipped/)
that turned out to be this exact bug wearing a different coat — another
instruction the browser needed early, locked inside the same stylesheet.

One boundary, named honestly: none of this can color the wait for the HTML
itself. Before the first byte arrives there is no document, no meta tag, no
inline style — that blank belongs entirely to the browser. Locally, a dev
server mid-rebuild can stall right there; production serves HTML from a
CDN, which is why you'll likely never see it deployed.

## What I deliberately didn't do

The full version of this technique inlines *all* above-the-fold CSS and
loads the stylesheet asynchronously. I stopped well short of that: it trades
one flash for a subtler one (unstyled content reflowing into styled), and it
turns every style change into a two-place edit. Thirty lines that make the
wait invisible beat three hundred that make it merely different.

The honest cost that remains: those paper hex values now live in two places,
and the comments on both copies point at each other. If the palette ever
changes, that's the tax. It's the right trade — the alternative was a white
flashbulb aimed at every first-time visitor, which for a portfolio is
precisely the audience that matters.
