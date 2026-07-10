---
title: Entromy Private Equity Prototype
excerpt: Next.js prototype that recreates the Entromy PE landing page and adds an
  Ask + Video escalation workflow for portfolio teams.
tech: Next.js, React, TypeScript, Tailwind CSS
startD: 2026-02-23
githuburl: https://github.com/Jihaoyb/entromy-pe-prototype
repo: Jihaoyb/entromy-pe-prototype
featured: false
managed: true
demo_type: hosted
demo_rationale: Next.js app with server API routes for AI triage, realtime audio,
  and Tavus video — needs deployment to run.
analyzed_sha: 9c3a8b94de4596611ff0c23a9247d108fc1154ff
analyzed_at: 2026-07-09
status: in progress
---

- Rebuilds the Entromy PE marketing page (navbar, hero, sections, workflow, CTA, footer) in Next.js App Router with Tailwind.
- Adds an Ask flow backed by /api/triage that returns PE-style answers from OpenAI, with a fallback response when the key is missing.
- Feature-flagged realtime audio agent via /api/realtime-session, minting ephemeral tokens so OPENAI_API_KEY stays server-side.
- Optional Tavus video avatar path through /api/tavus-session; degrades to prototype transcript mode when the flag is off.
- Shared agent session context keeps transcript and memory continuous across audio and video mode switches.
