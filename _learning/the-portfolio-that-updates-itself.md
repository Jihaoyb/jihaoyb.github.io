---
title: "The Portfolio That Updates Itself — With My Permission"
excerpt: "One nightly job discovers every repo I own, notices what changed, drafts the project page, and opens a PR. I stay the editor; the robot does the typing."
date: 2026-07-09
minutes: 6
tags: [Automation, GitHub Actions, AI Pipelines]
terms: [github-actions, cron, sha, pull-request, front-matter, yaml]
published: true
---

This site showed four projects. My GitHub had eleven repositories. The gap
wasn't laziness exactly — it was that every project page was hand-written, and
hand-written pages have a natural population limit: the ones you write on the
day you feel like writing them.

So I built a pipeline that closes the gap and keeps it closed. As of this
week, every code-bearing repo I own has a page, and a nightly job keeps them
honest as the code evolves. Here's the design — and the three places it
surprised me.

## The wrong instinct: push

My first thought was a workflow in every repo: on push, each project tells
the portfolio "I changed — rebuild my page."

That design has a quiet failure mode that would have bitten me within a
month. The trigger lives in the *project* repos, so every **new** repo needs
a stub installed before the pipeline even knows it exists. Forget once — and
you will, precisely on the repo you're most excited about, because you're
busy building it — and the automation silently doesn't cover the thing it
exists to cover. Personal GitHub accounts can't share secrets across
repositories either, so every stub would drag its own token along.

## The inversion: pull

What shipped points the other way. One workflow, living in the portfolio
repo only — a {% include term.html id="github-actions" %} job on a nightly
{% include term.html id="cron" %} — wakes up and asks the GitHub API a single
question: *what repositories does this account own right now?*

That answer includes the repo I create tomorrow. Discovery is free: no stubs,
no per-repo secrets, nothing to remember. An allowlist file in the portfolio
repo decides what's portfolio material — my "admin page" is a {% include term.html id="yaml" text="YAML" %} file I can
edit in GitHub's web editor, which is all the backend a static site needs.

<figure class="lab-figure">
<svg viewBox="0 0 700 310" role="img" aria-label="Diagram: the nightly job discovers repos, the SHA gate skips unchanged ones for free, changed or new repos are analyzed into drafts, and a pull request goes to human review." xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1.5L8 5L2 8.5" style="fill:none;stroke:var(--muted);stroke-width:1.7" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <rect x="36" y="28" width="168" height="66" rx="12" style="fill:var(--surface-2)"/>
  <text x="58" y="50" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">TRIGGER</text>
  <text x="58" y="69" style="font-size:14px;font-weight:600;fill:var(--ink)">Nightly job</text>
  <text x="58" y="85" style="font-size:11.5px;fill:var(--muted)">cron 01:23 + manual</text>
  <path d="M204 61 H244" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <rect x="248" y="28" width="184" height="66" rx="12" style="fill:var(--surface-2)"/>
  <text x="270" y="50" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">DISCOVER</text>
  <text x="270" y="69" style="font-size:14px;font-weight:600;fill:var(--ink)">List every repo</text>
  <text x="270" y="85" style="font-size:11.5px;fill:var(--muted)">GitHub API · allowlist</text>
  <path d="M432 61 H472" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <rect x="476" y="28" width="188" height="66" rx="12" style="fill:var(--surface-2)"/>
  <text x="498" y="50" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">GATE</text>
  <text x="498" y="69" style="font-size:14px;font-weight:600;fill:var(--ink)">SHA compare</text>
  <text x="498" y="85" style="font-size:11.5px;fill:var(--muted)">HEAD vs analyzed_sha</text>
  <path d="M584 94 V128" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <rect x="500" y="132" width="164" height="30" rx="15" style="fill:var(--tag-bg);stroke:var(--border-soft)"/>
  <text x="582" y="151" text-anchor="middle" style="font-size:11.5px;fill:var(--muted)">match → skip, costs nothing</text>
  <path d="M496 94 V162 Q496 170 488 170 H186 Q178 170 178 178 V200" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <text x="337" y="162" text-anchor="middle" style="font-size:10px;font-weight:600;letter-spacing:.12em;fill:var(--muted)">CHANGED OR NEW</text>
  <rect x="48" y="206" width="230" height="68" rx="12" style="fill:var(--surface-2)"/>
  <text x="70" y="228" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">ANALYZE</text>
  <text x="70" y="247" style="font-size:14px;font-weight:600;fill:var(--ink)">No-clone read</text>
  <text x="70" y="263" style="font-size:11.5px;fill:var(--muted)">README · tree → strict JSON</text>
  <path d="M278 240 H318" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <rect x="322" y="206" width="176" height="68" rx="12" style="fill:var(--surface-2)"/>
  <rect x="322" y="206" width="4" height="68" rx="2" style="fill:var(--accent)"/>
  <text x="344" y="228" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent)">THE GATE</text>
  <text x="344" y="247" style="font-size:14px;font-weight:600;fill:var(--ink)">Pull request</text>
  <text x="344" y="263" style="font-size:11.5px;fill:var(--muted)">drafts + run table</text>
  <path d="M498 240 H538" style="fill:none;stroke:var(--muted);stroke-width:1.25;opacity:.8" marker-end="url(#arr)"/>
  <rect x="542" y="206" width="122" height="68" rx="12" style="fill:var(--surface-2)"/>
  <text x="564" y="228" style="font-size:10px;font-weight:600;letter-spacing:.14em;fill:var(--accent-2)">HUMAN</text>
  <text x="564" y="247" style="font-size:14px;font-weight:600;fill:var(--ink)">My review</text>
  <text x="564" y="263" style="font-size:11.5px;fill:var(--muted)">edit → merge</text>
</svg>
<figcaption>The loop closes itself: a merged page carries the new SHA, so tomorrow the gate reads "up to date."</figcaption>
</figure>

## State lives in the pages themselves

Each generated page records the {% include term.html id="sha" text="commit SHA" %}
it was built from, right in its {% include term.html id="front-matter" text="front matter" %}.
The nightly run compares that against each repo's current HEAD:

- **Match** — unchanged, skip. Costs nothing: no checkout, no AI, no tokens.
- **No page yet** — new repo, draft one.
- **Mismatch** — the repo moved; re-analyze and propose an update.

There's no database and no state file. The site is its own ledger: delete a
page and you've queued its regeneration; read any page's front matter and you
know exactly which commit it describes. Work-in-progress repos — the ones
that change most — refresh the most, and the pipeline marks them
`in progress` rather than pretending they're done. On a portfolio, a
half-built project that says so is proof of current motion, not a weakness.

## The human gate

The pipeline's output is never a deploy. It's a
{% include term.html id="pull-request" %} whose description is a run table —
here's the one from the first full sweep:

| Repo | Result |
|---|---|
| bookmark-hotkeys | created page (walkthrough) |
| cuda-flocking | created page (walkthrough) |
| file_server | hand-written page — left alone |
| fractal-filter-explorer | README-only repo — nothing to showcase yet |
| gen | empty repo — nothing to analyze yet |
| maze-forge | created page (walkthrough) |
| planetary-mesh | hand-written page — left alone |
| repository-roadmap | up to date |

Two rules keep the drafts trustworthy. **Claims must trace**: the generator
is forbidden from inventing metrics, users, or completion status — if the
README and code can't support a sentence, the sentence doesn't get written.
And **hand edits win**: pages I've polished myself are flagged so the
pipeline never rewrites them; it only notes that the repo has moved and
leaves the call to me.

## What building it actually taught me

The first end-to-end runs caught three bugs I'd never have found by reading
my own code:

1. **A quoted date is not a date.** The generator emitted `startD` as a
   quoted string; my hand-written pages carry unquoted YAML dates. Liquid's
   sort can't compare the two, and the projects page died with a 500. The
   fix: emit real date objects, never date-shaped strings.
2. **The model refusing to lie looked like a failure.** One repo contains
   only a LICENSE and a README — no code. Asked for its tech stack, the
   model (correctly obeying the no-invention rule) returned nothing, and
   validation rejected the draft. The truthfulness constraint was working;
   my plumbing just hadn't planned for it. Idea-stage repos are now skipped
   with "nothing to showcase yet" and auto-onboard the day code lands.
3. **Generated text is an injection surface.** The drafts render as HTML on
   this site, and the generator reads READMEs it doesn't control. A poisoned
   README could, in principle, steer the model into emitting live markup —
   so the writer now neutralizes tag openers in everything the model
   produces. The review gate stays; it's just no longer the only wall.

One more twist worth knowing: the analysis step doesn't need a metered API
key. Claude's subscription plans can mint a long-lived CI token
(`claude setup-token`), so the nightly job bills the plan I already pay for
— and with no credential configured at all, the run degrades to a plan-only
sweep that logs what it *would* do instead of failing.

## What it sets up next

While it reads each repo, the pipeline also classifies how that project
could be demonstrated in a browser — embeddable, hostable, or
walkthrough-able. That classification is the ready-made worklist for this
site's next feature: live, testable project demos. Different post, coming
once it's real.

The projects section this post describes is one click up in the nav — nine
repos covered, five wearing their "In progress" badges honestly. The robot
typed; I edited. That's the whole idea.
