---
title: "The 204 That Looked Like an Error"
excerpt: "Every page change on this site ended with a status 204 — which reads as 'something broke' right up until you learn what beacons are. The real bug was hiding one panel over."
date: 2026-07-15
minutes: 3
tags: [Debugging, Analytics]
category: Field notes
terms: [waterfall, http-status-code, beacon, render-blocking, github-pages]
published: true
---

While testing [the white-flash fix](/lab/the-first-paint-nobody-styles/)
with the network panel open, I noticed something suspicious: every single
page change *ended* with a `POST` to `google-analytics.com/g/collect`
returning **204**. Last request, every time, odd-looking status. If a page
misbehaves and the {% include term.html id="waterfall" text="waterfall" %}'s
final row has a code you don't recognize, the brain files it as evidence.

It isn't. It's two misreadings stacked on top of each other — and untangling
them turned up an actual bug that had nothing to do with the flash.

## Misreading one: 204 is not an error

An {% include term.html id="http-status-code" %} tells you its meaning by
its first digit, and `2xx` is the *success* class. `204 No Content` means
"received — and I have nothing to send back." That's not a failure mode;
it's the **designed reply of a {% include term.html id="beacon" %} endpoint**. Analytics collectors
exist to absorb data, not to return any: acknowledging with an empty
response is the entire contract. A `204` from `/g/collect` is the system
working perfectly.

## Misreading two: "last" is not "guilty"

The beacon sits at the bottom of every waterfall because analytics fires
*after* the page settles — it reports the page view once there's a page
view to report. Sort requests by time and the beacon will always be the
closing entry, on every site that measures itself. The final row of a
waterfall is just the latest thing, not the thing that caused whatever
you're hunting. If you're debugging a rendering problem, the interesting
rows are at the *top* — the document and the
{% include term.html id="render-blocking" %} resources — not the tail.

## The real bug, one panel over

The useful discovery was in the request's *context*, not its status: the
page URL said `0.0.0.0:4000`. That's my local dev server — meaning **every
test click I'd ever made was recorded as a real page view** in the
production analytics property. This site's theme ships its analytics
include with no environment check, so local development polluted the real
data and cluttered the very network panel I was debugging in.

The fix is one guard:

```liquid
{% raw %}{% if jekyll.environment == "production" and site.analytics.provider %}
  ... emit the analytics script ...
{% endif %}{% endraw %}
```

{% include term.html id="github-pages" text="GitHub Pages" %} sets
`JEKYLL_ENV=production` automatically when it builds the deployed site;
a local `jekyll serve` runs as `development`. I verified both directions:
the dev build now emits zero analytics tags, and a production-mode build
emits exactly one. Visitors are still counted; my own refresh-mashing
isn't.

## What this small fish taught

Read the status *class* before reacting to the number. Distrust the
instinct that the last request explains the problem. And gate every
third-party call behind an environment check on day one — the bug wasn't
that analytics answered `204`, it's that I was the traffic.
