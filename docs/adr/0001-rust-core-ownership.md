# ADR 0001: Rust Core Ownership

Date: 2026-05-28

## Status

Accepted

## Context

AgentOS is a local-first desktop product. The product truth must remain deterministic,
typed, testable, and available without a worker runtime.

## Decision

Rust owns the AgentOS core state under `src-tauri/src/core`.

This includes sessions, checkpoints, evidence, audit records, costs, permissions,
policy gates, and compiled library state. Other runtimes may request snapshots or
commands through explicit boundaries, but they do not store or mutate core truth.

## Consequences

- Core invariants are encoded and tested in Rust.
- UI and workers consume typed snapshots or command results.
- Durable state changes must pass through Rust-owned APIs.
- Python or frontend implementations that duplicate core ownership are rejected.
