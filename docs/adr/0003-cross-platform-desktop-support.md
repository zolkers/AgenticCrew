# ADR 0003: Cross-Platform Desktop Support

Date: 2026-05-28

## Status

Accepted

## Context

AgentOS is a desktop app built with Tauri, Rust, React, and optional Python workers.
The project should stay viable on common developer machines without adding platform
specific shortcuts that break another operating system.

## Decision

AgentOS supports Windows, Linux, and macOS as first-class desktop development
targets.

Platform-specific prerequisites are allowed when required by Tauri or Rust toolchains,
but product behavior and quality gates must remain portable. Any platform-specific
code path needs a documented reason and must preserve the shared Rust core contract.

## Consequences

- Windows requires Microsoft C++ Build Tools and a Windows SDK.
- Linux requires the WebKitGTK/GTK packages needed by Tauri.
- macOS requires Xcode command line tools.
- CI and local docs should keep platform requirements explicit.
- Platform fixes must not weaken core ownership or worker boundaries.
