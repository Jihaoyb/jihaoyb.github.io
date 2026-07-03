---
title: "Reactions and Comments on a Static Site — No Backend Required"
excerpt: "Every Lab post now has reactions and a comment thread. The database is a GitHub Discussion, the widget is giscus, and this site still ships as plain files."
date: 2026-07-02
minutes: 4
tags: [Comments, GitHub, Static Sites]
terms: [giscus, github-discussions, iframe, postmessage]
published: true
---

This site is static: GitHub Pages builds it into plain HTML files and serves
them as-is. That's what makes it fast, free, and unhackable in all the boring
ways — and it's also why it can't do the most ordinary interactive thing on
the web. A thumbs-up is a *write*. When someone clicks it, that click has to
be stored somewhere, and a pile of HTML files has nowhere to put it.

So when I decided each Lab post should have reactions and a comment thread,
the real question wasn't "which widget?" — it was **"whose database?"**

## The options

- **Build a tiny API.** A serverless function plus a key-value store could
  count votes. It's the most work, it's a new thing to operate, and anonymous
  counts are low-value signal anyway — you learn *that* someone clicked, never
  *why*.
- **Disqus.** The classic embed. It also brings ads, trackers, and a heavy
  payload to a site that currently ships almost nothing. Pass.
- **utterances.** A neat trick — comments stored as GitHub Issues. Right
  idea, wrong container: issues were never meant to be conversation threads,
  and giscus is its direct successor built on the surface that was.
- **{% include term.html id="giscus" %}.** The successor to that trick:
  comments *and* emoji reactions, stored in
  {% include term.html id="github-discussions" text="GitHub Discussions" %} —
  a real conversation surface that comes free with the repository this site
  already lives in.

giscus won on a simple observation: **the site's repository is already a
database with world-class hosting** — it just needed a table for feedback.

## How it works

Each post page embeds giscus inside an
{% include term.html id="iframe" %}. On load, the widget looks up a
Discussion whose title matches the page's path — `/lab/this-post/` — and
renders its reactions and comments. There is no thread until the first person
reacts or comments; giscus creates it on demand. Sign-in is a GitHub account,
which for a dev-focused site is a feature twice over: zero spam, and every
commenter has a face.

The data outlives the widget, too. Every reaction and comment is stored in an
ordinary GitHub Discussion in my repository — readable in the GitHub UI,
exportable over the API, and still mine if I ever swap the widget out.

## Wiring it into this site

The embed itself is a placeholder `div` carrying the public identifiers, and
a script that the site injects on demand:

```html
<div data-giscus
     data-repo="Jihaoyb/jihaoyb.github.io"
     data-repo-id="R_kgDONxFLZA"
     data-category="Announcements"
     data-category-id="DIC_kwDONxFLZM4DAZA4"></div>
```

Three details were worth doing properly:

- **Lazy loading.** The widget only loads when its section approaches the
  viewport, via an IntersectionObserver. Read just the top of a post and you
  never pay for the embed — and if the script fails to load, the section
  collapses to a plain link instead of a blank hole.
- **Theme sync.** This site has a light/dark toggle, and an iframe can't see
  the page around it. The fix is {% include term.html id="postmessage" %} —
  when the theme changes, the page tells the widget:

  ```js
  frame.contentWindow.postMessage(
    { giscus: { setConfig: { theme: "noborder_dark" } } },
    "https://giscus.app"
  );
  ```

- **An off switch.** Any post can set `comments: false` in its front matter
  and the section disappears — the same pattern the rest of this site uses
  for per-post options.

Those `data-repo-id` strings look secret; they aren't. They're public
identifiers for a public repository — the whole config is safe to commit.

## The tradeoffs

Honest ones: commenting requires a GitHub login, so a drive-by reader without
an account can't leave a note (they can always open the Discussion on GitHub
— the link sits right above the widget). The widget depends on giscus.app
being up, and loading it does tell that service your IP and which post you're
reading — so the accurate privacy claim is *no ads and no ad-tech tracking*:
the only parties in the loop are GitHub and the giscus service itself. And it
all works because the repository is public — which, for a portfolio, it
already was.

What I gave up is small; what I got is a real feedback channel with no
server, no cost, and no ads.

The proof is at the bottom of this page, just past the glossary — the
Discussion section there is the implementation described above. Leave a
reaction and you'll have created the first row in the database.
