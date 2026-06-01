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
- Workspace launcher, manual Git metadata editing, Rust-owned workspace records, OpenAI provider model sync, model pickers, Skill Sources workflow, Harness Studio PI extensions, Agent Studio evaluation runs, and live Mission Control metrics.
- Command Palette v1 for workspace navigation, including Ctrl/Cmd+K, filtered actions, accessible close behavior, and Git/Settings/Launchpad routing.
- Mission-level skill selection in the Workbench: active downloaded skills can be selected per run and are persisted on the durable run record.
- Backend-backed Git commit previews: the Git panel now loads selected commit metadata, changed files, stats, and patch lines through the Electron/Rust sidecar instead of generating UI-only diffs.
- Multi-provider AI configuration: OpenAI and Gemini are exposed through a shared provider registry, model pickers are provider-aware, and settings/agents/runs persist `low`, `medium`, or `high` thinking effort.
- Crew-oriented run records: queued runs now persist participants in the Rust-owned run manifest, and the cockpit can launch Solo or Crew mode with developer/reviewer participant scopes.
- Crew runtime lifecycle controls: run records can move through preparing, running, completed, and failed states through Rust/Electron commands while updating participant statuses, runtime events, and the run manifest.
- Audited run command evidence: the Rust runtime snapshot now records participant-scoped command results with cwd, stdout/stderr, exit code, status, and timeline events, exposed through Electron and the cockpit.
- Controlled runtime command execution: Electron/Rust can now execute a participant-scoped command as `program + args[]` without shell expansion, capture stdout/stderr, and persist the result as run command evidence.
- Runtime command policy gate: controlled execution now applies an explicit program allowlist and records blocked commands as failed evidence instead of launching them.
- Runtime policy contract: run snapshots now expose the backend-owned allowed command policy so the cockpit can show what the current execution gate permits.
- Coverage ratchet: frontend coverage has been raised above 98% globally with additional App, Git preview, and Skill Sources regression tests while keeping the 100% target explicit.

**Next focus:**
- Multi-agent runtime execution: replace preview-only browser data with sidecar-backed crew manifests, isolated participant worktrees, live per-agent event streams, pause/resume/kill controls, and audited command execution.
- Product power features: artifacts, diff review, safety center, notifications, and run replay.
- Packaging polish: native Electron menus, installer packaging, updater strategy, and first-run onboarding.

## Product Roadmap From Current Discussions

This section is the current product roadmap for the AgenticCrew app experience. It reconciles the earlier AgentOS vision with the actual `dev` branch direction: Electron shell, Rust-owned durable state, React/Mantine UI, OpenAI first, provider architecture ready for more backends, first-class workspaces, Git, skills, harnesses, and custom agents.

### Phase A - App Shell And Workspace Management

**Goal:** Stop treating workspaces as static preview cards and make the app feel like a real Codex-style project launcher.

**Scope:**
- Create a workspace from the launchpad with name, local path, branch, mission, budget, and status.
- Edit workspace metadata after creation, especially branch/path, without hunting through the cockpit.
- Keep workspace selection prominent but remove the crowded row of header buttons.
- Move product navigation into a clean workspace rail/sidebar with icons and labels.
- Make the top header focus on product identity, current workspace, branch, status, and quick actions only.
- Persist workspace records in Rust durable state after the first UI tranche proves the shape.

**Acceptance:**
- Users can create and open a local workspace from the first screen.
- Users can manually change branch/path from a workspace Git/config area.
- The cockpit header no longer looks like a pile of unrelated buttons.
- Tests prove workspace creation, branch editing, routing, and navigation.

### Phase B - Git Workspace Control

**Goal:** Provide the minimum useful Git surface before deeper automation.

**Scope:**
- Show current branch, base branch, working tree state, PR target, and last sync.
- Allow manual branch edit/selection first, then later real branch discovery from Git.
- Add actions for refresh, checkout/create branch, pull, push, open PR, and copy diagnostics.
- Keep dangerous actions gated by clear confirmation and evidence.
- Later move from preview data to Rust commands that shell out to Git safely.

**Acceptance:**
- Git panel has editable branch config now.
- Future Rust command contracts are explicit before real Git mutations land.
- No branch names are hardcoded into agent execution flows.

### Phase C - Provider And Model Registry

**Goal:** n8n-style credentials and dynamic model lists, OpenAI and Gemini first.

**Scope:**
- Replace hardcoded model dropdowns with provider-owned model records.
- Add an AI provider registry with `openai` and `gemini` enabled through the same command contracts.
- Store API key metadata securely; never expose full keys back to React.
- Add `sync_provider_models` for OpenAI model discovery.
- Cache model list, last sync timestamp, provider status, and errors.
- UI: provider credentials page, sync button, available model picker, default model, per-agent model picker.
- Architecture: provider interface ready for Anthropic, Mistral, Ollama, and custom endpoints, but hidden until implemented.
- Add a first-class thinking-effort setting for default provider config, agent templates, and mission launches.

**Acceptance:**
- OpenAI and Gemini credentials can be configured.
- Models are listed from provider data, not hardcoded UI options.
- Agent Studio and cockpit loadout use synced models.
- Users can choose low, medium, or high thinking effort before saving settings, agent templates, or starting a run.
- Missing/invalid key produces a recoverable UI state.

### Phase D - Skill Marketplace And Routes

**Goal:** Make skills discoverable, searchable, installable, and bindable like a real package marketplace.

**Scope:**
- Canonical skill routes stay the product contract.
- Skill Sources becomes a marketplace with search, filters, trust, route copying, install/sync, permission gate, and activation state.
- Users can bind skills to agents and harnesses from route pickers instead of manual text blobs.
- External sources remain inactive until validated and approved.

**Acceptance:**
- Users can find a skill by name or route.
- Agent Studio can attach skills without typing full routes manually.
- Permission and provenance are visible at the point of use.

### Phase E - Harness Studio And PI Extension Customization

**Goal:** Make AgenticCrew the most customizable harness surface: multiple harnesses, modular policies, PI extensions, and loadout binding.

**Scope:**
- Multiple harness profiles with modules for base policy, behavior rules, tool rules, safety rules, output style, project memory, and agent persona.
- Import user PI extensions and inspect them before activation.
- Preview the effective harness for workspace + agent + skill + run.
- Bind harnesses by workspace, agent, skill, and run with visible precedence.
- Version harnesses and allow rollback.

**Acceptance:**
- Users can create, edit, duplicate, activate, and bind multiple harnesses.
- Effective harness is inspectable before run launch.
- Harness choice is visible in cockpit loadout.

### Phase F - Agent Studio, Training, And Loadouts

**Goal:** Custom agents become versioned, evaluable, loadable entities rather than forms.

**Scope:**
- Create/edit/duplicate agents with role, instructions, model, budget, tools, skills, memory policy, and harness binding.
- Add agent versions and promotion workflow.
- Add training panel for prompt/config iteration and evaluation, not weight fine-tuning.
- Add datasets, test prompts, critic runs, regression checks, and cost comparison.
- Load selected agent + harness + model into workspace cockpit.

**Acceptance:**
- Users can prepare several agent variants and choose one in the main window.
- Training panel can compare versions before promotion.
- Loadout selection uses real saved agent records.

### Phase G - Mission Control And Multi-Agent Runtime

**Goal:** Replace static dashboard values with live run state.

**Scope:**
- Mission Control reads active sessions, agents, costs, checkpoints, tool calls, and human gates from Rust state.
- Add per-agent activity streams, terminal focus, global log, split/focus views, and command composer.
- Add pause/resume/kill/restart/broadcast controls with evidence.
- Add checkpoint replay and export.

**Acceptance:**
- Every visible Mission Control metric comes from durable state or live run state.
- Users can see what each agent is doing without switching blindly.

### Phase H - Backend Modularization

**Goal:** Keep the app extensible without turning React into the product owner.

**Scope:**
- Rust durable state owns workspaces, providers, models, agents, harnesses, skills, sessions, costs, evidence, and Git status.
- Electron exposes a narrow `window.agenticcrew.invoke` bridge.
- Provider adapters are isolated behind command contracts.
- Python workers remain tool/provider adapters and never own product truth.
- Keep reusable Rust product logic in `crates/agenticcrew-core` and route desktop calls through `crates/agenticcrew-sidecar`.

**Acceptance:**
- New providers or tools can be added without rewriting UI screens.
- React components consume typed snapshots and mutations only.

### Phase I - Polish, Packaging, And Trust

**Goal:** Turn the prototype into a credible desktop product.

**Scope:**
- Refine layout density, typography, icon-first controls, empty states, and responsive behavior.
- Add onboarding for first workspace, first API key, first agent, and first run.
- Add audit exports, backup/restore, and local data location controls.
- Package Electron app with update strategy.

**Acceptance:**
- A new user can go from install to first workspace + OpenAI key + agent loadout without docs.
- The app remains understandable as features grow.

## Immediate Implementation Order

Completed on `dev`:

1. Reorganize the app shell and workspace launcher.
2. Add workspace creation and manual Git metadata editing in the current React layer.
3. Move workspace records into Rust durable state.
4. Add OpenAI provider model registry and dynamic model sync.
5. Replace model dropdown hardcoding in Agent Studio and cockpit.
6. Upgrade Skill Sources into a marketplace/search surface.
7. Expand Harness Studio modules and PI extension import.
8. Add Agent Studio versioning/training/evaluation.
9. Replace Mission Control preview values with live durable/runtime state.
10. Add mission-level skill selection to queued runs.
11. Add OpenAI/Gemini provider selection and persisted thinking effort across settings, agents, and run launch.

Next tranche: configurable workspace/agent command policies, per-agent event streaming, pause/resume/kill controls, progressive removal of preview-only data from desktop runtime paths, and continued coverage ratcheting toward the 100% target. Git commit preview, durable run manifests, lifecycle controls, audited command records, controlled command execution, the first command allowlist gate, and the surfaced runtime policy contract are completed slices of this runtime-backed replacement work.

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
