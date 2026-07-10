---
title: Repository Roadmap
excerpt: Paste a GitHub repo URL and explore its file structure as an interactive
  D3 force-directed graph with drill-down and file previews.
tech: React 19, TypeScript, Vite 6, D3 v7, Zustand, Tailwind CSS v4, Octokit, Vitest
startD: 2025-05-28
githuburl: https://github.com/Jihaoyb/repository-roadmap
repo: Jihaoyb/repository-roadmap
featured: false
managed: true
demo_type: hosted
demo_rationale: Runs in-browser but calls the GitHub API at runtime, so it needs a
  hosted deployment with token handling.
analyzed_sha: 77a85022b8121df93ad12050a489e2159750aba6
analyzed_at: 2026-07-09
status: in progress
---

- Renders a repository's directories and files as a D3 force-directed SVG graph with pan, zoom, and node dragging.
- Supports drill-down into directories and Esc to step back out, plus a file-preview overlay that fetches contents on click.
- Detects JS/TS/JSX/TSX import statements and Markdown links via regex and draws them as colored relationship edges.
- Fetches repo data through Octokit with optional GitHub token auth to lift the 60/hr anonymous rate limit to 5,000/hr.
- Milestone-based workflow documented via ROADMAP, PROGRESS, and eight ADRs covering lazy fetch, AST parsing, and token handling.
