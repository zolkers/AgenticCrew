# Product Routes Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace view-state navigation with durable product routes and add first-class skeleton surfaces for Git, settings, skill marketplace, harness library, and agent training.

**Architecture:** Keep Rust-backed snapshots flowing through the existing `App` props while React owns only rendering and navigation. Introduce small route/view types first, then use them to render route-like paths and page shells without changing backend contracts.

**Tech Stack:** React 19, Mantine, TanStack Router dependency foundation, lucide-react icons, Vitest, Testing Library, Docker-backed npm scripts.

---

### Task 1: Route Model And Navigation

**Files:**
- Modify: `frontend/src/app/App.tsx`
- Modify: `frontend/src/app/App.test.tsx`

- [ ] Add product view ids for cockpit, mission, skills, marketplace, harnesses, agents, git, and settings.
- [ ] Make workspace launchpad selection enter a workspace path-like state.
- [ ] Add icon nav buttons for the new pages.
- [ ] Update tests to prove workspace selection and page switching.

### Task 2: Product Page Skeletons

**Files:**
- Create: `frontend/src/features/git/GitPanel.tsx`
- Create: `frontend/src/features/settings/SettingsPanel.tsx`
- Modify: `frontend/src/features/skill-sources/SkillSources.tsx`
- Modify: `frontend/src/features/harnesses/HarnessStudio.tsx`
- Modify: `frontend/src/features/agents/AgentStudio.tsx`
- Modify: `frontend/src/app/App.css`

- [ ] Add a Git surface with branch/status/PR placeholders sourced from workspace preview data.
- [ ] Add a Settings surface for OpenAI model/API-key connection state.
- [ ] Add marketplace language and route display for skills.
- [ ] Keep visible text concise and lean on icons where practical.

### Task 3: Verification And Commit

**Files:**
- Modify: `package-lock.json` only if dependency changes are needed.

- [ ] Run `npm run lint -w frontend` in Docker.
- [ ] Run `npm run typecheck -w frontend` in Docker.
- [ ] Run `npm run test -w frontend` in Docker.
- [ ] Run `npm run build -w frontend` in Docker.
- [ ] Run `npm run desktop:test` in Docker.
- [ ] Commit with a conventional commit and push `dev`.
