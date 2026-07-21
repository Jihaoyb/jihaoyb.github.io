---
title: "Ghost Focus: the Links Only the Keyboard Could Find"
excerpt: "This site had links a keyboard could reach but a screen reader would never announce — focus landing on elements assistive tech says don't exist. One audit line, one modern attribute, and the ghost is gone."
date: 2026-07-17
minutes: 4
tags: [Accessibility, HTML, Debugging]
category: Field notes
terms: [lighthouse, dom, screen-reader]
published: true
---

Some bugs announce themselves in the console. This one was perfectly
silent — no error, no visual glitch, nothing to reproduce. It surfaced as
a single line in a {% include term.html id="lighthouse" %} report, and then a second time when Jihao
ran his own audit and hit the same line independently:

```text
[aria-hidden="true"] elements contain focusable descendants
```

Two audits, one sentence, and a class of user this site was quietly
failing.

## Two maps of the same page

A browser keeps more than one account of what's on a page. There's the
visual layout everyone sees. There's the **tab order** — the sequence
keyboard users walk with the Tab key. And there's the **accessibility
tree** — the pruned outline of the {% include term.html id="dom" %} that a
{% include term.html id="screen-reader" %} actually reads from.

`aria-hidden="true"` edits exactly one of those maps. It prunes an element
— and everything inside it — out of the accessibility tree. It does
*nothing* to the tab order. So a link inside an `aria-hidden` container is
in a strange superposition: the keyboard can reach it, the screen reader
has never heard of it.

That's ghost focus. A blind user tabbing through the page hits the link
and their software says **nothing** — focus has landed on an element that,
per the accessibility tree, does not exist. Press Enter and the page
navigates somewhere they were never told about.

## Where this site grew one

The homepage's project folders show closed "papers" peeking out of each
folder — a visual tease of the files inside. Those files contain real
GitHub and Demo links. The container was marked `aria-hidden="true"`
while closed, which was half right: a closed folder *shouldn't* announce
its contents. But the links inside stayed tabbable, so every closed
folder was a little haunted house of unreachable-but-focusable stops on
the keyboard path.

<figure class="lab-figure">
<svg viewBox="0 0 700 292" role="img" aria-label="Diagram of the same closed folder seen by two systems. Before: the tab order includes the GitHub link, but the screen reader's view is silence — ghost focus. After: with inert, both views agree the link is absent until the folder opens." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="36" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">ONE CLOSED FOLDER, TWO ACCOUNTS OF IT</text>
  <text x="36" y="84" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">TAB ORDER</text>
  <rect x="160" y="62" width="120" height="40" rx="10" style="fill:var(--surface-2)"/>
  <text x="220" y="87" text-anchor="middle" style="font-size:12.5px;fill:var(--muted)">Resume</text>
  <rect x="296" y="62" width="150" height="40" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.5;stroke-dasharray:4 4"/>
  <text x="371" y="81" text-anchor="middle" style="font-size:12.5px;font-weight:600;fill:var(--ink)">GitHub link</text>
  <text x="371" y="96" text-anchor="middle" style="font-size:10px;fill:var(--muted)">inside the closed folder</text>
  <rect x="462" y="62" width="120" height="40" rx="10" style="fill:var(--surface-2)"/>
  <text x="522" y="87" text-anchor="middle" style="font-size:12.5px;fill:var(--muted)">Contact</text>
  <text x="36" y="164" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">SCREEN READER</text>
  <rect x="160" y="142" width="120" height="40" rx="10" style="fill:var(--surface-2)"/>
  <text x="220" y="167" text-anchor="middle" style="font-size:12.5px;fill:var(--muted)">Resume</text>
  <text x="371" y="167" text-anchor="middle" style="font-size:12.5px;fill:var(--muted)">— silence —</text>
  <rect x="462" y="142" width="120" height="40" rx="10" style="fill:var(--surface-2)"/>
  <text x="522" y="167" text-anchor="middle" style="font-size:12.5px;fill:var(--muted)">Contact</text>
  <text x="36" y="248" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">WITH INERT</text>
  <rect x="160" y="226" width="120" height="40" rx="10" style="fill:var(--surface-2)"/>
  <rect x="160" y="226" width="4" height="40" rx="2" style="fill:var(--accent)"/>
  <text x="220" y="251" text-anchor="middle" style="font-size:12.5px;fill:var(--muted)">Resume</text>
  <rect x="462" y="226" width="120" height="40" rx="10" style="fill:var(--surface-2)"/>
  <text x="522" y="251" text-anchor="middle" style="font-size:12.5px;fill:var(--muted)">Contact</text>
  <text x="371" y="251" text-anchor="middle" style="font-size:11px;fill:var(--muted)">absent from both — until opened</text>
</svg>
<figcaption>The bug is the disagreement between the two middle cells. inert makes both accounts tell the same story.</figcaption>
</figure>

## The fix is one attribute

The classic repairs are all bookkeeping: set `display: none` (kills the
visual peek this design depends on) or hand out `tabindex="-1"` to every
focusable descendant and remember to take it back on open (a little state
machine that will eventually drift).

The modern repair is the **`inert`** attribute — baseline in every major
browser since 2023. An inert element and all its descendants are removed
from the tab order *and* the accessibility tree at once: unfocusable,
unclickable, unannounced. One attribute, both maps, no bookkeeping. The
folder toggle became:

```js
folder.classList.toggle("is-open", !isOpen);
button.setAttribute("aria-expanded", isOpen ? "false" : "true");
files.toggleAttribute("inert", isOpen);
```

Closed: the peeking papers stay visible, but for keyboard and assistive
tech they simply aren't there. Open: everything is reachable *and*
announced — which fixed a second, quieter sin, because the old code left
`aria-hidden` management half-implemented and easy to get wrong per
state.

## Proving a ghost is gone

You can't screenshot an absence, but you can probe it:

```js
link.focus();
document.activeElement === link
// closed folder: false — focus refused
// open folder:   true  — reachable and announced
```

Closed, open, closed again — the probe agrees with the audit, Lighthouse's
accessibility score went to 100, and an experimental "is the accessibility
tree well-formed" check that had been scoring 50 quietly healed to 100 on
its own.

The transferable rule: `aria-hidden` is a *promise* that nothing inside
matters to anyone right now. If anything inside can still take focus, the
promise is broken — and `inert` is the attribute that keeps it in both
worlds at once.
