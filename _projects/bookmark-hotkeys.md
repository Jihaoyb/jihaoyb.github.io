---
title: Bookmark Hotkeys
excerpt: Chrome MV3 extension that maps keyboard shortcuts to configurable bookmark
  slots, each with its own open-behavior.
tech: JavaScript, HTML, Chrome Extension (MV3), chrome.bookmarks, chrome.storage,
  chrome.commands
startD: 2025-08-28
githuburl: https://github.com/Jihaoyb/bookmark-hotkeys
repo: Jihaoyb/bookmark-hotkeys
featured: false
managed: true
demo_type: walkthrough
demo_rationale: Chrome extensions can't run inside a static page; installation and
  shortcut binding are best shown as a guided demo.
analyzed_sha: 8a84c8d231830743213a55b4442bad2ad21da735
analyzed_at: 2026-07-09
---

- Manifest V3 extension with a background service worker (src/background.js) that listens for chrome.commands and opens the mapped URL.
- Options page (src/options.html/options.js) lets each slot pick a bookmark via chrome.bookmarks or enter a custom URL.
- Per-slot open behavior — current tab, new tab, or new window — with a global default that individual slots can override.
- Debounced instant saves to Chrome sync storage; no explicit Save button, and a Test action to verify each slot opens correctly.
- Requests only bookmarks, storage, tabs, windows, and commands; README states no data leaves the device.
