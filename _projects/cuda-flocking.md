---
title: CUDA Boids Flocking Simulation
excerpt: GPU-accelerated boids flocking simulation built on CUDA with OpenGL rendering,
  developed for UPenn CIS 565.
tech: CUDA, C++, OpenGL, GLSL, CMake
startD: 2025-05-03
githuburl: https://github.com/Jihaoyb/cuda-flocking
repo: Jihaoyb/cuda-flocking
featured: false
managed: true
demo_type: walkthrough
demo_rationale: Native CUDA/OpenGL executable requires an NVIDIA GPU, so a recorded
  capture works best on a static site.
analyzed_sha: ed311e8e1630ab6e6128757acb0b0bd80a33a4d5
analyzed_at: 2026-07-09
status: in progress
---

- CUDA/C++ flocking simulation coursework for UPenn CIS 565: GPU Programming and Architecture, Project 1.
- Simulation kernels live in src/kernel.cu; host driver and OpenGL setup in src/main.cpp with GLSL boid vertex, geometry, and fragment shaders.
- CMake build with CUDA 10, OpenGL, GLFW, GLEW, and GLM; vendors GLEW/GLFW binaries under external/ for Windows.
- Image assets suggest uniform-grid neighbor search variants (naive vs. coherent buffers) alongside a base implementation.
- README is still the course template with unfilled TODOs, so the project is unfinished as published.
