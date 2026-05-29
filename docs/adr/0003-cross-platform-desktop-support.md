# ADR 0003: Cross-Platform Desktop Support

Date: 2026-05-28

## Status

Superseded by [ADR 0005: Electron Desktop Shell With Rust Core](0005-electron-desktop-shell-with-rust-core.md)

## Context

AgenticCrew was initially planned as a desktop app built with Tauri, Rust, React, and optional Python workers.
The project should stay viable on common developer machines without adding platform
specific shortcuts that break another operating system.

## Decision

AgenticCrew supports Windows, Linux, and macOS as first-class desktop development
targets.

Platform-specific prerequisites are allowed when required by the desktop shell or Rust toolchains,
but product behavior and quality gates must remain portable. Any platform-specific
code path needs a documented reason and must preserve the shared Rust core contract.

## Consequences

- Windows may require native build tools for Rust crates, sidecar packaging, or signing.
- Linux may require desktop packaging dependencies for Electron and the bundled Rust sidecar.
- macOS requires Xcode command line tools.
- CI and local docs should keep platform requirements explicit.
- Platform fixes must not weaken core ownership or worker boundaries.
