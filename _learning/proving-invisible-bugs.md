---
title: "How to Prove a Bug You Can't Screenshot"
excerpt: "Every serious bug I fixed on this site last month was invisible to a camera: a flash with no frame, focus landing where screen readers hear nothing, fonts silently falling back. The console found all of them, once I stopped using it to print things."
date: 2026-07-23
minutes: 7
tags: [Debugging, DevTools, JavaScript]
category: Deep dive
terms: [screen-reader, computed-style, dom, synthetic-event, promise, console-utilities]
published: true
---

Here are four real bugs from this site, all fixed in the last month:

- The page [flashed white](/lab/the-first-paint-nobody-styles/) on a cold
  first visit, before any stylesheet arrived.
- Keyboard focus [landed on links](/lab/ghost-focus/) that
  {% include term.html id="screen-reader" text="screen readers" %}
  refused to announce.
- Navigations [intermittently logged](/lab/transition-was-skipped/)
  `AbortError: Transition was skipped`.
- Every Lab post was rendering in fallback fonts, and had been for weeks.

Not one of them can be screenshotted. The flash exists in a window where
the compositor hasn't produced a frame yet. Ghost focus is an *absence*:
a thing that doesn't get announced. The AbortError was a race that refused
to reproduce on demand. And the fallback fonts looked completely fine,
because fallback fonts always do.

The tool that caught all four was the console. Not `console.log` printing
values on their way past, but the console used the way a lab uses a
multimeter: point it at the thing, and read what the machine says the
value actually is.

## Stop asking "does it look right"

The habit worth building is to translate a vague visual doubt into a
question with a numeric or boolean answer. "The colors look off" becomes
*what does the root element compute to?* "The animation seems broken"
becomes *is there a running animation on this node, and what is its
playState?* Once the question has a definite answer, the bug either exists
or it doesn't, and you stop arguing with a screenshot.

Below are the probes that did the work here, grouped by the question they
answer. Every transcript is real, captured from this site while writing
this post.

## "What is this element actually?"

`getComputedStyle` returns the {% include term.html id="computed-style" %}:
the value the browser truly resolved after the whole cascade, not what any
one rule asked for. That distinction is the entire white-flash
investigation. The page couldn't be photographed mid-block, but it could
be interrogated: a proxy delayed the stylesheet by twelve seconds, and a
probe injected at the top of `<head>` sampled the root element from inside
that window. Before the fix, at every sample:

```text
t+500ms   bg=rgba(0,0,0,0)  scheme=normal
t+3000ms  bg=rgba(0,0,0,0)  scheme=normal
load      bg=rgb(24,20,15)  scheme=dark    ← dark paper snaps in at 12.2s
```

Transparent root, browser-white canvas, for twelve seconds. That's a bug
nobody can see and nobody can argue with.

Fonts have their own interrogation surface, and it hides a trap. This is
the live reading from this page:

```js
[...document.fonts].map(f => ({ family: f.family, status: f.status }))
// [{family: "Fraunces", status: "loaded"}, {family: "Space Grotesk", status: "loaded"}]

document.fonts.check("600 32px Fraunces")   // true
document.fonts.check("400 16px Nonesuch")   // true  ←!
```

That last line is why fallback fonts hid for weeks. `check()` does not
answer "does this family exist." It answers "can this be rendered without
waiting for a download," and an undeclared family needs no download, so it
returns `true` on a font nobody has. The trustworthy signal is enumerating
`document.fonts`, which lists only the faces you declared in `@font-face`
along with their real status.

## "Can this be reached?"

Ghost focus is an absence, and absences are awkward to demonstrate. The
probe is two lines:

```js
link.focus();
document.activeElement === link;
```

Run against a closed project folder on the homepage right now:

```text
{ inert: true, focusTook: false, linkText: "GitHub" }
```

The link exists, it has real text, and focus refuses to land on it. Before
the fix that middle value was `true`, which is precisely the bug: a link
reachable by keyboard that assistive technology never mentions. One
boolean settles it, in either direction.

## "Did this actually run?"

Two questions constantly worth asking: did the animation play, and when
did that file land?

```js
document.body.getAnimations().map(a => ({ name: a.animationName, state: a.playState }))
// [{ name: "page-enter", state: "running" }]

performance.getEntriesByType("resource")
  .filter(r => r.name.includes("main.css"))
// [{ start: 89, end: 98, transferKB: 81 }]
```

`getAnimations()` reports what the browser is *running*, which is not the
same as what your stylesheet declares. It was how I confirmed the
back/forward-cache fix worked: after a restored page, a fresh `page-enter`
had to exist with its currentTime near zero, and only the animation
timeline could say so. Resource timing, meanwhile, turns "the CSS felt
slow" into two integers you can compare across builds.

## "What happens if the user is a finger, not a mouse?"

Some conditions are miserable to reproduce by hand. A
{% include term.html id="synthetic-event" %} lets you state the condition
exactly instead. This site's glossary popovers open on hover, but *only*
for mouse pointers, because on touch devices the hover and click events
both fire and a tapped card would toggle straight back shut. The
{% include term.html id="dom" %} exposes that difference, so the test can
assert both directions:

```js
trigger.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
// term.classList.contains("is-open") → true

trigger2.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch" }));
// term2.classList.contains("is-open") → false
```

No touchscreen, no device lab, no guessing. The gate is proven in both
directions in under a second.

## "Did nothing go wrong?"

The hardest thing to verify is a negative: not "did my handler fire" but
"did nothing slip past it." For unhandled
{% include term.html id="promise" text="promise" %} rejections, the browser
offers an event for exactly this:

```js
let unhandled = 0;
window.addEventListener("unhandledrejection", () => { unhandled += 1; });

const rejected = () => Promise.reject(new DOMException("Transition was skipped", "AbortError"));
const ev = new Event("pagereveal");
ev.viewTransition = { ready: rejected(), finished: rejected(), updateCallbackDone: rejected() };
window.dispatchEvent(ev);

// 400ms later → unhandled === 0
```

Three deliberately rejected promises, fired at the real listener, and the
counter stays at zero. That's proof the silencer holds, without waiting
around for a race condition to happen naturally.

## "Does this fit?"

The site's diagrams are hand-written SVG, and text that overflows its
canvas is easy to miss when the figure looks fine at one width. `getBBox()`
answers geometrically:

```js
[...svg.querySelectorAll("text")]
  .map(t => Math.round(t.getBBox().x + t.getBBox().width))
  .filter(right => right > 700)
// [] — widest label ends at 648 of 700
```

That check now runs before any diagram ships.

<figure class="lab-figure">
<svg viewBox="0 0 700 246" role="img" aria-label="Diagram contrasting two instruments answering one question about whether the page painted the right color before its stylesheet arrived. The camera path takes a screenshot during the render block and is inconclusive because the compositor produced no frame. The probe path calls getComputedStyle at 500 milliseconds and returns a decisive color value." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="36" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">ONE QUESTION, TWO INSTRUMENTS</text>
  <text x="36" y="62" style="font-size:12.5px;fill:var(--ink)">Did the page paint paper-dark before the stylesheet arrived?</text>
  <text x="36" y="114" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">CAMERA</text>
  <rect x="140" y="92" width="300" height="48" rx="12" style="fill:var(--surface-2)"/>
  <text x="160" y="112" style="font-size:12.5px;font-weight:600;fill:var(--ink)">screenshot during the block</text>
  <text x="160" y="128" style="font-size:11px;fill:var(--muted)">no frame has been produced yet</text>
  <rect x="460" y="102" width="180" height="28" rx="14" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="550" y="120" text-anchor="middle" style="font-size:11px;fill:var(--muted)">inconclusive</text>
  <text x="36" y="194" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">PROBE</text>
  <rect x="140" y="172" width="300" height="48" rx="12" style="fill:var(--surface-2)"/>
  <rect x="140" y="172" width="4" height="48" rx="2" style="fill:var(--accent)"/>
  <text x="160" y="192" style="font-size:12.5px;font-weight:600;fill:var(--ink)">getComputedStyle at t+500ms</text>
  <text x="160" y="208" style="font-size:11px;fill:var(--muted)">reads what the root actually resolved to</text>
  <rect x="460" y="182" width="180" height="28" rx="14" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="550" y="200" text-anchor="middle" style="font-size:11px;fill:var(--muted)">rgb(24, 20, 15)</text>
</svg>
<figcaption>Same moment, same page. One instrument has nothing to report; the other returns a value you can act on.</figcaption>
</figure>

## The helpers that only exist in the console

Separate from all of the above is a set of conveniences worth knowing:
`$0` for the currently selected element, `$$("sel")` for a real array of
matches, `copy(obj)` to put something on your clipboard,
`getEventListeners(el)` to see what's actually bound, `monitorEvents(el)`
to log everything a node receives.

The catch that trips people up: these are the
{% include term.html id="console-utilities" %}, injected by DevTools into
the console only. Verified from page context on this site:

```js
["$0", "$$", "copy", "monitorEvents", "getEventListeners"]
  .filter(name => typeof window[name] !== "undefined")
// [] — none of them exist here
```

Wonderful while you're poking around by hand. Paste one into your source
and it throws.

## Write the probe into the page

The most useful habit in this whole list: when the thing you want to
measure happens *before you can type*, stop trying to observe it live and
make the page record itself.

The white-flash measurement only worked because the probe was injected at
the top of `<head>`, sampling on a timer and stashing results on `window`
for me to read afterward. Racing a twelve-second window by hand would have
produced noise; a page that writes down its own timeline produces
evidence. Same instinct applies to slow builds, animation sequences, and
anything involving a first paint.

## When the console lies

Three failures that cost me real time, all worth knowing before you trust
a reading:

**A hidden tab freezes the choreography.** Browsers deprioritize
background documents, so CSS animations don't progress. Captured live
while writing this, on a perfectly healthy page:

```text
{ visibilityState: "hidden", bodyOpacity: "0", animationName: "page-enter" }
```

Opacity zero, with the entrance animation applied but never advancing. The
page is fine. The observation is not. Anything animation-dependent has to
be measured on a foregrounded document.

**Geometry needs a real viewport.** In an automated browser with a
zero-width window, every `getBoundingClientRect()` is nonsense, and it
looks like a layout bug rather than a measurement bug. This site's text
demo once reported a "144px error" that was entirely a 118px-wide pane.
Set the viewport, then measure.

**A stale document survives a reload.** Cached HTML can outlive what looks
like a hard refresh, so you end up debugging a version of the page that no
longer exists. Cache-bust with a throwaway query string when a fix
"doesn't take."

## The through-line

Screenshots are for showing people what you built. Probes are for finding
out whether it works. The four bugs at the top of this post all shared one
property: they lived where the eye can't go, in the milliseconds before a
paint, in the accessibility tree, in a promise nobody was holding. None of
them needed a fancy tool. They needed a definite question and an honest
answer, which is what the console is for.
