---
title: 3D Maze (pygame + PyOpenGL)
excerpt: Single-file Python 3D maze game with FPS movement, multiple camera modes,
  and a HUD, built on pygame and PyOpenGL.
tech: Python, pygame, PyOpenGL
startD: 2025-11-22
githuburl: https://github.com/Jihaoyb/maze-forge
repo: Jihaoyb/maze-forge
featured: false
managed: true
demo_type: walkthrough
demo_rationale: Desktop OpenGL app — needs a local Python window, best shown via recorded
  gameplay.
analyzed_sha: 8fe8c9144dcfd497b12ac802d41b0ac9db674a18
analyzed_at: 2026-07-09
status: in progress
---

- Single-file build in maze.py using pygame for window/input/HUD and PyOpenGL for 3D rendering.
- Player class handles FPS-style movement with yaw/pitch and camera helpers for fps, third-person, top-down, and overview modes.
- CameraController switches between the four camera modes via a mode field and apply step.
- Maze class holds a grid with per-cell walls/types, coordinate helpers, and entrance/exit; DFS generation is still a placeholder.
- Stage tracker in the README lists 9 milestones (generation, rendering, collisions, HUD, traps, polish, replay, QA) all still unchecked.
