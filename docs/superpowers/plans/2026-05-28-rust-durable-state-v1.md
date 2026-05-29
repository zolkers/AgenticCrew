# Rust Durable State v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small Rust-owned durable state store for sessions, evidence, and cost records.

**Architecture:** Create a `core::state` module with a versioned `AgentOsState` aggregate and `JsonStateStore` filesystem adapter. Keep JSON persistence behind Rust APIs; React and Python do not own or write product state.

**Tech Stack:** Rust, serde, serde_json, std filesystem APIs, Tauri command boundary.

---

## Files

- Create: `src-tauri/src/core/state.rs` - durable aggregate, store errors, JSON file store, tests.
- Modify: `src-tauri/src/core/mod.rs` - exports the new module.
- Modify: `src-tauri/src/lib.rs` - exposes a Tauri command for an empty durable state snapshot when the desktop shell feature is enabled.
- Modify: `docs/roadmap.md` - appends phase 2 roadmap item.

## Task 1: Versioned State Aggregate

- [ ] **Step 1: Write tests in `src-tauri/src/core/state.rs`**

Add tests proving `AgentOsState::empty()` uses schema version `1` and empty collections.

- [ ] **Step 2: Implement `AgentOsState`**

Define:

```rust
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct AgentOsState {
    pub schema_version: u32,
    pub goals: Vec<GoalObject>,
    pub design_sessions: Vec<DesignSession>,
    pub feature_sessions: Vec<FeatureSession>,
    pub evidence: Vec<Evidence>,
    pub model_call_estimates: Vec<ModelCallEstimate>,
}
```

- [ ] **Step 3: Verify**

Run: `npm run desktop:test`

Expected: Rust tests pass.

- [ ] **Step 4: Commit**

Commit message: `feat(core): add durable state aggregate`

## Task 2: JSON State Store

- [ ] **Step 1: Write failing store tests**

Cover missing file, save/load round-trip, invalid JSON rejection, parent directory creation, and temp-file cleanup.

- [ ] **Step 2: Implement `JsonStateStore`**

Use `std::fs::write`, `std::fs::rename`, `std::fs::create_dir_all`, and `serde_json`.

- [ ] **Step 3: Verify**

Run: `npm run desktop:test`

Expected: Rust tests pass.

- [ ] **Step 4: Commit**

Commit message: `feat(core): persist durable state as json`

## Task 3: Tauri Read Boundary

- [ ] **Step 1: Add command test**

Test that the command returns `AgentOsState::empty()` for the current v1 slice.

- [ ] **Step 2: Add command**

Expose `durable_state_snapshot` under the desktop-shell commands module.

- [ ] **Step 3: Verify**

Run: `npm run desktop:test`

Expected: Rust tests pass.

- [ ] **Step 4: Commit**

Commit message: `feat(desktop): expose durable state snapshot`

## Task 4: Final Quality

- [ ] **Step 1: Run quality**

Run:

```powershell
$env:Path='<python-install-dir>;' + $env:Path; npm run quality
npm run desktop:test
npm audit --audit-level=high
cargo fmt --check
git diff --check
```

- [ ] **Step 2: Commit docs if changed**

Commit message: `docs(roadmap): add durable state phase`

## Self-Review

- Spec coverage: aggregate, JSON store, Tauri read command, docs, and quality gates are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: names match planned Rust modules and existing domain types.
