# ADR 0002: Python Worker Boundary

Date: 2026-05-28

## Status

Accepted

## Context

Python is useful for model, tool, and automation adapters, but it must not become a
second product core. Split ownership would make sessions, costs, gates, and evidence
harder to audit.

## Decision

Python workers are adapter runtimes only.

They may execute tools, call model providers, transform adapter payloads, and return
results to Rust. They must not own sessions, checkpoints, audit state, costs,
permissions, gates, or durable product storage.

A lightweight pytest boundary guard in `workers/python` scans the worker package for
reserved core-state module names and obvious durable persistence markers.

## Consequences

- Worker quality remains separate from Rust core quality.
- Adding worker persistence requires a new ADR or an explicit exception.
- Boundary violations are caught by `npm run worker:quality`.
- The guard stays intentionally conservative and small.
