# AgenticCrew Engineering Roadmap

## Architecture North Star

AgenticCrew is a local-first desktop product with an Electron shell, a Rust-owned core, a React UI, and optional Python workers. Rust owns durable state, session lifecycle, checkpoints, evidence, audit, cost records, permissions, Git/Docker orchestration, and Markdown library compilation. Electron owns windows, packaging, updater strategy, and a secure IPC bridge only. Python workers may execute AI/tool adapters, but they never own product truth.

## Current Progress

**Completed on `dev`:**
- Desktop tooling, Rust core session invariants, evidence harness, cost primitive, Mission Control command, frontend adapter boundary, worker boundary, and ADR baseline.
- Durable Rust state v1 with JSON persistence, schema validation, atomic temp-file saves, and read-only desktop snapshots.
- State-backed feature session mutations for creation, checkpoints, command evidence, close gates, and Mission Control derived from persisted state.
- External GitHub skill source registration, sync, cache inspection, manifest validation, provenance, selected ref, trust level, last sync status, inactive-by-default behavior, Rust-owned validation, and activation gated on validation and approved permissions.
- Docker-backed desktop test workflow for Windows machines without local MSVC Build Tools or GNU MinGW prerequisites.
- Restrained workspace navigation shell between Mission Control and Skill Sources.
- AgenticCrew technical naming across npm, Rust, Python worker, and Sonar project metadata.

**Next focus:**
- Electron shell migration: move Rust product truth from `src-tauri/src/core` into `crates/agenticcrew-core`, add a sidecar bridge, expose `window.agenticcrew.invoke`, and remove renderer Tauri imports.
- Product UI foundation: adopt Mantine, TanStack Router, TanStack Query, Tabler icons, and the graphite/ink/copper visual system before expanding screens.
- External skill marketplace and route workflow: register, sync, inspect, approve, search, route, and attach skills without activating untrusted code prematurely.
- Harness Studio and PI extensions: compose multiple harness profiles, import user PI extensions, preview effective harnesses, and bind them to workspaces, agents, skills, and runs.
- Agent Studio: create custom agents, bind approved skills and harnesses, evaluate candidate versions, and load published agent versions into workspaces and missions.

## Task Roadmap

### 1. Desktop Tooling Gate

**Goal:** `npm run desktop:test` is reliable on supported developer machines and CI.

**Ownership:** `.cargo/`, `crates/`, `electron/`, `README.md`, `package.json`.

**Acceptance:**
- Rust test command is documented for Windows, Linux, and macOS.
- Local failure modes identify missing platform prerequisites.
- No platform-specific hack breaks CI or another OS.

### 2. Rust Core Session Invariants

**Goal:** Encode core state rules in Rust before UI or workers depend on them.

**Ownership:** `crates/agenticcrew-core/src/sessions.rs`.

**Acceptance:**
- `FeatureSession` cannot close while required checkpoints are pending.
- `GoalObject` remains immutable by API design.
- State transitions are explicit and tested.
- Tests cover allowed and rejected transitions.

### 3. Rust Evidence Harness

**Goal:** Claims become evidence-backed records owned by Rust.

**Ownership:** `crates/agenticcrew-core/src/evidence.rs`.

**Acceptance:**
- Command evidence records command, exit code, actor, checkpoint, and timestamp.
- Failed command evidence remains valid evidence, not success.
- Evidence type serialization is stable snake_case.

### 4. Cost Compiler Primitive

**Goal:** Cost calculations start in Rust with configured pricing inputs, not hardcoded providers.

**Ownership:** `crates/agenticcrew-core/src/costs.rs`.

**Acceptance:**
- Pricing is provided as data.
- Cached and uncached input tokens are priced separately.
- Invalid token/cost underflow is impossible.

### 5. Rust-Backed Desktop IPC Command

**Goal:** Frontend reads a typed Mission Control snapshot from Rust.

**Ownership:** `crates/agenticcrew-core/src/mission_control.rs`, `crates/agenticcrew-sidecar/src/main.rs`, `electron/ipc`, `frontend/src/shared`.

**Acceptance:**
- Electron IPC returns typed session count, agent count, cost, provider/model, checkpoint, and gate status from Rust.
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
- ADR records Electron shell with Rust core and sidecar bridge.

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

**Ownership:** `crates/agenticcrew-core/src/state.rs`, `crates/agenticcrew-sidecar/src/main.rs`, `electron/ipc`.

**Acceptance:**
- Durable state snapshot is versioned.
- Goals, design sessions, feature sessions, evidence, and model call estimates round-trip through JSON.
- Missing state files load as an empty current-schema state.
- Invalid JSON fails with a typed store error.
- Saves create parent directories and use a temporary file before rename.
- Electron IPC exposes a read-only durable state snapshot command backed by Rust.

### 11. State-Backed Sessions v1

**Goal:** Mutate feature sessions through Rust-owned durable state commands.

**Ownership:** `crates/agenticcrew-core/src/state.rs`, `crates/agenticcrew-core/src/mission_control.rs`, `crates/agenticcrew-sidecar/src/main.rs`, `electron/ipc`.

**Acceptance:**
- Feature sessions can be created through a state-backed command path.
- Checkpoints can be appended to existing sessions.
- Command evidence is recorded and can mark required command-exit-code checkpoints as passed.
- Feature sessions can only close after required checkpoints pass.
- Mission Control is calculated from persisted state instead of static data.
- Desktop-shell IPC signatures compile with the Electron bridge enabled.

### 12. External Skill Sources v1

**Goal:** Allow AgenticCrew to discover and install skills from external GitHub repositories, including Superpowers-style repositories such as Obra's.

**Ownership:** `crates/agenticcrew-core`, `crates/agenticcrew-sidecar`, `electron`, `frontend/src/features`, `docs/adr`.

**Acceptance:**
- Users can register a GitHub repository as a skill source.
- Skill source metadata records repository URL, selected ref, provenance, and last sync status.
- Imported skills are validated before activation and never bypass local permission gates.
- External sources remain inactive until Rust marks them validated.
- The UI distinguishes bundled, local, and external GitHub skills.
- Documentation captures trust, update, and pinning rules for third-party skill sources.

### 13. Harness Studio And PI Extensions v1

**Goal:** Make execution harnesses first-class, composable, inspectable, and bindable.

**Ownership:** `crates/agenticcrew-core/src/harnesses.rs`, `crates/agenticcrew-core/src/pi_extensions.rs`, `frontend/src/features/harnesses`, `frontend/src/features/pi`.

**Acceptance:**
- Built-in PI execution discipline is represented as a Rust-owned harness profile.
- Users can import or inspect PI extensions without automatic activation.
- Harness and PI routes are separate from skill routes.
- Effective harness snapshots are computed by Rust, not React.
- Binding precedence is global < workspace < agent < skill < run.

### 14. Agent Studio v1

**Goal:** Make custom agents durable, versioned, skill-bound, harness-bound, and evaluable.

**Ownership:** `crates/agenticcrew-core/src/agents.rs`, `crates/agenticcrew-core/src/evaluations.rs`, `frontend/src/features/agents`.

**Acceptance:**
- Agent templates and versions are Rust-owned durable records.
- Agents bind canonical skill routes and approved harness profiles.
- Training v1 means prompt/config/skill/harness iteration, not weight fine-tuning.
- Evaluation runs compare versions with scores, regressions, costs, and artifacts.
- Cockpit/session launch uses published agent versions rather than preview-only agents.
