# ADR 0005: Electron Desktop Shell With Rust Core

Date: 2026-05-29

## Status

Accepted

## Context

AgenticCrew needs a large, route-heavy desktop UI with multi-workspace selection,
multi-agent supervision, skill marketplace management, Git review surfaces, settings,
and browser-preview friendly development. The product truth must stay deterministic
and local-first, but the shell should be easier to evolve than the current Tauri path.

## Decision

AgenticCrew uses Electron as the desktop shell and keeps Rust as the product core.

Electron owns:

- desktop windows and app lifecycle;
- secure preload and IPC routing;
- packaging, updates, and resource lookup;
- renderer bootstrapping.

Rust owns:

- durable state and schema migrations;
- sessions, checkpoints, evidence, costs, permissions, skills, workspaces, and Git snapshots;
- command handlers behind a typed desktop boundary.

The first bridge is a Rust sidecar exposed through Electron IPC. Electron main may
validate command names and resolve app paths, but it must not become the owner of
product state. A native Node binding can be reconsidered later if the sidecar becomes
a measured bottleneck.

## Consequences

- Move reusable Rust modules from `src-tauri/src/core` to `crates/agenticcrew-core`.
- Add `crates/agenticcrew-sidecar` for JSON command transport.
- Expose only `window.agenticcrew.invoke(command, args)` to the renderer.
- Remove `@tauri-apps/api` from frontend runtime code.
- Package the sidecar binary with Electron Builder per platform.
- Update Docker, CI, and desktop tests around Electron plus Rust core/sidecar gates.
