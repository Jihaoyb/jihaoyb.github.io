---
title: "Planetary Mesh (Distributed Job Scheduler)"
tech: Go, gRPC, Postgres, Docker Compose
permalink: /project/planetary-mesh
excerpt: 'A distributed job scheduler with coordinator/agent architecture and fault recovery.'
startD: 2026-01-01
endD: 2026-01-31
githuburl: 'https://github.com/Jihaoyb/planetary-mesh'
featured: true
---

- Built a distributed coordinator/agent system in Go for mesh job scheduling with fault recovery.
- Implemented control-plane RPCs with gRPC + Protobuf for typed messaging and streaming status updates.
- Developed score-based scheduling with structured logs and metrics to debug latency and node reliability.
