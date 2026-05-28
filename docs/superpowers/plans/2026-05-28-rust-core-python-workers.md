# Rust Core Python Workers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move AgentOS to a professional desktop architecture where Rust owns core state and Python is limited to optional worker/adapters.

**Architecture:** `src-tauri` contains `agentos_core`, the local state machine, domain models, evidence, costs, and Markdown library seeds. Python moves out of the critical path into `workers/python`, reserved for future model/tool adapters and never owning sessions, checkpoints, audit, costs, or gates. React remains UI-only and talks to the Rust core through Tauri commands/events.

**Tech Stack:** Rust, Tauri v2, serde, serde_json, React, TypeScript, Vitest, ESLint SonarJS, optional Python 3.12 worker tooling.

---

## Files

- Modify: `package.json` - remove backend quality from the default gate, add worker-specific scripts.
- Modify: `.github/workflows/ci.yml` - run frontend and Rust core on all platforms, worker lint separately.
- Modify: `README.md` - document Rust-owned core and Python worker boundary.
- Modify: `sonar-project.properties` - point backend analysis at Rust core and worker paths.
- Create: `src-tauri/src/core/mod.rs` - Rust core module boundary.
- Create: `src-tauri/src/core/sessions.rs` - GoalObject, Checkpoint, DesignSession, FeatureSession.
- Create: `src-tauri/src/core/evidence.rs` - Evidence model.
- Create: `src-tauri/src/core/costs.rs` - ModelCallEstimate.
- Create: `src-tauri/src/core/library.rs` - built-in Markdown harness seed.
- Modify: `src-tauri/src/lib.rs` - expose core and keep Tauri shell entry.
- Move: `backend/agentos_core/library/seed/harness/pi_execution_discipline.md` -> `src-tauri/src/core/library/pi_execution_discipline.md`.
- Move: `backend/pyproject.toml` -> `workers/python/pyproject.toml`.
- Delete: `backend/agentos_core/**` and `backend/tests/**`.
- Create: `workers/python/agentos_worker/__init__.py` - Python worker package marker.
- Create: `workers/python/agentos_worker/health.py` - worker health helper.
- Create: `workers/python/tests/test_health.py` - worker health test.

## Task 1: Rust Core Domain

- [ ] **Step 1: Write Rust tests for sessions, evidence, costs, and harness seed**

Add tests in the Rust modules before implementation:

```rust
#[test]
fn feature_session_starts_as_draft() {
    let checkpoint = Checkpoint::new(
        "tests_passing",
        "Tests passing",
        "qa",
        vec!["command_exit_code"],
    );
    let session = FeatureSession::new(
        "feat_todo_api",
        "Build TODO API",
        "goal_todo_api",
        "coding_team",
        "feat/todo-api",
        vec![checkpoint],
    );

    assert_eq!(session.status, FeatureSessionStatus::Draft);
    assert_eq!(session.checkpoints[0].status, CheckpointStatus::Pending);
}
```

- [ ] **Step 2: Run red**

Run: `npm run desktop:test`

Expected locally until MSVC is installed: compile blocks on `link.exe`; in a complete Rust environment, tests fail because core modules do not exist.

- [ ] **Step 3: Implement minimal Rust core models**

Use typed enums, immutable public structs, constructors, and serde derives. Keep persistence out of this task.

- [ ] **Step 4: Verify**

Run: `npm run desktop:test`

Expected: pass on machines with the Rust linker/toolchain installed.

- [ ] **Step 5: Commit**

```bash
git add src-tauri
git commit -m "feat(core): move domain ownership to rust"
```

## Task 2: Python Worker Boundary

- [ ] **Step 1: Move Python from backend to worker**

Delete FastAPI app and domain code. Keep a tiny Python package in `workers/python` with one health helper proving the worker toolchain only.

- [ ] **Step 2: Verify worker tests**

Run: `npm run worker:install`

Run: `npm run worker:quality`

Expected: tests pass, coverage 100%, Ruff clean, mypy clean.

- [ ] **Step 3: Commit**

```bash
git add -A backend workers package.json README.md sonar-project.properties .github/workflows/ci.yml
git commit -m "refactor(workers): keep python outside core state"
```

## Task 3: Cross-Platform CI Gate

- [ ] **Step 1: Update CI matrix**

Run frontend quality and desktop Rust tests on `ubuntu-latest`, `macos-latest`, `windows-latest`. Install Linux Tauri dependencies on Ubuntu. Run Python worker quality after installing worker dependencies.

- [ ] **Step 2: Verify local gates**

Run: `npm run quality`

Run: `npm run worker:quality`

Run: `npm run desktop:test`

Expected: frontend/worker pass locally; desktop passes where platform prerequisites are installed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml package.json README.md
git commit -m "ci(quality): enforce rust core platform gates"
```

## Self-Review

- Spec coverage: Rust owns critical state; Python remains available for future IA adapters.
- No placeholder scan: every task has concrete files and commands.
- Scope: limited to architecture correction, not new product features.
