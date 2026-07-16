---
title: "“Transition Was Skipped”: When a Console Error Is a Feature"
excerpt: "An intermittent AbortError kept appearing during page changes. The trail led to a race Chrome runs against your stylesheet, a one-line rule in the wrong place, and a rejection nobody was supposed to catch."
date: 2026-07-15
minutes: 4
tags: [CSS, Browsers, Debugging]
category: Field notes
terms: [view-transitions, render-blocking, promise]
published: true
---

Sometimes — not always, and never on demand — changing pages on this site
logged this to the console:

```text
Uncaught (in promise) AbortError: Transition was skipped
```

Intermittent errors are the worst kind, because you can't interrogate what
you can't reproduce. This one turned out to have two separate lessons in
it: one about *where* a CSS rule lives, and one about errors that aren't
errors at all.

## The machinery under the fade

This site's cross-page fade rides on cross-document
{% include term.html id="view-transitions" %}: the browser snapshots the
old page, fades it out, and reveals the new one — natively, even for the
back button, which no script can intercept. Both the outgoing and incoming
page opt in with a single rule:

```css
@view-transition {
  navigation: auto;
}
```

I had put that rule where every other style lives: in the site's main
stylesheet. Which compiles to a large file. Near the end of it.

## The race

The specification says the browser should look for the opt-in when the new
page is revealed, *after* waiting for
{% include term.html id="render-blocking" %} stylesheets. Chrome's check
doesn't reliably wait for external files — a
[documented gap](https://vtbag.dev/tips/view-transition-fails-and-fixes/)
between spec and implementation. So on every navigation, two things raced:
Chrome's opt-in check, and the download of the stylesheet that contained
the opt-in.

Win the race: smooth transition. Lose it: Chrome concludes the page never
opted in, **skips** the transition, and swaps abruptly — and the
transition object it had already created rejects its
{% include term.html id="promise" text="promises" %} with that `AbortError`.
Nothing on the page was holding them, so every lost race surfaced as an
uncaught rejection in the console. Intermittent, timing-dependent,
unreproducible on demand — because it literally was a race.

If that failure shape sounds familiar, it should: it's
[the white-flash bug](/lab/the-first-paint-nobody-styles/) all over again.
An instruction the browser needs *before* the stylesheet arrives, locked
inside the stylesheet. Same disease, different organ. And the cure was
already built — this site has an inline first-paint kit in the `<head>`
for exactly this class of instruction. The opt-in moved in with the
canvas colors, where detection isn't a race, and the skips stopped.

<figure class="lab-figure">
<svg viewBox="0 0 700 268" role="img" aria-label="Timeline diagram. A dashed vertical marker labeled 'Chrome checks for the opt-in' crosses two lanes. Before the fix: at the marker, the stylesheet carrying the rule is still downloading, so the navigation ends skipped with an AbortError. After the fix: the opt-in is inline in the head and already parsed well before the marker, so the transition runs." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="36" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">ONE NAVIGATION, TWO PLACES FOR ONE RULE</text>
  <text x="120" y="66" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">0 MS</text>
  <text x="400" y="66" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--accent-2)">CHROME CHECKS FOR THE OPT-IN</text>
  <path d="M400 74 V248" style="fill:none;stroke:var(--muted);stroke-width:1.25;stroke-dasharray:3 5;opacity:.7"/>
  <text x="36" y="128" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">BEFORE</text>
  <rect x="120" y="96" width="400" height="56" rx="12" style="fill:var(--surface-2)"/>
  <text x="140" y="120" style="font-size:13px;font-weight:600;fill:var(--ink)">stylesheet still downloading</text>
  <text x="140" y="137" style="font-size:11px;fill:var(--muted)">the opt-in rule is inside, unread</text>
  <rect x="536" y="110" width="128" height="28" rx="14" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="600" y="128" text-anchor="middle" style="font-size:11px;fill:var(--muted)">skipped + AbortError</text>
  <text x="36" y="208" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">AFTER</text>
  <rect x="120" y="176" width="180" height="56" rx="12" style="fill:var(--surface-2)"/>
  <rect x="120" y="176" width="4" height="56" rx="2" style="fill:var(--accent)"/>
  <text x="140" y="200" style="font-size:13px;font-weight:600;fill:var(--ink)">opt-in inline</text>
  <text x="140" y="217" style="font-size:11px;fill:var(--muted)">parsed with the HTML</text>
  <rect x="536" y="190" width="128" height="28" rx="14" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="600" y="208" text-anchor="middle" style="font-size:11px;fill:var(--muted)">transition runs</text>
</svg>
<figcaption>The check is a moment, not a courtesy: the before-lane's stylesheet is still in flight when it fires; the after-lane's rule was parsed long before. The only reliable move is to be already there.</figcaption>
</figure>

## The error that deserves to exist

Here's the twist: fixing the race doesn't make skips impossible, because
**skipping is a feature**. Click two links in quick succession, hide the
tab mid-navigation, or land on a page that takes longer than Chrome's
roughly four-second deadline, and the browser deliberately abandons the
animation and just swaps — graceful degradation, exactly what you'd want.
The page changed; only the choreography was dropped.

But the abandoned transition still rejects its promises, and an unhandled
rejection prints as an error even when nothing went wrong for anyone. The
fix is to acknowledge, not handle:

```js
window.addEventListener("pageswap", (event) => {
  const vt = event.viewTransition;
  if (!vt) return;
  vt.ready.catch(() => {});
  vt.finished.catch(() => {});
  vt.updateCallbackDone.catch(() => {});
});
```

The same listener runs on `pagereveal` for the inbound side. There is
nothing to *do* in those handlers — the swap already happened — the point
is that someone is holding the promise when it rejects, so a routine skip
stops impersonating a crash. I verified it by dispatching a synthetic
`pagereveal` carrying three pre-rejected promises: zero unhandled
rejections reached the console.

## What this one taught

Whose bug was it? Genuinely split. The race is Chrome's gap versus the
spec — my mistake was only *placement*, and nobody warns you about it
until you hit it. The console noise, though, was mine to own: a promise
the platform hands you is a promise you should hold, even if all you do
is nod. And the transferable lesson sits above both: **declarative
opt-ins are only as reliable as the moment they become visible to the
browser** — for anything checked at navigation time, inline in the head
is the only place that never races.
