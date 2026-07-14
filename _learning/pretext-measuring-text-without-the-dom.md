---
title: "Pretext: Measuring Text Without Touching the DOM"
excerpt: "Cheng Lou's new library lays out multiline text with pure arithmetic — no reflow, no getBoundingClientRect. There's a live demo inside this post."
date: 2026-07-13
minutes: 6
tags: [Performance, Text Layout, TypeScript]
terms: [pretext, reflow, virtualization, es-modules, dom, canvas, cdn, layout-shift]
published: true
---

Some libraries add a capability. The interesting ones remove a *tax*. 
{% include term.html id="pretext" %} — a TypeScript library by
Cheng Lou, released this spring and closing in on 50k stars — removes one of
the oldest taxes on the web: to know how tall a paragraph will be, you had to
ask the browser, and asking wasn't free.

## The tax every measurement pays

The {% include term.html id="dom" text="DOM" %} will happily tell you what text measures — `offsetHeight`,
`getBoundingClientRect()` — but those reads can force a synchronous
{% include term.html id="reflow" %}: the browser stops, recomputes geometry,
and *then* answers. Do that per item in a scrolling list, or per keystroke,
and you've built a page that stutters on principle. The classic workarounds
are all apologies: guess an average height, cache and hope, render invisible
clone nodes just to measure them.

Pretext's move is to stop asking. It implements text measurement itself,
using the browser's own font engine (via {% include term.html id="canvas" %}) as ground truth — so the
answer matches what the DOM *would* say, without the DOM being consulted.

## Measure once, then it's arithmetic

The API is split in two, and the split *is* the design:

```ts
import { prepare, layout } from '@chenglou/pretext'

const prepared = prepare('AGI 春天到了. بدأت الرحلة 🚀', '16px Inter')
const { height, lineCount } = layout(prepared, 320, 20) // no DOM, no reflow
```

`prepare()` does the expensive work exactly once per text: normalize,
segment (it handles scripts you didn't know existed, plus emoji), measure
the segments, cache the widths. `layout()` is the hot path: given a width
and line height, it's pure arithmetic over those cached numbers. Resize?
Re-run `layout()` only. Same text at fifty widths? Fifty additions, not
fifty reflows.

<figure class="lab-figure">
<svg viewBox="0 0 700 170" role="img" aria-label="Diagram: text and font go through prepare, which measures once and caches widths; layout then computes height and line count with pure arithmetic. Prepare reruns only when text changes; layout reruns freely." xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1.5L8 5L2 8.5" style="fill:none;stroke:var(--muted);stroke-width:1.7" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <rect x="36" y="30" width="150" height="66" rx="12" style="fill:var(--surface-2)"/>
  <text x="58" y="52" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">INPUT</text>
  <text x="58" y="71" style="font-size:14px;font-weight:600;fill:var(--ink)">Text + font</text>
  <text x="58" y="87" style="font-size:11.5px;fill:var(--muted)">any script, emoji</text>
  <path d="M186 63 H218" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <rect x="222" y="30" width="190" height="66" rx="12" style="fill:var(--surface-2)"/>
  <text x="244" y="52" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">PREPARE()</text>
  <text x="244" y="71" style="font-size:14px;font-weight:600;fill:var(--ink)">Measure once</text>
  <text x="244" y="87" style="font-size:11.5px;fill:var(--muted)">segment · cache widths</text>
  <path d="M412 63 H444" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <rect x="448" y="30" width="216" height="66" rx="12" style="fill:var(--surface-2)"/>
  <rect x="448" y="30" width="4" height="66" rx="2" style="fill:var(--accent)"/>
  <text x="470" y="52" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent)">LAYOUT(WIDTH)</text>
  <text x="470" y="71" style="font-size:14px;font-weight:600;fill:var(--ink)">Pure arithmetic</text>
  <text x="470" y="87" style="font-size:11.5px;fill:var(--muted)">height · line count, instantly</text>
  <path d="M317 96 V120" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8"/>
  <rect x="222" y="124" width="190" height="30" rx="15" style="fill:var(--tag-bg);stroke:var(--border-soft)"/>
  <text x="317" y="143" text-anchor="middle" style="font-size:11.5px;fill:var(--muted)">rerun only when text changes</text>
  <path d="M556 96 V120" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8"/>
  <rect x="448" y="124" width="216" height="30" rx="15" style="fill:var(--tag-bg);stroke:var(--border-soft)"/>
  <text x="556" y="143" text-anchor="middle" style="font-size:11.5px;fill:var(--muted)">rerun freely — resize, scroll</text>
</svg>
<figcaption>The split is the design: pay for measurement once, then layout is additions over cached widths.</figcaption>
</figure>

## Try it — this is live

The panel below imports pretext straight from a {% include term.html id="cdn" text="CDN" %} as an
{% include term.html id="es-modules" text="ES module" %} and runs it on
whatever you type. Drag the width and watch: only `layout()` re-runs, and
the dashed outline — pretext's *prediction* — should agree with the real
paragraph underneath it to the pixel. The "DOM cross-check" stat is the one
deliberate DOM read, kept as proof rather than dependence.

{% include lab-demo-pretext.html %}

Two things worth noticing while you play. The `layout()` timing is an
average over 200 runs because a single call is too fast to time honestly.
And mixed scripts — CJK, Arabic, emoji — wrap correctly, because
segmentation happened in `prepare()`, where the cost belongs.

## What a cheap answer unlocks

Once "how tall will this be?" costs microseconds instead of a reflow, whole
categories of UI stop being painful:

- **Honest {% include term.html id="virtualization" %}.** Virtual lists
  need every item's height before rendering it. With pretext you *compute*
  them — no average-height guessing, no correction jumps mid-scroll.
- **Text outside the DOM.** Canvas, SVG, WebGL — pretext's lower-level API
  (`prepareWithSegments`, `layoutNextLine`) hands you the lines themselves,
  including laying each line at a *different* width — which is how you flow
  text around a floated image by hand.
- **Shrink-wrap and balance.** `measureLineStats()` tells you the widest
  line a given width produces, so you can binary-search the tightest
  container that still fits — the multiline shrink-wrap CSS never gave us.
- **No {% include term.html id="layout-shift" text="layout shift" %}.** If you know the height of incoming text before it
  lands, you can reserve the space and re-anchor scroll positions instead
  of apologizing after the jump.
- **Dev-time verification.** Because it runs anywhere JS runs, you can
  assert "this label never wraps at this width" in a test — no browser
  spun up. The README pitches this as AI-friendly, and it's right: an agent
  iterating on UI can now *check* text overflow instead of eyeballing it.

## When not to reach for it

Honesty section, as always. For ordinary static content, CSS already lays
text out perfectly well — pretext earns its keep in *hot paths* and
*non-DOM* rendering, not in a blog paragraph. Its predictions are only as
good as your discipline: the font string, letter-spacing, and line-height
you pass must exactly mirror your CSS, and the font must actually be loaded
before `prepare()` measures (the demo above awaits `document.fonts.ready`
for exactly that reason). Hyphenation isn't automatic — you insert soft
hyphens yourself and pretext treats them as break opportunities. And
server-side rendering is still on the roadmap, not in the box.

None of those are flaws so much as edges: it's a sharp tool with a clear
shape, which is the best kind.

---

A meta-note for regulars: the panel above is this site's first *embedded*
live demo — the pattern the projects section's `demo_type: embed`
classification has been waiting for. The next post in that thread will be
about bringing demos to the project pages themselves. If the prediction and
the cross-check disagreed on your machine, tell me in the discussion below —
that's exactly the kind of edge worth hearing about.
