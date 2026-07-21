---
title: "No Link Leaves This Site Unannounced"
excerpt: "A design review of my own site started with a naive question (why do links and glossary terms look different?) and ended with a new rule: nothing in prose exits this site without introducing where you're going first."
date: 2026-07-20
minutes: 5
tags: [Design, UX, Static Sites]
category: Build log
terms: [iframe, liquid, front-matter]
published: true
---

The best design questions sound naive. This one came from reviewing my own
Lab posts: *some phrases have a dotted underline and open a little card;
others are orange and jump you somewhere. Why are they different things?*

I had a tidy answer ready: glossary terms are *vocabulary*, defined once
and reused everywhere, while links are *citations*, each pointing at its
own destination. Different jobs, different clothes. The taxonomy was
clean, defensible… and, I realized while defending it, built entirely
from the author's side of the page.

## The reader doesn't care about my taxonomy

From the reading side, both are the same offer: *optional extra attached
to this phrase*. What a reader actually needs to predict is the **cost of
the click**. The old system encoded the wrong distinction. Dotted
meant "you'll stay." Orange meant "you'll go," but not *where*: a link to
another post on this site costs almost nothing (fast, same tab, the back
button works, the page fade makes it pleasant), while an external link
ejects you mid-paragraph to a site you know nothing about. Two wildly
different prices, one identical label.

So the redesign inverted the question: instead of dressing links by what
they *are* to me, dress them by what they *do* to you.

## The new grammar

**Dotted underline: a card opens, you stay. Solid underline: you go
somewhere on this site. Nothing in prose leaves the site directly.**

External references now get the same treatment as glossary terms: a
dotted trigger that opens a hover card carrying a one-line description of
the source and the outward link, which opens in a new tab. Each card
wears a small label, **Term** or **Source**, so the two card types read
apart at a glance. And every cited source also appears in a *Sources*
footer at the bottom of the post: the no-JavaScript path to every URL,
and honest credit besides.

<figure class="lab-figure">
<svg viewBox="0 0 700 236" role="img" aria-label="Diagram of the site's link grammar. A dotted-underline phrase opens a card (labeled Term or Source) and the reader stays; the card itself carries the outward link. A solid-underline phrase navigates to another page on this site. No prose link exits the site directly." xmlns="http://www.w3.org/2000/svg">
  <text x="36" y="36" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">ONE RULE, TWO UNDERLINES</text>
  <text x="36" y="88" style="font-size:13px;fill:var(--ink)">dotted phrase</text>
  <path d="M36 96 H136" style="stroke:var(--accent-2);stroke-width:1.5;stroke-dasharray:2 4"/>
  <path d="M160 84 H216" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8"/>
  <rect x="220" y="58" width="200" height="60" rx="12" style="fill:var(--surface-2)"/>
  <text x="240" y="80" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--muted)">TERM · SOURCE</text>
  <text x="240" y="99" style="font-size:12.5px;fill:var(--ink)">a card opens; you stay</text>
  <rect x="452" y="74" width="212" height="28" rx="14" style="fill:var(--tag-bg);stroke:var(--line);stroke-width:1"/>
  <text x="558" y="92" text-anchor="middle" style="font-size:11px;fill:var(--muted)">the exit lives inside the card →</text>
  <text x="36" y="180" style="font-size:13px;fill:var(--ink)">solid phrase</text>
  <path d="M36 188 H130" style="stroke:var(--accent);stroke-width:1.5"/>
  <path d="M160 176 H216" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8"/>
  <rect x="220" y="150" width="200" height="60" rx="12" style="fill:var(--surface-2)"/>
  <text x="240" y="172" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--muted)">ON THIS SITE</text>
  <text x="240" y="191" style="font-size:12.5px;fill:var(--ink)">you navigate: cheap trip,</text>
  <text x="240" y="206" style="font-size:12.5px;fill:var(--ink)">back button works</text>
</svg>
<figcaption>The underline promises what the click costs. The card mediates every exit.</figcaption>
</figure>

I didn't invent this instinct — Wikipedia industrialized it. Their page
previews (born as "hovercards" in 2014, fully launched in 2018) show a
summary card on every internal link hover, and the telling number is the
disable rate: around **0.02%**. Readers overwhelmingly keep them. Their
newer Reference Previews do the same for footnotes, which is exactly
what a source card is: a footnote that comes to where you're reading
instead of making you travel to it.

## The part that cost nothing

Here's the engineering half of the story: the feature is almost entirely
*inherited*. The glossary cards already had everything hard: invisible
hover bridges so the pointer can travel into the card, a 260ms grace
delay so the card doesn't vanish mid-journey, flip-below positioning when
a card would collide with the sticky header, viewport clamping at the
edges, close-on-blur for {% include term.html id="iframe" %} clicks. All
of it took real debugging to get right the first time.

Source cards emit the **exact same markup contract** from a small
{% include term.html id="liquid" %} include (same classes, same
structure, plus a modifier and the kind label), so every one of those
behaviors applied on day one with **zero new JavaScript**. Sources live
in a data file mirroring the glossary (they repeat across posts: MDN,
specs, the vtbag guide), a post lists its citations in
{% include term.html id="front-matter" %} to populate the footer, and
one-off sources can pass their details inline. The whole feature is
roughly forty lines of template, data, and CSS.

That's the leverage lesson: the second content type is nearly free *if*
the first one was built as a system instead of a special case.

## The trade I accepted

Reaching a source now takes two interactions, hover then click, where
a bare link took one. For citations I think that's the right price: most
readers never wanted to leave (the card answers "what's this?" without
the trip), and the ones who do leave go informed, in a new tab, with
their place held. A reader can no longer be ambushed by an exit.

The deeper takeaway isn't about links at all. The feature was trivial;
the *conversation* was the work: one uncomfortable question about an
inconsistency, answered honestly, redesigned a rule the whole site now
follows. Review your own work like a stranger, and when your taxonomy and
your reader disagree, the reader is right.
