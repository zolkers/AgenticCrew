# AgenticCrew Product Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current cockpit prototype into a real local-first AgenticCrew app with workspace selection, ChatGPT/OpenAI provider setup, real backend snapshots, git status, modern Mission Control, and a skill marketplace workflow.

**Architecture:** Rust remains the product truth owner: durable state, workspace registry, provider config metadata, git snapshots, skill source trust gates, costs, sessions, and cockpit snapshots. React renders feature views through typed adapter APIs and no longer imports preview product data directly. Python remains adapter-only and is not used for durable state, orchestration truth, secrets, or UI state.

**Tech Stack:** Tauri v2, Rust core modules, JSON durable state with schema migration, React 19 + TypeScript, Vitest/Testing Library, Docker-backed desktop quality checks.

---

## Scope And Sequencing

This is too large for one implementation pass. Execute in seven milestones, each independently shippable:

1. Product shell and route architecture.
2. Rust schema v2 foundation for workspaces, provider config, and migrations.
3. ChatGPT/OpenAI setup with secure API key storage.
4. Workspace picker and real cockpit snapshot.
5. Git interface v1.
6. Skill marketplace and source management workflow.
7. Modern Mission Control and Skill Sources redesign.

The guiding rule: no feature view should present fake operational values once the corresponding backend snapshot exists. Preview data may remain only inside browser-preview adapters and tests.

---

## File Structure Map

### Backend Rust

- Create `src-tauri/src/core/migrations.rs`: schema-version upgrades and backwards-compatible state loading.
- Create `src-tauri/src/core/provider_config.rs`: provider registry, ChatGPT/OpenAI model catalog, non-secret provider configuration, selected model.
- Create `src-tauri/src/core/secrets.rs`: secret reference model and secret-store trait; initial command-facing abstraction for storing and checking API keys.
- Create `src-tauri/src/core/workspaces.rs`: workspace registry, recent workspace discovery, workspace metadata, selected workspace.
- Create `src-tauri/src/core/git.rs`: read-only git status primitives and safe command wrapper.
- Create `src-tauri/src/core/cockpit.rs`: real cockpit DTO derived from durable state, workspaces, git, sessions, skills, costs, and provider config.
- Modify `src-tauri/src/core/state.rs`: add schema v2 fields with serde defaults and migration support.
- Modify `src-tauri/src/core/mission_control.rs`: expand the snapshot from real sessions, costs, provider config, workspaces, and git.
- Modify `src-tauri/src/core/skills.rs`: add marketplace/catalog DTOs and richer action states while preserving permission gates.
- Modify `src-tauri/src/lib.rs`: expose Tauri commands for provider config, API keys, workspaces, git status, cockpit snapshot, and skill source actions.

### Frontend

- Create `frontend/src/app/AppShell.tsx`: top-level route frame and view composition.
- Create `frontend/src/app/appRoutes.ts`: typed route/view state for setup, workspace picker, cockpit, mission control, skill sources, settings, git.
- Create `frontend/src/app/useAppBootstrap.ts`: independent loading states for app config, workspaces, provider config, and feature snapshots.
- Move cockpit from `frontend/src/app/App.tsx` into `frontend/src/features/cockpit/`.
- Create `frontend/src/features/workspaces/WorkspacePicker.tsx`, `types.ts`, `workspacesApi.ts`, and tests.
- Create `frontend/src/features/settings/SettingsPage.tsx`, `ApiKeysPanel.tsx`, `ProviderModelSelector.tsx`, `settingsApi.ts`, `types.ts`, and tests.
- Create `frontend/src/features/git/GitPanel.tsx`, `GitStatusBadge.tsx`, `gitApi.ts`, `types.ts`, and tests.
- Create `frontend/src/features/skill-sources/SkillMarketplace.tsx`, `SkillSourceCard.tsx`, `SkillSourceSearch.tsx`, `PermissionReviewDialog.tsx`, and workflow tests.
- Create `frontend/src/features/mission-control/MissionControlPage.tsx`, `MissionTimeline.tsx`, `AgentRoster.tsx`, `BudgetPanel.tsx`, and tests.
- Create `frontend/src/shared/api/cockpitApi.ts`, `providerConfigApi.ts`, `workspacesApi.ts`, `gitApi.ts`, plus Tauri and preview invoke tests.
- Expand `frontend/src/shared/types/core.ts` or split feature contracts into local `types.ts` files where ownership is clearer.
- Update `frontend/src/i18n/en.json` and `frontend/src/i18n/fr.json` for all visible strings.

### Docs And Scripts

- Modify `docs/roadmap.md`: add this phase plan and make `docs/PLAN.md` explicitly aspirational if kept.
- Keep `docs/PLAN.md` untracked unless the product owner explicitly asks to add it.
- Continue using `scripts/test-app.bat --quality` as the Windows/Docker end-to-end gate.

---

## Milestone 1: Product Shell And Route Architecture

**Goal:** Split the current monolithic `App.tsx` so future views do not pile into one file.

**Files:**
- Modify: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/AppShell.tsx`
- Create: `frontend/src/app/appRoutes.ts`
- Create: `frontend/src/app/useAppBootstrap.ts`
- Move/create: `frontend/src/features/cockpit/Cockpit.tsx`
- Move/create: `frontend/src/features/cockpit/CockpitSidebar.tsx`
- Move/create: `frontend/src/features/cockpit/AgentTerminal.tsx`
- Move/create: `frontend/src/features/cockpit/types.ts`
- Move/create: `frontend/src/features/cockpit/previewData.ts`
- Modify: `frontend/src/app/App.test.tsx`

- [ ] **Step 1: Write route-state tests**

Add tests in `frontend/src/app/App.test.tsx` that assert:

```tsx
expect(await screen.findByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Mission Control" }));
expect(await screen.findByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Skill Sources" }));
expect(await screen.findByRole("heading", { name: "Skill Sources" })).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: /AgenticCrew/ }));
expect(screen.getByRole("heading", { name: "AgenticCrew Cockpit" })).toBeInTheDocument();
```

Run:

```powershell
npm run test -w frontend -- src/app/App.test.tsx
```

Expected: fail until the split preserves existing navigation.

- [ ] **Step 2: Add typed routes**

Create `frontend/src/app/appRoutes.ts`:

```ts
export type AppRoute =
  | Readonly<{ name: "workspacePicker" }>
  | Readonly<{ name: "cockpit"; workspaceId: string }>
  | Readonly<{ name: "missionControl"; workspaceId?: string }>
  | Readonly<{ name: "skillSources"; workspaceId?: string }>
  | Readonly<{ name: "settings"; workspaceId?: string }>
  | Readonly<{ name: "git"; workspaceId?: string }>;

export function routeWorkspaceId(route: AppRoute): string | undefined {
  return "workspaceId" in route ? route.workspaceId : undefined;
}
```

- [ ] **Step 3: Extract cockpit components**

Move the current `Cockpit` function from `App.tsx` into `frontend/src/features/cockpit/Cockpit.tsx`, preserving props:

```ts
export type CockpitProps = Readonly<{
  activeWorkspace: CockpitWorkspace;
  onWorkspaceChange: (workspaceId: string) => void;
  workspaces: readonly CockpitWorkspace[];
}>;
```

Move sidebar markup into `CockpitSidebar.tsx` and terminal markup into `AgentTerminal.tsx`. Keep CSS class names stable in this milestone.

- [ ] **Step 4: Add `AppShell`**

Create `frontend/src/app/AppShell.tsx` that receives:

```ts
type AppShellProps = Readonly<{
  activeRoute: AppRoute;
  activeWorkspaceId: string;
  budgetLabel: string;
  statusLabel: string;
  onRouteChange: (route: AppRoute) => void;
  children: React.ReactNode;
}>;
```

Render the topbar in `AppShell`, not in `App.tsx`.

- [ ] **Step 5: Run frontend gates and commit**

Run:

```powershell
npm run test -w frontend
npm run typecheck -w frontend
npm run lint -w frontend
npm run coverage -w frontend
```

Commit:

```bash
git add frontend/src/app frontend/src/features/cockpit frontend/src/shared/preview
git commit -m "refactor: split product shell from cockpit"
```

---

## Milestone 2: Rust Schema V2 Foundation

**Goal:** Add durable structures for workspaces and provider config before UI depends on them.

**Files:**
- Create: `src-tauri/src/core/migrations.rs`
- Create: `src-tauri/src/core/workspaces.rs`
- Create: `src-tauri/src/core/provider_config.rs`
- Modify: `src-tauri/src/core/mod.rs`
- Modify: `src-tauri/src/core/state.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: module tests in each new Rust file plus command tests in `src-tauri/src/lib.rs`

- [ ] **Step 1: Add migration tests first**

In `src-tauri/src/core/migrations.rs`, test that schema v1 JSON loads into v2 with defaults:

```rust
#[test]
fn schema_v1_state_migrates_to_v2_defaults() {
    let value = serde_json::json!({
        "schema_version": 1,
        "goals": [],
        "design_sessions": [],
        "feature_sessions": [],
        "evidence": [],
        "model_call_estimates": [],
        "skill_sources": []
    });

    let migrated = migrate_state_value(value).expect("schema v1 should migrate");

    assert_eq!(migrated["schema_version"], 2);
    assert_eq!(migrated["workspaces"], serde_json::json!([]));
    assert_eq!(migrated["provider_config"]["activeProvider"], "openai");
}
```

- [ ] **Step 2: Define provider config**

Create `src-tauri/src/core/provider_config.rs` with:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub active_provider: String,
    pub active_model: String,
    pub providers: Vec<ProviderAccount>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAccount {
    pub id: String,
    pub display_name: String,
    pub secret_ref: Option<String>,
    pub configured: bool,
}
```

Default provider is `openai`, display name is `ChatGPT`, initial model is a data value, not hardcoded in UI.

- [ ] **Step 3: Define workspace config**

Create `src-tauri/src/core/workspaces.rs` with:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_opened_at: Option<String>,
}
```

Add validation that path is non-empty and id is unique.

- [ ] **Step 4: Expand state safely**

Modify `AgentOsState`:

```rust
pub schema_version: u32,
#[serde(default)]
pub workspaces: Vec<WorkspaceRecord>,
#[serde(default)]
pub provider_config: ProviderConfig,
```

Increment current schema version to `2`, then route JSON loading through `migrations.rs`.

- [ ] **Step 5: Expose read-only snapshots**

Add commands:

```rust
provider_config_snapshot
workspaces_snapshot
```

Both load from durable state and return typed DTOs.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src/core src-tauri/src/lib.rs
git commit -m "feat: add workspace and provider state foundation"
```

---

## Milestone 3: ChatGPT/OpenAI Setup And API Key Storage

**Goal:** Let the user configure ChatGPT/OpenAI first, choose a model, and store API keys outside JSON product state.

**Files:**
- Create: `src-tauri/src/core/secrets.rs`
- Modify: `src-tauri/src/core/provider_config.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `frontend/src/features/settings/SettingsPage.tsx`
- Create: `frontend/src/features/settings/ApiKeysPanel.tsx`
- Create: `frontend/src/features/settings/ProviderModelSelector.tsx`
- Create: `frontend/src/features/settings/settingsApi.ts`
- Create: `frontend/src/features/settings/types.ts`
- Create tests under `frontend/src/features/settings/`

- [ ] **Step 1: Implement secret abstraction with test store**

Create a Rust trait:

```rust
pub trait SecretStore {
    fn store_secret(&self, key: &str, value: &str) -> Result<(), SecretStoreError>;
    fn has_secret(&self, key: &str) -> Result<bool, SecretStoreError>;
    fn delete_secret(&self, key: &str) -> Result<(), SecretStoreError>;
}
```

Use an in-memory implementation for unit tests. Use Tauri/plugin-backed OS storage in desktop command wiring when available. If OS keychain integration needs a dependency decision, create the abstraction first and gate the real implementation behind the command layer.

- [ ] **Step 2: Add provider commands**

Expose:

```rust
provider_config_snapshot
set_active_model(provider_id: String, model_id: String)
store_provider_api_key(provider_id: String, api_key: String)
delete_provider_api_key(provider_id: String)
```

Persist only `secret_ref` and `configured`, never raw keys.

- [ ] **Step 3: Add frontend settings UI**

The settings page shows:

- ChatGPT connection status.
- Masked API key input.
- Model selector.
- Save key.
- Remove key.
- “Test connection” button that initially validates presence only unless real API validation is implemented.

- [ ] **Step 4: Test security contract**

Add Rust test asserting serialized state does not contain a fake key:

```rust
assert!(!serde_json::to_string(&state).unwrap().contains("sk-test-secret"));
```

Add frontend test asserting key value is cleared after save.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run test -w frontend
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src/features/settings frontend/src/shared/api frontend/src/shared/types frontend/src/i18n
git commit -m "feat: add ChatGPT provider setup"
```

---

## Milestone 4: Workspace Picker And Real Cockpit Snapshot

**Goal:** Show a first page where the user chooses a workspace, then render cockpit values from Rust snapshots instead of `cockpitData.ts`.

**Files:**
- Create: `src-tauri/src/core/cockpit.rs`
- Modify: `src-tauri/src/core/workspaces.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `frontend/src/features/workspaces/WorkspacePicker.tsx`
- Create: `frontend/src/features/workspaces/workspacesApi.ts`
- Create: `frontend/src/shared/api/cockpitApi.ts`
- Modify: `frontend/src/features/cockpit/*`
- Remove or quarantine: `frontend/src/shared/preview/cockpitData.ts`

- [ ] **Step 1: Add backend cockpit DTO**

Create `CockpitSnapshot`:

```rust
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CockpitSnapshot {
    pub workspaces: Vec<CockpitWorkspace>,
}
```

`CockpitWorkspace` contains path, branch, dirty status, active sessions, active agents, budget/cost, active skills, checkpoints, and logs derived from real state. If no sessions exist, return an empty state message, not fake agents.

- [ ] **Step 2: Add workspace picker**

The first screen lists:

- Recent registered workspaces.
- Add local folder.
- Open existing workspace.
- Git repository status if known.
- ChatGPT configuration warning if missing.

- [ ] **Step 3: Replace static cockpit import**

Remove direct import of `cockpitWorkspaces` from app runtime. Use:

```ts
const snapshot = await loadCockpitSnapshot(cockpitInvoke);
```

Browser preview may still return deterministic preview data through `previewInvokes.ts`, but the cockpit component must accept props only.

- [ ] **Step 4: Test real empty state**

Add tests for:

- No workspaces -> workspace picker empty state.
- Workspace selected -> cockpit route opens.
- No sessions -> no fake agents/logs.
- Browser preview -> deterministic demo still works.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src
git commit -m "feat: load cockpit from workspace state"
```

---

## Milestone 5: Git Interface V1

**Goal:** Provide a modern git surface: branch, dirty files, latest commit, remote, ahead/behind, and safe read-only status.

**Files:**
- Create: `src-tauri/src/core/git.rs`
- Modify: `src-tauri/src/core/workspaces.rs`
- Modify: `src-tauri/src/core/cockpit.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `frontend/src/features/git/GitPanel.tsx`
- Create: `frontend/src/features/git/GitStatusBadge.tsx`
- Create: `frontend/src/features/git/gitApi.ts`
- Create: `frontend/src/features/git/types.ts`

- [ ] **Step 1: Add read-only git primitives**

Implement safe wrappers for:

```text
git rev-parse --show-toplevel
git branch --show-current
git status --porcelain=v1
git remote get-url origin
git rev-parse --short HEAD
```

Never pass user-controlled strings through shell interpolation. Use `Command` args.

- [ ] **Step 2: Add git snapshot command**

Expose:

```rust
git_status_snapshot(workspace_id: String) -> Result<GitStatusSnapshot, DesktopCommandError>
```

Return typed errors for “not a git repo” and “git not installed”.

- [ ] **Step 3: Add frontend git view**

Render:

- Branch.
- Dirty file count.
- Modified/untracked/deleted groups.
- Remote origin.
- Latest short SHA.
- Read-only copy buttons only in v1.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src/features/git frontend/src/shared/api frontend/src/i18n
git commit -m "feat: add workspace git status"
```

---

## Milestone 6: Skill Marketplace And Source Management

**Goal:** Replace the raw Skill Sources page with a marketplace-style manager for registering, syncing, inspecting, approving, activating, and searching skills.

**Files:**
- Modify: `src-tauri/src/core/skills.rs`
- Modify: `src-tauri/src/core/skill_manifest.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `frontend/src/shared/api/skillSourcesApi.ts`
- Modify: `frontend/src/shared/api/tauriSkillSourcesInvoke.ts`
- Create: `frontend/src/features/skill-sources/SkillSourcesPage.tsx`
- Create: `frontend/src/features/skill-sources/SkillMarketplace.tsx`
- Create: `frontend/src/features/skill-sources/SkillSourceSearch.tsx`
- Create: `frontend/src/features/skill-sources/SkillSourceCard.tsx`
- Create: `frontend/src/features/skill-sources/PermissionReviewDialog.tsx`

- [ ] **Step 1: Fix frontend action invoke boundary**

`tauriSkillSourcesInvoke.ts` must forward args for existing commands:

```ts
invoke(command, args)
```

Tests must prove `register_github_skill_source`, `sync_github_skill_source`, `inspect_cached_skill_source`, `approve_skill_source_permissions`, and `activate_skill_source` receive args.

- [ ] **Step 2: Add marketplace search model**

For v1, marketplace search is local:

- Bundled known sources.
- Registered external sources.
- Discovered skills from cached manifests.

No remote untrusted package search before permission policy is clear.

- [ ] **Step 3: Build modern workflow UI**

User flow:

1. Search skills/sources.
2. Register GitHub source with URL/ref.
3. Sync source.
4. Inspect manifests.
5. Review requested permissions.
6. Approve permissions.
7. Activate source.

Each step shows status and errors.

- [ ] **Step 4: Keep trust gates explicit**

Do not activate any source automatically. The UI must distinguish:

- bundled
- local
- external GitHub
- pending validation
- rejected
- permissions pending
- active

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src/features/skill-sources frontend/src/shared/api frontend/src/shared/types frontend/src/i18n
git commit -m "feat: add skill marketplace workflow"
```

---

## Milestone 7: Modern Mission Control And Real Metrics

**Goal:** Replace the definition-list Mission Control with an operational management page backed by real sessions, checkpoints, provider config, git, skills, and model cost records.

**Files:**
- Modify: `src-tauri/src/core/mission_control.rs`
- Modify: `src-tauri/src/core/costs.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `frontend/src/features/mission-control/MissionControlPage.tsx`
- Create: `frontend/src/features/mission-control/MissionTimeline.tsx`
- Create: `frontend/src/features/mission-control/AgentRoster.tsx`
- Create: `frontend/src/features/mission-control/BudgetPanel.tsx`
- Create: `frontend/src/features/mission-control/MissionControl.css`
- Modify: `frontend/src/features/mission-control/MissionControl.test.tsx`

- [ ] **Step 1: Expand Mission Control DTO**

Add fields:

```ts
activeWorkspace
activeProvider
activeModel
sessions[]
checkpoints[]
costSummary
recentEvidence[]
gitSummary
skillSummary
humanGateStatus
```

Rust derives it from state; React does not compute product truth.

- [ ] **Step 2: Add cost recording command**

Expose `record_model_call_estimate` so future agents can append usage. Mission Control should show zero state clearly if there are no calls.

- [ ] **Step 3: Build Mission Control UI**

Render:

- Run health strip.
- Session timeline.
- Agent/checkpoint roster.
- Budget/cost panel.
- Human gate panel.
- Recent evidence.

No generic list dump. No fake values.

- [ ] **Step 4: Browser QA**

Use the in-app browser at `http://127.0.0.1:5173/`:

- Verify Mission Control opens from topbar.
- Verify no overlap at desktop width.
- Verify no text clipping.
- Verify mobile stacked layout.
- Verify console has zero errors.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src/features/mission-control frontend/src/shared frontend/src/i18n
git commit -m "feat: modernize mission control metrics"
```

---

## Milestone 8: Polish, Integration, And Roadmap Cleanup

**Goal:** Make the app coherent after major feature landings and update docs so future work follows the new architecture.

**Files:**
- Modify: `docs/roadmap.md`
- Optionally modify/add: `docs/adr/0005-provider-secret-storage.md`
- Optionally modify/add: `docs/adr/0006-workspace-and-git-ownership.md`
- Modify: `README.md`
- Modify: `frontend/src/app/App.css` and feature CSS as needed

- [ ] **Step 1: Normalize docs**

Update `docs/roadmap.md` with completed milestones and next focus.

If `docs/PLAN.md` is committed later, add a banner:

```md
> This is aspirational product vision. The committed engineering roadmap in docs/roadmap.md is the implementation source of truth.
```

- [ ] **Step 2: Add ADRs**

Create ADRs for:

- API keys stored outside durable JSON state.
- Rust owns workspace/git snapshots.
- Browser preview may use deterministic data but app runtime must use Rust snapshots.

- [ ] **Step 3: Final full gate**

Run:

```powershell
npm run test -w frontend
npm run typecheck -w frontend
npm run lint -w frontend
npm run coverage -w frontend
scripts\test-app.bat --quality
```

- [ ] **Step 4: Commit**

Commit:

```bash
git add docs README.md frontend/src src-tauri/src
git commit -m "docs: document product foundation architecture"
```

---

## Acceptance Criteria For The Whole Plan

- The user can launch the app and first choose a workspace.
- The user can configure ChatGPT/OpenAI with an API key without the raw key entering `agenticcrew-state.json`.
- The user can choose an OpenAI/ChatGPT model from app settings.
- Cockpit data comes from Rust snapshots in desktop runtime.
- Browser preview remains deterministic but is isolated behind preview adapters.
- Mission Control is a modern management view with real sessions, checkpoints, costs, provider/model, skills, and git summaries.
- Skill Sources becomes a marketplace-like manager with search, registration, sync, inspection, permission review, and activation.
- Git status is visible per workspace.
- No runtime product truth is owned by React or Python.
- `scripts\test-app.bat --quality` passes before merging each milestone.

---

## Execution Recommendation

Use `superpowers:subagent-driven-development`.

Suggested subagent split:

- Worker A: Rust schema/migrations/provider/workspace.
- Worker B: frontend shell/cockpit extraction/workspace picker.
- Worker C: settings/API key/model UI.
- Worker D: skill marketplace workflow.
- Worker E: Mission Control redesign.
- Reviewer agents after each milestone: spec compliance first, code quality second.

Do not run all milestones in parallel. Milestones 2 and 3 define contracts that later frontend work depends on.
