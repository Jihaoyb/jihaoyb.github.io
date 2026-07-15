---
title: "The First Paint Nobody Styles"
excerpt: "This site fades between pages — except the very first paint, which flashed white before the CSS ever arrived. The fix is thirty lines in the head, and every one of them has to sit above the stylesheet."
date: 2026-07-14
minutes: 6
tags: [CSS, Performance, Debugging]
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
<svg viewBox="0 0 700 300" role="img" aria-label="Timeline diagram: before the fix, a first visit shows a white browser canvas until the CSS arrives at around 12 seconds cold, then dark paper and the fade-in. After the fix, the canvas is paper-dark from the first frame and the CSS arrival is invisible." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="40" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">FIRST VISIT, DARK-MODE VISITOR — STYLESHEET DELAYED</text>
  <text x="36" y="92" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">BEFORE</text>
  <rect x="120" y="70" width="300" height="56" rx="10" style="fill:#ffffff;stroke:var(--line);stroke-width:1.25"/>
  <text x="140" y="94" style="font-size:13px;font-weight:600;fill:#151515">white</text>
  <text x="140" y="111" style="font-size:11px;fill:#4c4c4c">browser default canvas</text>
  <rect x="428" y="70" width="236" height="56" rx="10" style="fill:#18140f;stroke:var(--line);stroke-width:1.25"/>
  <text x="448" y="94" style="font-size:13px;font-weight:600;fill:#ece3d6">dark paper snaps in</text>
  <text x="448" y="111" style="font-size:11px;fill:#a89e8d">then the fade plays</text>
  <text x="36" y="192" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">AFTER</text>
  <rect x="120" y="170" width="544" height="56" rx="10" style="fill:#18140f;stroke:var(--line);stroke-width:1.25"/>
  <rect x="120" y="170" width="4" height="56" rx="2" style="fill:var(--accent)"/>
  <text x="140" y="194" style="font-size:13px;font-weight:600;fill:#ece3d6">paper-dark from the first frame</text>
  <text x="140" y="211" style="font-size:11px;fill:#a89e8d">meta + boot script + inline paper tones</text>
  <path d="M428 56 V240" style="fill:none;stroke:var(--muted);stroke-width:1.25;stroke-dasharray:3 5;opacity:.8"/>
  <text x="428" y="262" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">CSS ARRIVES</text>
  <text x="120" y="262" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">0 MS</text>
</svg>
<figcaption>The same twelve seconds, before and after. The fix doesn't make the CSS faster — it makes the wait wear the right color.</figcaption>
</figure>

## What testing shook loose

The fix above is where the story was supposed to end. Then real testing —
clicking around the site with the network and console panels open — turned
up two more things worth understanding. Both are lessons in reading
evidence.

**The 204 that wasn't a problem.** Watching the network waterfall, every
page change *ended* with a `204` — which looks alarming if you read it as
"the page finished on an error." It isn't one. `2xx` codes are the success
class, and `204 No Content` means "received, nothing to send back" — it's
the standard reply from analytics beacons, which fire last and so sit at
the bottom of every waterfall. The row was Google Analytics acknowledging a
page view. The real finding was one panel over: those beacons were firing
during *local development*, because this theme ships analytics without an
environment guard. Every test click was polluting the production analytics
data — and cluttering the very network panel I was debugging in. One-line
fix: emit the analytics include only when the build environment is
production, which GitHub Pages sets automatically and `jekyll serve`
doesn't.

**The AbortError that was the same bug wearing a different coat.**
Intermittently, a page change logged `Uncaught (in promise) AbortError:
Transition was skipped`. This site's cross-page fade rides on cross-document
view transitions, which both pages opt into with a one-line
`@view-transition` rule — and I had put that rule where all CSS goes: in
the big stylesheet. The spec says the browser checks for the opt-in after
waiting for render-blocking CSS; Chrome's check doesn't reliably wait.
So whether any given navigation got a transition was a race against the
same 190KB download from part one — instructions locked in the box that
hasn't arrived, the exact disease this post is about, afflicting a second
organ. Lost races skipped the transition (abrupt swap, no fade) and the
abandoned transition object rejected promises nobody was holding, hence
the console noise. The opt-in now lives in the same inline first-paint kit,
where detection isn't a race. And because skips are also *legitimate* —
rapid clicks, a hidden tab, a page slower than Chrome's ~4-second deadline
all abandon the animation on purpose — the site now observes those promises
and discards the rejection: the swap already happened; there's nothing to
handle.

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
