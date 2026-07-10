---
title: Romo Marketing Site
excerpt: Next.js 15 landing page for a dictation product with auth, Stripe subscriptions,
  a Sanity-backed blog, and templated email flows.
tech: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Stripe, Sanity, Resend,
  PostHog
startD: 2025-08-01
githuburl: https://github.com/kaisenye/dictation-page
repo: kaisenye/dictation-page
featured: false
managed: true
demo_type: hosted
demo_rationale: Next.js app with Stripe webhooks, Supabase auth, and Resend email
  routes — needs a server, not static.
analyzed_sha: 6c4dae8ff54755596a6cacfe7c9268165e9b5ef1
analyzed_at: 2026-07-09
status: in progress
---

- Next.js 15 App Router on Turbopack with TypeScript, Tailwind v4, shadcn/ui, and Prettier/ESLint tooling.
- Supabase auth flows for sign-in, sign-up, password reset, and OAuth callback, wired through middleware and an auth provider.
- Stripe subscriptions with checkout-session and customer-portal routes, a webhook handler, and a dashboard billing tab.
- Sanity Studio embedded at /studio with a post schema powering a blog index and dynamic [slug] pages.
- Resend-based transactional emails (waitlist, download) built with React Email and previewable via an API route.
