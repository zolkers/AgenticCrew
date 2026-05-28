# Rust Durable State v1 Design

Date: 2026-05-28

## Goal

Persist AgentOS core truth locally in Rust so sessions, checkpoints, evidence, and cost records can survive process restarts without Python or React owning product state.

## Scope

This slice adds a small JSON-backed state boundary under `src-tauri/src/core`. It stores typed Rust domain records in a versioned snapshot and exposes a local file store with deterministic load/save behavior. It does not add cloud sync, database migrations, background workers, or UI editing flows.

## Architecture

`AgentOsState` is the durable aggregate. It contains schema version, goals, design sessions, feature sessions, evidence, and model call estimates. The aggregate lives in Rust and reuses the existing domain structs.

`JsonStateStore` owns filesystem persistence. Missing files load as an empty state. Existing files must deserialize into the current schema. Saves write to a temporary file and rename it into place so a failed write does not leave a partial state file.

Tauri remains only a command boundary. The frontend can request a durable state snapshot later, but React must not cache or author product truth outside Rust.

## Error Handling

Store errors preserve whether failure came from filesystem IO or JSON serialization. Error messages include the state path for operational debugging, but callers receive a typed `StateStoreError`.

## Testing

Rust tests cover:

- missing state file returns `AgentOsState::empty()`;
- save then load round-trips all core collections;
- invalid JSON is rejected;
- save creates the parent directory;
- temporary write path is cleaned after successful save.

`npm run desktop:test` must pass on Windows using the existing fallback when MSVC is not installed.
