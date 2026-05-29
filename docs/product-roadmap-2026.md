# AgenticCrew Product Roadmap 2026

## Thesis

AgenticCrew should stop trying to look like a generic "agent studio" and become a local-first command center for shipping software work with AI agents.

The core promise is simple:

> Give the app a real repo task. It creates an isolated run, gathers context, executes with visible evidence, produces a diff/PR-ready result, and lets the user steer or stop it at any point.

Anything that does not improve that loop is secondary.

## External Product Signals

Research date: 2026-05-30.

- OpenAI Codex emphasizes cloud/background software engineering tasks, parallel isolated environments, tests, code changes, and PR review as the delivery loop: [Introducing Codex](https://openai.com/index/introducing-codex/) and [Codex product page](https://openai.com/codex/).
- GitHub Copilot coding agent is issue/PR-native: it creates branches, commits, opens PRs, writes PR descriptions, and keeps iteration inside the PR workflow: [GitHub Docs](https://docs.github.com/en/copilot/using-github-copilot/coding-agent/about-assigning-tasks-to-copilot).
- Cursor and Windsurf push agent modes that read/edit across files, run commands, use checkpoints, memory/rules, and background agents: [Cursor Agent overview](https://docs.cursor.com/en/agent/overview), [Cursor concepts](https://docs.cursor.com/get-started/concepts), [Windsurf Cascade](https://docs.windsurf.com/windsurf/cascade), [Windsurf memories](https://docs.windsurf.com/windsurf/cascade/memories).
- JetBrains Junie leans into controllable multi-step coding inside the IDE, and highlights debugger/runtime integration as a differentiator: [Junie docs](https://www.jetbrains.com/help/ai-assistant/junie-agent.html), [Junie product page](https://junie.jetbrains.com/), [JetBrains Junie blog](https://blog.jetbrains.com/junie/2025/05/what-s-next-for-junie-building-a-smart-and-controllable-ai-coding-agent/).
- Claude Code's ecosystem points toward context files, skills, hooks, MCP, subagents, permissions, and worktree isolation as the real platform surface: [Claude Code features overview](https://code.claude.com/docs/en/features-overview), [Anthropic hooks docs](https://docs.anthropic.com/en/docs/claude-code/hooks), [MCP docs](https://docs.claude.com/claude/docs/mcp).
- Early empirical work says agentic PRs are already common, but success depends on task type, reviewability, testing, and collaboration flow. Documentation/CI/build/refactor tasks fare better than ambiguous bug/performance work: [Agentic Much?](https://arxiv.org/abs/2601.18341), [Failed Agentic PRs](https://arxiv.org/abs/2601.15195), [Agentic Coding PR Study](https://arxiv.org/abs/2509.14745).

## What People Actually Need

Users do not need a beautiful agent config museum. They need:

1. **Trust before autonomy.**
   They need to know what the agent changed, why, which commands ran, which files moved, and whether tests passed.

2. **A useful delivery artifact.**
   The product should produce a diff, patch, branch, PR, migration note, test report, or review comment. A chat transcript alone is not enough.

3. **Isolation by default.**
   Every run should happen in a branch/worktree/sandbox with rollback, not directly in the active working tree.

4. **Low-friction context.**
   The app should understand repo rules, docs, branches, tests, recent commits, issue text, and user instructions without repeated manual setup.

5. **Control surfaces, not dashboards.**
   Pause, resume, stop, approve risky action, retry failed command, ask for plan, inspect diff, send follow-up.

6. **Fast review loop.**
   The user should be able to scan changed files, see tests/evidence, request fixes, and ship.

7. **Permission and secret safety.**
   MCP/tools/hooks/providers are powerful and dangerous. Permission gates, allowlists, tool logs, secret redaction, and workspace boundaries are required product features.

8. **Parallelism when it is useful.**
   Multiple agents matter for isolated tasks, competing hypotheses, code review, security review, docs, tests, and refactors. Multi-agent hierarchy is less important than clean orchestration and review.

## Product Kill List

Remove or hide these until they are real:

- Fake training/evaluation lanes without real datasets, real runs, or useful comparison output.
- Agent reliability scores without statistically meaningful history.
- Generic "agent team hierarchy" screens before a real run engine exists.
- Manual route text blobs as the primary UX for skills/harnesses.
- Dashboards with preview values not backed by durable state or live streams.
- Provider/model complexity before the first end-to-end coding run works.
- Cloud migration work before local execution, evidence, and review are solid.

## North Star UX

AgenticCrew should feel like a mix of Codex, IntelliJ, and a mission control terminal:

- **Left rail:** workspaces, active runs, branches/worktrees, agents.
- **Center:** terminal/log/diff area, switchable between Run, Diff, Files, Tests, Plan.
- **Right panel:** selected agent/run context, approvals, evidence, cost, tools, follow-up instructions.
- **Bottom command bar:** global command input with slash commands and shortcuts.

The default screen should not be a dashboard. It should be a runnable workbench:

1. Select workspace.
2. Enter task or import issue.
3. Choose execution profile.
4. Start isolated run.
5. Watch plan/events/diff/tests.
6. Review and merge/export.

## Roadmap Overview

### Phase 0 — Brutal Product Reset

Goal: remove confusing promises and make the app honest.

Scope:
- Rename "Agent Studio" mental model to "Agent Profiles": prompt, model, skills, harness, budget.
- Rename "Harness Studio" mental model to "Execution Policy": safety, permissions, validation, output style.
- Keep Skill Sources, but make routes mostly invisible behind pickers.
- Remove fake runtime/training/eval metrics from primary screens.
- Mark preview-only data clearly or delete it.
- Add a single "Start run" path as the product center.

Acceptance:
- A new user understands what an agent profile is in under one minute.
- No page suggests a capability that does not exist.
- Cockpit shows a clear next action: start or resume real work.

### Phase 1 — Worktree Run Engine

Goal: one real local coding run, end to end.

Scope:
- Create isolated worktree/branch per run.
- Attach selected workspace, branch, agent profile, execution policy, provider, and task.
- Persist run state in Rust.
- Stream events to the UI.
- Run shell commands through controlled Rust command contracts.
- Save every tool call, command, file edit summary, and failure.
- Allow stop/resume/retry.

Acceptance:
- User can start a run from a task prompt.
- Run executes in an isolated worktree.
- UI shows live status and terminal/events.
- Stopping a run leaves a recoverable record.
- No uncontrolled shell mutation happens outside the run workspace.

### Phase 2 — Diff And Review First

Goal: make the result reviewable, not just conversational.

Scope:
- Add changed-files tree.
- Add unified diff viewer.
- Add per-file summary generated from actual diff.
- Add test/evidence strip per file or run.
- Add "request changes" follow-up loop.
- Add export patch / open external editor / copy PR summary.
- Add revert file / revert run.

Acceptance:
- User can review all changes without leaving AgenticCrew.
- Every changed file has provenance: why it changed and which command/test validates it.
- User can ask the agent to revise a selected file or whole run.

### Phase 3 — Real Git Workflow

Goal: make Git the delivery backbone.

Scope:
- Real branch discovery.
- Checkout/create branch.
- Pull/fetch status.
- Commit composer from actual diff.
- Push.
- Open PR using GitHub integration or URL fallback.
- PR description generated from evidence.
- PR review mode for AI reviewer agents.

Acceptance:
- User can go from task to local commit.
- If remote is configured, user can go from task to PR.
- PR body includes commands run, test results, files changed, risks, and follow-ups.

### Phase 4 — Context Compiler

Goal: stop asking users to repeat repo context.

Scope:
- Discover `README`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.windsurf/rules`, package manifests, test commands, lint commands, docs.
- Compile a run context bundle.
- Show exactly what context is included.
- Allow include/exclude.
- Cache context by repo and invalidate intelligently.
- Add "repo briefing" view.

Acceptance:
- Starting a run automatically includes repo instructions and likely verification commands.
- User can inspect and adjust context before launch.
- Agent can explain which context shaped its plan.

### Phase 5 — Safety Center

Goal: make powerful tools safe enough to use.

Scope:
- Permission profiles: strict, balanced, autonomous.
- Tool allowlists/denylists by workspace.
- Secret redaction in logs and prompts.
- Dangerous action confirmations for delete, move, network, env, secrets, push, publish.
- MCP/server risk inspection.
- Hook audit log.
- Workspace boundary enforcement.

Acceptance:
- Every tool call has a permission decision.
- Risky actions are gated and visible.
- Logs are useful without leaking secrets.

### Phase 6 — Execution Policies And Skills That Matter

Goal: make skills/harnesses useful at run time.

Scope:
- Skills become runnable workflows or context packs, not just route labels.
- Execution policy determines planning style, verification gates, permissions, and output format.
- Effective prompt preview shows agent profile + selected skills + policy + repo context.
- Skill install/update flow includes provenance and permissions.
- Skill picker replaces manual route editing.

Acceptance:
- User can see exactly what will be injected into a run.
- Skills and policies alter behavior in observable ways.
- External skills are never active without validation and approval.

### Phase 7 — Multi-Agent Where It Pays

Goal: use multiple agents for review and parallelism, not theater.

Scope:
- Spawn isolated reviewers after implementation: code review, test review, security review, docs review.
- Spawn competing debug hypotheses in separate worktrees.
- Compare outputs side by side.
- Merge chosen result or request synthesis.
- Keep "manager/CEO" optional, not default.

Acceptance:
- Multi-agent mode produces parallel artifacts that can be compared.
- User can see which agent changed what.
- No uncontrolled cross-agent mutation in the same worktree.

### Phase 8 — Runtime Debugging

Goal: beat plain chat by using actual runtime state.

Scope:
- Test failure parser.
- Debug sessions for supported stacks.
- Log instrumentation suggestions.
- Command replay.
- Failure timeline.
- "Why did this fail?" mode based on real outputs.

Acceptance:
- Failed tests produce actionable diagnosis.
- User can jump from failure to file/diff/command.
- Agent can retry with evidence, not guesswork.

### Phase 9 — Memory And Project Knowledge

Goal: durable knowledge without magical black boxes.

Scope:
- Workspace memory as editable facts/rules.
- Run summaries saved after completion.
- User-approved memories only.
- Team-shared rules exportable to repo files.
- Searchable run history.

Acceptance:
- User can see, edit, delete, and export memories.
- Agent can cite which memory it used.
- No silent hidden "learning" that changes behavior unpredictably.

### Phase 10 — Packaging And First-Run Experience

Goal: make the desktop app usable by someone who did not build it.

Scope:
- Native menus.
- First workspace onboarding.
- Provider key setup with secure storage.
- Local dependency checks.
- Docker Desktop status detection.
- Update strategy.
- Crash/log export.

Acceptance:
- Fresh install can reach first run without reading docs.
- Missing Docker/Git/Node/Rust/provider key states are explained and recoverable.
- Quality gate script works from a clean clone.

### Phase 11 — Collaboration And Cloud Later

Goal: only after local trust loop works.

Scope:
- Remote run workers.
- Shared run links.
- Team policy packs.
- Org-level permission policies.
- Hosted secrets.
- PR/issue automation.

Acceptance:
- Cloud adds reach and collaboration, not a replacement for missing local basics.

## UI Redesign Implications

The app should pivot from "many studios" to "one workbench with supporting panels".

### Keep As Primary

- Cockpit / Workbench.
- Runs.
- Diff Review.
- Git.
- Evidence.
- Terminal.

### Move To Secondary Settings

- Agent Profiles.
- Execution Policies.
- Skill Sources.
- Provider Registry.
- Workspace Settings.

### Remove From Top-Level Navigation For Now

- Any training/evaluation area that is not backed by real run comparison.
- Decorative dashboard cards.
- Static preview metrics.

## Immediate Next Sprint

1. Rename `Cockpit` UX to `Workbench` internally or visually.
2. Add `Runs` domain in Rust: run id, workspace id, task, status, branch/worktree path, agent profile id, policy id, timestamps.
3. Add `Start run` UI from cockpit.
4. Add run event stream placeholder backed by durable event log.
5. Add controlled command execution contract with audit records.
6. Add basic changed-files detection for a run worktree.
7. Add diff viewer.
8. Move Agent/Harness/Skills from top nav into a "Profiles & Policies" section.
9. Delete or hide all preview-only runtime metrics.
10. Add onboarding checklist: workspace, provider, repo context, first run.

## Non-Negotiables

- Local-first remains the trust advantage.
- Rust owns product truth.
- React renders snapshots and dispatches commands only.
- Every run is isolated.
- Every claim needs evidence.
- Every risky tool action needs a permission path.
- Every result should be reviewable as a diff or artifact.

