# AgenticCrew Engineering Roadmap

## Architecture North Star

AgenticCrew is a local-first desktop product with a Rust-owned core, a React UI, and optional Python workers. Rust owns durable state, session lifecycle, checkpoints, evidence, audit, cost records, permissions, Git/Docker orchestration, and Markdown library compilation. Python workers may execute AI/tool adapters, but they never own product truth.

## Task Roadmap

### 1. Desktop Tooling Gate

**Goal:** `npm run desktop:test` is reliable on supported developer machines and CI.

**Ownership:** `.cargo/`, `src-tauri/`, `README.md`, `package.json`.

**Acceptance:**
- Rust test command is documented for Windows, Linux, and macOS.
- Local failure modes identify missing platform prerequisites.
- No platform-specific hack breaks CI or another OS.

### 2. Rust Core Session Invariants

**Goal:** Encode core state rules in Rust before UI or workers depend on them.

**Ownership:** `src-tauri/src/core/sessions.rs`.

**Acceptance:**
- `FeatureSession` cannot close while required checkpoints are pending.
- `GoalObject` remains immutable by API design.
- State transitions are explicit and tested.
- Tests cover allowed and rejected transitions.

### 3. Rust Evidence Harness

**Goal:** Claims become evidence-backed records owned by Rust.

**Ownership:** `src-tauri/src/core/evidence.rs`.

**Acceptance:**
- Command evidence records command, exit code, actor, checkpoint, and timestamp.
- Failed command evidence remains valid evidence, not success.
- Evidence type serialization is stable snake_case.

### 4. Cost Compiler Primitive

**Goal:** Cost calculations start in Rust with configured pricing inputs, not hardcoded providers.

**Ownership:** `src-tauri/src/core/costs.rs`.

**Acceptance:**
- Pricing is provided as data.
- Cached and uncached input tokens are priced separately.
- Invalid token/cost underflow is impossible.

### 5. Tauri Mission Control Command

**Goal:** Frontend reads a typed Mission Control snapshot from Rust.

**Ownership:** `src-tauri/src/lib.rs`, `src-tauri/src/core/mission_control.rs`, `frontend/src/shared`.

**Acceptance:**
- Tauri command returns typed session count, agent count, cost, provider/model, checkpoint, and gate status.
- Frontend has a small adapter boundary.
- UI component remains presentational.

### 6. Frontend Architecture Boundary

**Goal:** React owns rendering, not product state.

**Ownership:** `frontend/src/features`, `frontend/src/shared`.

**Acceptance:**
- Domain DTOs live under `shared`.
- Components receive props or adapter data.
- i18n remains required for visible strings.
- Tests prove default render and adapter mapping.

### 7. Worker Boundary Guard

**Goal:** Prevent Python from drifting back into core ownership.

**Ownership:** `workers/python`, `README.md`, CI scripts.

**Acceptance:**
- Worker package only exposes adapter utilities.
- Docs explicitly forbid session/checkpoint/audit/cost ownership in Python.
- CI keeps worker quality separate from Rust core quality.

### 8. Architecture Decision Records

**Goal:** Major architecture decisions are explicit and reviewable.

**Ownership:** `docs/adr`.

**Acceptance:**
- ADR records Rust core ownership.
- ADR records Python worker boundary.
- ADR records cross-platform desktop support policy.

### 9. Final Quality Review

**Goal:** The branch is ready for PR-level review.

**Ownership:** whole repo.

**Acceptance:**
- `npm run quality` passes.
- `npm run desktop:test` passes where platform prerequisites are installed.
- `npm audit --audit-level=high` returns zero vulnerabilities.
- Git status contains only intentional untracked product/spec docs.

## Phase 2 Roadmap

### 10. Rust Durable State v1

**Goal:** Persist Rust-owned product state locally without React or Python becoming state owners.

**Ownership:** `src-tauri/src/core/state.rs`, `src-tauri/src/lib.rs`.

**Acceptance:**
- Durable state snapshot is versioned.
- Goals, design sessions, feature sessions, evidence, and model call estimates round-trip through JSON.
- Missing state files load as an empty current-schema state.
- Invalid JSON fails with a typed store error.
- Saves create parent directories and use a temporary file before rename.
- Tauri exposes a read-only durable state snapshot command.

### 11. State-Backed Sessions v1

**Goal:** Mutate feature sessions through Rust-owned durable state commands.

**Ownership:** `src-tauri/src/core/state.rs`, `src-tauri/src/core/mission_control.rs`, `src-tauri/src/lib.rs`.

**Acceptance:**
- Feature sessions can be created through a state-backed command path.
- Checkpoints can be appended to existing sessions.
- Command evidence is recorded and can mark required command-exit-code checkpoints as passed.
- Feature sessions can only close after required checkpoints pass.
- Mission Control is calculated from persisted state instead of static data.
- Desktop-shell command signatures compile with Tauri enabled.
