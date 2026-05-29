# AgenticCrew Product Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current cockpit prototype into a real local-first AgenticCrew app with workspace selection, ChatGPT/OpenAI provider setup, real backend snapshots, git status, modern Mission Control, and a skill marketplace workflow.

**Architecture:** Rust remains the product truth owner: durable state, workspace registry, provider config metadata, git snapshots, skill source trust gates, costs, sessions, and cockpit snapshots. React renders feature views through typed adapter APIs and no longer imports preview product data directly. Python remains adapter-only and is not used for durable state, orchestration truth, secrets, or UI state.

**Tech Stack:** Tauri v2, Rust core modules, JSON durable state with schema migration, React 19 + TypeScript, Mantine, Tabler Icons, TanStack Router, TanStack Query, Vitest/Testing Library, Docker-backed desktop quality checks.

---

## Scope And Sequencing

This is too large for one implementation pass. Execute in twelve milestones, each independently shippable:

0. UI framework and multi-agent design system.
1. Product shell and route architecture.
2. Rust schema v2 foundation for workspaces, provider config, and migrations.
3. ChatGPT/OpenAI setup with secure API key storage.
4. Workspace picker and real cockpit snapshot.
5. Multi-agent supervision console.
6. Git interface v1.
7. Skill route index and package addressing.
8. Skill marketplace and source management workflow.
9. Modern Mission Control and Skill Sources redesign.
10. Product power features.
11. Polish, integration, and roadmap cleanup.

The guiding rule: no feature view should present fake operational values once the corresponding backend snapshot exists. Preview data may remain only inside browser-preview adapters and tests.

---

## Product Experience Direction

AgenticCrew should feel closer to a professional agent operations IDE than a decorative dashboard. The UI should borrow the useful patterns from modern coding-agent and multi-agent tools while deliberately going further:

- From Codex-like products: task cards, isolated workspaces, visible logs, diffs/artifacts, PR/git handoff, skills, long-running work, and multiple agents running without blocking the user.
- From multi-agent studios: reusable agent/workflow components, visual orchestration, debug traces, and human review gates.
- From terminal-first developer tools: fast keyboard navigation, dense panes, command palette, split views, and zero marketing chrome.

The experience must answer four questions at all times:

1. Which workspace am I in?
2. Which agents exist, and what is each doing right now?
3. Which skills/tools/routes are loaded, trusted, or blocked?
4. What changed in files, git, costs, checkpoints, and artifacts?

### Framework Choice

Adopt Mantine as the application UI framework, with TanStack Router and TanStack Query:

- Mantine gives the app real desktop-product building blocks now: AppShell, NavLink, Drawer, Modal, Tabs, Table, Timeline, Stepper, Combobox, Command-style search surfaces, notifications, forms, and dense dark-mode ergonomics.
- Tabler Icons should be the default icon set for actions: git branch, search, settings, key, package, terminal, play, pause, stop, check, alert, eye, split, panel, route.
- TanStack Router should replace string-union view state so workspace, skill, agent, git, marketplace, settings, and mission routes are URL-addressable and type-safe.
- TanStack Query should own frontend server-state caching, invalidation, loading, retry, and mutation status for Tauri snapshots and preview adapters.
- AgenticCrew still owns the visual identity through Mantine theme tokens, density, spacing, colors, and feature layouts. Do not use Mantine defaults unchanged.

Do not build a hand-rolled UI framework in custom CSS. Custom CSS remains for terminal/log surfaces and precise layout accents only.

### Agent Supervision UX

The cockpit needs four coordinated surfaces:

- **Agent Roster:** left rail with every agent, role, model, current step, health, token/cost burn, git/file activity, and whether it is waiting on user/tool/peer.
- **Activity Stream:** central chronological stream of events across agents: thoughts, tool calls, file writes, test runs, review comments, checkpoints, errors, and user gates.
- **Agent Inspector:** right rail or drawer for the selected agent: prompt, model, skills, working set, last actions, active files, subtasks, memory scope, and controls.
- **Work Graph:** optional graph/timeline view showing delegation edges, dependencies, blocked nodes, parallel work, and handoffs.

The current single terminal stream is not enough. It should become one selectable view among stream, split terminals, graph, artifacts, git diff, and cost timeline.

### Skill Route System

Every skill must be addressable by a stable route that can be searched, copied, loaded, linked, audited, and attached to an agent.

Initial canonical route format:

```text
agenticcrew://skills/{sourceId}/{skillSlug}
agenticcrew://skills/{sourceId}/{namespace}/{skillSlug}
```

Short alias format:

```text
skill://{sourceId}/{skillName}
skill://{sourceId}/{namespace}/{skillName}
```

Examples:

```text
skill://superpowers/subagent-driven-development
skill://browser/browser
skill://github/gh-fix-ci
skill://local/research/summarize-paper
```

Rules:

- `sourceId` is the Rust-owned skill source id.
- Path segments are normalized, URL-safe, lowercase kebab-case.
- The canonical stored value is always `agenticcrew://skills/...`; `skill://...` is parsed as a convenience alias.
- Routes resolve to a manifest, local cache path, trust level, activation status, permission gate, source provenance, and version/ref.
- UI never loads a route unless Rust says it is validated and permission-approved, except for read-only preview of metadata.
- Agent configuration stores skill routes, not local file paths.
- The marketplace search returns routes, not loose filenames.

### Additional Product Capabilities To Add

These are not fully covered by the earlier plan and should be added to the roadmap:

- **Command palette:** global `Ctrl+K` / `Cmd+K` for open workspace, run skill, switch agent, show git, open settings, search logs.
- **Artifacts panel:** files, patches, screenshots, logs, reports, and PR descriptions produced by agents.
- **Diff review center:** central review of file changes by agent and checkpoint, before commit or PR.
- **Run replay:** deterministic timeline replay of a completed or failed run from stored events.
- **Agent templates:** create agents from presets and save custom role/model/skill bundles.
- **Skill dependency view:** show which agents use which skills, and which skills request network/git/docker/filesystem.
- **Safety center:** budget caps, tool permissions, workspace filesystem boundaries, network allowlist, and kill/pause controls.
- **Layout presets:** focus agent, all agents grid, mission control, marketplace, git review, compact laptop mode.
- **Notifications:** local notifications for gates, failed tests, budget thresholds, long-running agent completion.
- **Evaluation lane:** critic/reviewer output quality checks and compare runs over the same task.

---

## File Structure Map

### Backend Rust

- Create `src-tauri/src/core/migrations.rs`: schema-version upgrades and backwards-compatible state loading.
- Create `src-tauri/src/core/provider_config.rs`: provider registry, ChatGPT/OpenAI model catalog, non-secret provider configuration, selected model.
- Create `src-tauri/src/core/secrets.rs`: secret reference model and secret-store trait; initial command-facing abstraction for storing and checking API keys.
- Create `src-tauri/src/core/workspaces.rs`: workspace registry, recent workspace discovery, workspace metadata, selected workspace.
- Create `src-tauri/src/core/git.rs`: read-only git status primitives and safe command wrapper.
- Create `src-tauri/src/core/cockpit.rs`: real cockpit DTO derived from durable state, workspaces, git, sessions, skills, costs, and provider config.
- Create `src-tauri/src/core/agent_events.rs`: append-only agent activity events, heartbeats, tool calls, file touches, artifacts, and gate requests.
- Create `src-tauri/src/core/skill_routes.rs`: stable route index, route parsing, search, resolution, and trust-aware load contracts.
- Modify `src-tauri/src/core/state.rs`: add schema v2 fields with serde defaults and migration support.
- Modify `src-tauri/src/core/mission_control.rs`: expand the snapshot from real sessions, costs, provider config, workspaces, and git.
- Modify `src-tauri/src/core/skills.rs`: add marketplace/catalog DTOs and richer action states while preserving permission gates.
- Modify `src-tauri/src/lib.rs`: expose Tauri commands for provider config, API keys, workspaces, git status, cockpit snapshot, and skill source actions.

### Frontend

- Create `frontend/src/app/AppShell.tsx`: top-level route frame and view composition.
- Create `frontend/src/app/appRoutes.ts`: typed route/view state for setup, workspace picker, cockpit, mission control, skill sources, settings, git.
- Create `frontend/src/app/useAppBootstrap.ts`: independent loading states for app config, workspaces, provider config, and feature snapshots.
- Create `frontend/src/app/router.tsx`: TanStack Router route tree and typed route params.
- Create `frontend/src/app/queryClient.ts`: TanStack Query client defaults and cache keys.
- Create `frontend/src/shared/ui/theme.ts`: Mantine theme tokens, density scale, color palette, component defaults, and Tabler icon mapping.
- Move cockpit from `frontend/src/app/App.tsx` into `frontend/src/features/cockpit/`.
- Create `frontend/src/features/supervision/AgentRosterRail.tsx`, `RunTimeline.tsx`, `LiveActivityFeed.tsx`, `CheckpointBoard.tsx`, `HumanGateInbox.tsx`, `ArtifactEvidencePanel.tsx`, and tests.
- Create `frontend/src/features/workspaces/WorkspacePicker.tsx`, `types.ts`, `workspacesApi.ts`, and tests.
- Create `frontend/src/features/settings/SettingsPage.tsx`, `ApiKeysPanel.tsx`, `ProviderModelSelector.tsx`, `settingsApi.ts`, `types.ts`, and tests.
- Create `frontend/src/features/git/GitPanel.tsx`, `GitStatusBadge.tsx`, `gitApi.ts`, `types.ts`, and tests.
- Create `frontend/src/features/skill-sources/SkillMarketplace.tsx`, `SkillSourceCard.tsx`, `SkillSourceSearch.tsx`, `PermissionReviewDialog.tsx`, and workflow tests.
- Create `frontend/src/features/skill-routes/SkillRouteBrowser.tsx`, `SkillRouteDetails.tsx`, `SkillRoutePicker.tsx`, `skillRoutesApi.ts`, `types.ts`, and tests.
- Create `frontend/src/features/mission-control/MissionControlPage.tsx`, `MissionTimeline.tsx`, `AgentRoster.tsx`, `BudgetPanel.tsx`, and tests.
- Create `frontend/src/shared/api/cockpitApi.ts`, `providerConfigApi.ts`, `workspacesApi.ts`, `gitApi.ts`, plus Tauri and preview invoke tests.
- Expand `frontend/src/shared/types/core.ts` or split feature contracts into local `types.ts` files where ownership is clearer.
- Update `frontend/src/i18n/en.json` and `frontend/src/i18n/fr.json` for all visible strings.

### Docs And Scripts

- Modify `docs/roadmap.md`: add this phase plan and make `docs/PLAN.md` explicitly aspirational if kept.
- Keep `docs/PLAN.md` untracked unless the product owner explicitly asks to add it.
- Continue using `scripts/test-app.bat --quality` as the Windows/Docker end-to-end gate.

---

## Milestone 0: Frontend Framework And Design System

**Goal:** Adopt a real UI framework and codify the AgenticCrew interaction model before adding more screens.

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/queryClient.ts`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/shared/ui/theme.ts`
- Create: `frontend/src/shared/ui/AgenticCrewProvider.tsx`
- Create: `frontend/src/shared/ui/EmptyState.tsx`
- Create: `frontend/src/shared/ui/LoadState.tsx`
- Create: `frontend/src/shared/ui/StatusBadge.tsx`
- Create: `frontend/src/shared/ui/CommandPalette.tsx`
- Modify: `frontend/src/app/App.test.tsx`

- [ ] **Step 1: Add framework dependencies**

Install:

```powershell
npm install -w frontend @mantine/core @mantine/hooks @mantine/form @mantine/notifications @tabler/icons-react @tanstack/react-router @tanstack/react-query
```

Expected `frontend/package.json` dependency additions:

```json
{
  "@mantine/core": "^8",
  "@mantine/form": "^8",
  "@mantine/hooks": "^8",
  "@mantine/notifications": "^8",
  "@tabler/icons-react": "^3",
  "@tanstack/react-query": "^5",
  "@tanstack/react-router": "^1"
}
```

- [ ] **Step 2: Add AgenticCrew provider**

Create `frontend/src/shared/ui/AgenticCrewProvider.tsx`:

```tsx
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { agenticCrewTheme } from "./theme";

type AgenticCrewProviderProps = Readonly<{
  children: ReactNode;
}>;

export function AgenticCrewProvider({ children }: AgenticCrewProviderProps) {
  return (
    <MantineProvider defaultColorScheme="dark" theme={agenticCrewTheme}>
      <Notifications position="bottom-right" />
      {children}
    </MantineProvider>
  );
}
```

- [ ] **Step 3: Define product theme**

Create `frontend/src/shared/ui/theme.ts` with Mantine tokens matching AgenticCrew, not Mantine defaults:

```ts
import { createTheme } from "@mantine/core";

export const agenticCrewTheme = createTheme({
  primaryColor: "teal",
  defaultRadius: 4,
  fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
  fontFamilyMonospace: "Cascadia Code, SFMono-Regular, Consolas, monospace",
  colors: {
    graphite: [
      "#f2f7f5",
      "#d8e2df",
      "#b9c8c3",
      "#91a39e",
      "#6f827d",
      "#556964",
      "#40534f",
      "#2d3f3c",
      "#1d2b29",
      "#121c1b"
    ]
  },
  components: {
    Button: {
      defaultProps: {
        size: "xs",
        variant: "light"
      }
    },
    Table: {
      defaultProps: {
        highlightOnHover: true,
        withColumnBorders: false
      }
    }
  }
});
```

- [ ] **Step 4: Add Query provider**

Create `frontend/src/app/queryClient.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5_000
    }
  }
});
```

Wrap the app in `QueryClientProvider` and `AgenticCrewProvider` from `main.tsx`.

- [ ] **Step 5: Add design-system acceptance tests**

Update `App.test.tsx` so rendering still works under Mantine and Query providers. Add one assertion that a Mantine-rendered nav action remains accessible by role and name.

- [ ] **Step 6: Browser QA**

Use the in-app browser at `http://127.0.0.1:5173/`:

- Confirm the app still opens.
- Confirm topbar actions are keyboard-focusable.
- Confirm no text clipping at desktop width.
- Confirm no console errors.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
npm run test -w frontend
npm run typecheck -w frontend
npm run lint -w frontend
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add frontend/package.json frontend/package-lock.json frontend/src
git commit -m "feat: adopt frontend app framework"
```

---

## Milestone 1: Product Shell And Route Architecture

**Goal:** Split the current monolithic `App.tsx` so future views do not pile into one file and move navigation to TanStack Router.

**Files:**
- Modify: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/AppShell.tsx`
- Create: `frontend/src/app/appRoutes.ts`
- Create: `frontend/src/app/useAppBootstrap.ts`
- Create: `frontend/src/app/routes/workspacePicker.tsx`
- Create: `frontend/src/app/routes/cockpit.$workspaceId.tsx`
- Create: `frontend/src/app/routes/missionControl.tsx`
- Create: `frontend/src/app/routes/skills.index.tsx`
- Create: `frontend/src/app/routes/skills.$sourceId.tsx`
- Create: `frontend/src/app/routes/skills.$sourceId.$skillId.tsx`
- Create: `frontend/src/app/routes/settings.tsx`
- Create: `frontend/src/app/routes/git.$workspaceId.tsx`
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

Create route ids in `frontend/src/app/appRoutes.ts`:

```ts
export const routes = {
  cockpit: "/workspaces/$workspaceId/cockpit",
  git: "/workspaces/$workspaceId/git",
  missionControl: "/mission-control",
  settings: "/settings",
  skillDetail: "/skills/$sourceId/$skillId",
  skillSource: "/skills/$sourceId",
  skills: "/skills",
  workspacePicker: "/"
} as const;
```

TanStack Router should own navigation; local component state should not be the route source of truth.

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
  activeWorkspaceId?: string;
  budgetLabel: string;
  statusLabel: string;
  children: React.ReactNode;
}>;
```

Render Mantine `AppShell`, `NavLink`, and topbar actions in `AppShell`, not in `App.tsx`.

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

## Milestone 5: Multi-Agent Supervision Console

**Goal:** Make it practical to see what every agent is doing, why it is doing it, what it changed, and where the run is blocked.

**Files:**
- Create: `src-tauri/src/core/agent_events.rs`
- Modify: `src-tauri/src/core/state.rs`
- Modify: `src-tauri/src/core/cockpit.rs`
- Modify: `src-tauri/src/core/mission_control.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `frontend/src/features/supervision/AgentRosterRail.tsx`
- Create: `frontend/src/features/supervision/RunTimeline.tsx`
- Create: `frontend/src/features/supervision/LiveActivityFeed.tsx`
- Create: `frontend/src/features/supervision/CheckpointBoard.tsx`
- Create: `frontend/src/features/supervision/HumanGateInbox.tsx`
- Create: `frontend/src/features/supervision/ArtifactEvidencePanel.tsx`
- Create: `frontend/src/features/supervision/supervisionApi.ts`
- Create: `frontend/src/features/supervision/types.ts`

- [ ] **Step 1: Add agent event DTO**

Create an append-only event record:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentEvent {
    pub id: String,
    pub session_id: String,
    pub agent_id: String,
    pub created_at: String,
    pub kind: AgentEventKind,
    pub severity: AgentEventSeverity,
    pub summary: String,
    pub tool_name: Option<String>,
    pub artifact_refs: Vec<String>,
}
```

Kinds must include `thought`, `message`, `tool_call`, `file_change`, `test_run`, `checkpoint`, `gate_request`, `error`, `git`, and `artifact`.

- [ ] **Step 2: Add supervision snapshot**

Expose:

```rust
supervision_snapshot(workspace_id: String) -> SupervisionSnapshot
```

It returns agent roster rows, recent events, checkpoint board columns, open human gates, artifacts, cost totals, and active git context.

- [ ] **Step 3: Add frontend supervision surfaces**

Build Mantine-based panes:

- Agent roster rail.
- Live activity feed with filter chips.
- Run timeline.
- Checkpoint board.
- Human gate inbox.
- Artifact/evidence panel.

The cockpit central area should support tabs: `Activity`, `Agent Terminals`, `Graph`, `Artifacts`, `Git`, `Costs`.

- [ ] **Step 4: Add live update strategy**

Use TanStack Query polling every 2 seconds for v1. Record a follow-up to switch high-frequency event streams to Tauri events when execution starts streaming.

- [ ] **Step 5: Test practical visibility**

Add tests proving:

- Every agent row shows current task/status/model.
- Tool calls can be filtered.
- Human gate inbox shows pending gates.
- Artifact panel links evidence to an agent/session.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src/features/supervision frontend/src/features/cockpit frontend/src/shared
git commit -m "feat: add multi-agent supervision console"
```

---

## Milestone 6: Git Interface V1

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

## Milestone 7: Skill Route Index And Loader

**Goal:** Make every skill addressable by a stable URI that Rust can parse, search, resolve, load, permission-check, and attach to agents.

**Files:**
- Create: `src-tauri/src/core/skill_uri.rs`
- Create: `src-tauri/src/core/skill_catalog.rs`
- Create: `src-tauri/src/core/skill_loader.rs`
- Create: `src-tauri/src/core/skill_search.rs`
- Modify: `src-tauri/src/core/skills.rs`
- Modify: `src-tauri/src/core/skill_manifest.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `frontend/src/shared/types/core.ts`
- Create: `frontend/src/features/skill-routes/SkillRouteBrowser.tsx`
- Create: `frontend/src/features/skill-routes/SkillRouteDetails.tsx`
- Create: `frontend/src/features/skill-routes/SkillRoutePicker.tsx`
- Create: `frontend/src/features/skill-routes/skillRoutesApi.ts`
- Create: `frontend/src/features/skill-routes/types.ts`

- [ ] **Step 1: Add `SkillUri` parser**

Support:

```text
agenticcrew://skills/{sourceId}/{skillSlug}
skill://{sourceId}/{skillSlug}
```

Normalize aliases to canonical `agenticcrew://skills/...`. Reject empty segments, `..`, path separators, uppercase instability, and malformed schemes.

- [ ] **Step 2: Expand skill manifest metadata**

Add manifest fields:

```ts
type SkillManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  version?: string;
  tags: string[];
  entrypoint: { kind: "markdown"; relativePath: string };
  permissions: RequestedPermissionPolicy;
  search: { title: string; summary: string; keywords: string[] };
};
```

Invalid manifests must not enter the catalog.

- [ ] **Step 3: Add catalog snapshot**

Expose:

```rust
skill_catalog_snapshot() -> SkillCatalogSnapshot
```

Each entry includes route, source provenance, manifest, load state, validation errors, activation status, and permission status.

- [ ] **Step 4: Add resolver and loader**

Expose:

```rust
skill_resolve(uri: String) -> SkillCatalogEntry
skill_load(uri: String) -> LoadedSkill
```

`skill_load` must ensure the resolved file stays inside the source cache root and that inactive or untrusted sources cannot be loaded for execution.

- [ ] **Step 5: Add search**

Expose:

```rust
skill_search(request: SkillSearchRequest) -> SkillSearchResponse
```

Search fields: name, description, tags, source id, route, and body excerpt.

- [ ] **Step 6: Add per-skill activation**

Add:

```rust
skill_activate(uri: String)
skill_deactivate(uri: String)
```

Source activation means a trusted package is available. Skill activation means this exact skill may be offered to agents.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src/features/skill-routes frontend/src/shared
git commit -m "feat: add route-addressable skill catalog"
```

---

## Milestone 8: Skill Marketplace And Source Management

**Goal:** Replace the raw Skill Sources page with a marketplace-style manager for registering, syncing, inspecting, approving, activating, routing, loading, and searching skills.

**Files:**
- Modify: `src-tauri/src/core/skills.rs`
- Modify: `src-tauri/src/core/skill_catalog.rs`
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

Tests must prove `register_github_skill_source`, `sync_github_skill_source`, `inspect_cached_skill_source`, `approve_skill_source_permissions`, `activate_skill_source`, `skill_search`, `skill_resolve`, and `skill_load` receive args.

- [ ] **Step 2: Add marketplace search model**

For v1, marketplace search is local:

- Bundled known sources.
- Registered external sources.
- Discovered skills from cached manifests.

No remote untrusted package search before permission policy is clear.

- [ ] **Step 3: Build modern workflow UI**

User flow:

1. Search skill routes and sources.
2. Register GitHub source with URL/ref.
3. Sync source.
4. Inspect manifests.
5. Review source and skill-level requested permissions.
6. Approve permissions.
7. Activate source.
8. Activate selected skill routes.
9. Attach active skill routes to an agent template or run.

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
- route loaded
- route blocked

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

## Milestone 9: Modern Mission Control And Real Metrics

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

## Milestone 10: Product Power Features

**Goal:** Add the practical features that make AgenticCrew better than a basic multi-agent dashboard.

**Files:**
- Create: `frontend/src/features/command-palette/CommandPalette.tsx`
- Create: `frontend/src/features/artifacts/ArtifactPanel.tsx`
- Create: `frontend/src/features/diffs/DiffReviewCenter.tsx`
- Create: `frontend/src/features/agents/AgentTemplateLibrary.tsx`
- Create: `frontend/src/features/safety/SafetyCenter.tsx`
- Create: `frontend/src/features/replay/RunReplay.tsx`
- Modify: `src-tauri/src/core/agent_events.rs`
- Modify: `src-tauri/src/core/permissions.rs`
- Modify: `src-tauri/src/core/state.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add command palette**

Global command palette routes to:

- Workspaces.
- Agents.
- Skill routes.
- Git panel.
- Mission Control.
- Settings.
- Pending gates.
- Recent artifacts.

Use Mantine Combobox or Spotlight-like composition.

- [ ] **Step 2: Add artifact and diff center contracts**

Artifacts include:

- File paths.
- Patches/diffs.
- Screenshots.
- Logs.
- Test reports.
- PR descriptions.
- Generated docs.

Each artifact links to workspace, session, agent, checkpoint, and source event.

- [ ] **Step 3: Add agent template library**

Agent templates store:

- Role.
- System prompt.
- Model/provider.
- Skill routes.
- Tool permissions.
- Budget caps.
- Memory scope.

Templates must be Rust-owned durable records.

- [ ] **Step 4: Add safety center**

Safety Center surfaces:

- Global budget caps.
- Per-workspace filesystem boundary.
- Network allowlist.
- Git/docker/command permissions.
- Active risky gates.
- Kill/pause controls.

- [ ] **Step 5: Add run replay**

Run replay reads stored `AgentEvent` records and reconstructs a timeline without re-running agents.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm run coverage -w frontend
scripts\test-app.bat --quality
```

Commit:

```bash
git add src-tauri/src frontend/src/features frontend/src/shared
git commit -m "feat: add agent operations power features"
```

---

## Milestone 11: Polish, Integration, And Roadmap Cleanup

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
- The app uses Mantine, Tabler Icons, TanStack Router, and TanStack Query for the main app framework.
- The user can see what every agent is doing through roster, timeline, activity feed, checkpoint board, gates, and artifacts.
- Mission Control is a modern management view with real sessions, checkpoints, costs, provider/model, skills, and git summaries.
- Skill Sources becomes a marketplace-like manager with search, registration, sync, inspection, permission review, route loading, and activation.
- Every loadable skill has a canonical `agenticcrew://skills/{sourceId}/{skillSlug}` route and optional `skill://...` alias.
- Agents store and receive skill routes, not local file paths.
- Git status is visible per workspace.
- Command palette can jump to workspace, agent, skill, route, git, settings, gates, and artifacts.
- Artifact and diff review surfaces show what agents changed before handoff.
- Safety Center exposes budgets, filesystem boundaries, network allowlists, command/git/docker permissions, and pause/kill controls.
- Run Replay can reconstruct completed or failed work from stored events.
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
