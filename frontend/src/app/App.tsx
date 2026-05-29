import { useEffect, useState, type ReactNode } from "react";
import { MantineProvider, Tooltip } from "@mantine/core";
import {
  Bot,
  Brain,
  ChevronRight,
  FolderKanban,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  Store,
  Route,
  Settings2,
  SlidersHorizontal,
  Plus
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AgentStudio } from "../features/agents/AgentStudio";
import { GitPanel } from "../features/git/GitPanel";
import { HarnessStudio } from "../features/harnesses/HarnessStudio";
import { MissionControl } from "../features/mission-control/MissionControl";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { SkillSources } from "../features/skill-sources/SkillSources";
import { loadAgentStudioSnapshot, type InvokeAgentStudio } from "../shared/api/agentStudioApi";
import { loadHarnessStudioSnapshot, type InvokeHarnessStudio } from "../shared/api/harnessStudioApi";
import { loadMissionControlSnapshot, type InvokeMissionControl } from "../shared/api/missionControlApi";
import { previewWorkspaceInvoke } from "../shared/api/previewInvokes";
import { loadSettingsSnapshot, type InvokeSettings } from "../shared/api/settingsApi";
import { loadSkillSourcesSnapshot, type InvokeSkillSources } from "../shared/api/skillSourcesApi";
import {
  createWorkspace as createWorkspaceRecord,
  loadWorkspaceSnapshot,
  updateWorkspaceGitContext,
  updateWorkspaceLoadout,
  type InvokeWorkspace
} from "../shared/api/workspaceApi";
import type { CockpitWorkspace } from "../shared/preview/cockpitData";
import type {
  AgentStudioSnapshot,
  AgentTemplate,
  CreateWorkspaceRequest,
  HarnessStudioSnapshot,
  HarnessProfile,
  MissionControlSnapshot,
  SettingsSnapshot,
  SkillSourcesSnapshot,
  WorkspaceSnapshot
} from "../shared/types/core";
import "../i18n";
import "./App.css";

type AppProps = Readonly<{
  agentStudioInvoke: InvokeAgentStudio;
  harnessStudioInvoke: InvokeHarnessStudio;
  missionControlInvoke: InvokeMissionControl;
  settingsInvoke: InvokeSettings;
  skillSourcesInvoke: InvokeSkillSources;
  workspaceInvoke?: InvokeWorkspace;
}>;

type AppLoadState =
  | Readonly<{ status: "error" }>
  | Readonly<{
      missionControlSnapshot: MissionControlSnapshot;
      agentStudioSnapshot: AgentStudioSnapshot;
      harnessStudioSnapshot: HarnessStudioSnapshot;
      skillSourcesSnapshot: SkillSourcesSnapshot;
      settingsSnapshot: SettingsSnapshot;
      status: "ready";
      workspaceSnapshot: WorkspaceSnapshot;
    }>
  | Readonly<{ status: "loading" }>;

type AppView =
  | "agentStudio"
  | "cockpit"
  | "gitPanel"
  | "harnessStudio"
  | "missionControl"
  | "settings"
  | "skillSources";

type AppRouteState = Readonly<{
  view: AppView;
  workspaceId: null | string;
}>;

const routeSegmentByView: Record<AppView, string> = {
  agentStudio: "agents",
  cockpit: "cockpit",
  gitPanel: "git",
  harnessStudio: "harnesses",
  missionControl: "mission",
  settings: "settings",
  skillSources: "skills"
};

const viewByRouteSegment: Record<string, AppView> = {
  agents: "agentStudio",
  cockpit: "cockpit",
  git: "gitPanel",
  harnesses: "harnessStudio",
  mission: "missionControl",
  settings: "settings",
  skills: "skillSources"
};

export function App({
  agentStudioInvoke,
  harnessStudioInvoke,
  missionControlInvoke,
  settingsInvoke,
  skillSourcesInvoke,
  workspaceInvoke = previewWorkspaceInvoke
}: AppProps) {
  const [loadState, setLoadState] = useState<AppLoadState>({ status: "loading" });
  const [routeState, setRouteState] = useState<AppRouteState>(() => resolveInitialRoute());
  const { t } = useTranslation();
  const activeView = routeState.view;
  const activeWorkspaceId = routeState.workspaceId;

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      loadMissionControlSnapshot(missionControlInvoke),
      loadSkillSourcesSnapshot(skillSourcesInvoke),
      loadHarnessStudioSnapshot(harnessStudioInvoke),
      loadAgentStudioSnapshot(agentStudioInvoke),
      loadSettingsSnapshot(settingsInvoke),
      loadWorkspaceSnapshot(workspaceInvoke)
    ])
      .then(
        ([
          missionControlSnapshot,
          skillSourcesSnapshot,
          harnessStudioSnapshot,
          agentStudioSnapshot,
          settingsSnapshot,
          workspaceSnapshot
        ]) => {
        if (isCurrent) {
          setLoadState({
            agentStudioSnapshot,
            harnessStudioSnapshot,
            missionControlSnapshot,
            settingsSnapshot,
            skillSourcesSnapshot,
            workspaceSnapshot,
            status: "ready"
          });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoadState({ status: "error" });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    agentStudioInvoke,
    harnessStudioInvoke,
    missionControlInvoke,
    settingsInvoke,
    skillSourcesInvoke,
    workspaceInvoke
  ]);

  if (loadState.status === "error") {
    return <p role="alert">{t("missionControl.loadError", { defaultValue: "Mission Control unavailable" })}</p>;
  }

  if (loadState.status === "loading") {
    return <p>{t("missionControl.loading", { defaultValue: "Loading Mission Control" })}</p>;
  }

  const missionControlLabel = t("missionControl.title", { defaultValue: "Mission Control" });
  const skillSourcesLabel = t("skillSources.title", { defaultValue: "Skill Sources" });
  const harnessStudioLabel = "Harness Studio";
  const agentStudioLabel = "Agent Studio";
  const workspaces = loadState.workspaceSnapshot.workspaces;
  const workspacesById = Object.fromEntries(
    workspaces.map((workspace) => [workspace.id, workspace])
  ) as Record<string, CockpitWorkspace>;
  const activeWorkspace = activeWorkspaceId === null ? null : (workspacesById[activeWorkspaceId] ?? null);
  const openWorkspace = (workspaceId: string, view: AppView = "cockpit") => {
    setRouteState({ view, workspaceId });
    window.history.pushState(null, "", `/workspace/${workspaceId}/${routeSegmentByView[view]}`);
  };
  const openLaunchpad = () => {
    setRouteState({ view: "cockpit", workspaceId: null });
    window.history.pushState(null, "", "/workspaces");
  };
  const replaceWorkspaceSnapshot = (workspaceSnapshot: WorkspaceSnapshot) => {
    setLoadState({
      ...loadState,
      workspaceSnapshot
    });
  };
  const createWorkspace = async (request: CreateWorkspaceRequest) => {
    const workspaceSnapshot = await createWorkspaceRecord(workspaceInvoke, request);
    replaceWorkspaceSnapshot(workspaceSnapshot);
    openWorkspace(request.id);
  };

  if (activeWorkspace === null) {
    return (
      <MantineProvider defaultColorScheme="dark">
        <WorkspaceLaunchpad
          onWorkspaceCreate={(request) => {
            void createWorkspace(request);
          }}
          onWorkspaceSelect={(workspaceId) => {
            openWorkspace(workspaceId);
          }}
          workspaces={workspaces}
        />
      </MantineProvider>
    );
  }

  const openView = (view: AppView) => {
    openWorkspace(activeWorkspace.id, view);
  };
  const updateActiveWorkspace = async (changes: Pick<CockpitWorkspace, "branch" | "path">) => {
    const workspaceSnapshot = await updateWorkspaceGitContext(workspaceInvoke, {
      ...changes,
      workspaceId: activeWorkspace.id
    });
    replaceWorkspaceSnapshot(workspaceSnapshot);
  };
  const updateActiveLoadout = async (loadout: WorkspaceLoadout) => {
    const workspaceSnapshot = await updateWorkspaceLoadout(workspaceInvoke, {
      agentTemplateId: loadout.agentTemplateId,
      harnessProfileId: loadout.harnessProfileId,
      workspaceId: activeWorkspace.id
    });
    replaceWorkspaceSnapshot(workspaceSnapshot);
  };

  return (
    <MantineProvider defaultColorScheme="dark">
      <div className="app-shell">
      <nav aria-label={t("app.navigationLabel", { defaultValue: "Workspace navigation" })} className="topbar">
        <button
          aria-pressed={activeView === "cockpit"}
          className="brand-button"
          onClick={() => {
            openView("cockpit");
          }}
          type="button"
        >
          <span className="brand-mark" aria-hidden="true">
            AC
          </span>
          <span>
            <strong>AgenticCrew</strong>
            <small>Cockpit</small>
          </span>
        </button>
        <div className="topbar-workspace" aria-label="Active workspace">
          <span>{activeWorkspace.id}</span>
          <strong>{activeWorkspace.branch}</strong>
        </div>
        <div className="topbar-budget" aria-label="Budget status">
          <span>Budget</span>
          <strong>
            ${activeWorkspace.budgetUsedUsd.toFixed(2)} / ${activeWorkspace.budgetLimitUsd.toFixed(2)}
          </strong>
        </div>
        <button
          aria-label="Choose workspace"
          className="topbar-icon"
          onClick={() => {
            openLaunchpad();
          }}
          title="Choose workspace"
          type="button"
        >
          <FolderKanban aria-hidden="true" size={18} />
        </button>
      </nav>
      <div className="workspace-layout">
        <nav aria-label="Workspace sections" className="workspace-rail">
          <NavButton
            active={activeView === "missionControl"}
            icon={<LayoutDashboard aria-hidden="true" size={18} />}
            label={missionControlLabel}
            onClick={() => {
              openView("missionControl");
            }}
          />
          <NavButton
            active={activeView === "skillSources"}
            icon={<Store aria-hidden="true" size={18} />}
            label={skillSourcesLabel}
            onClick={() => {
              openView("skillSources");
            }}
          />
          <NavButton
            active={activeView === "harnessStudio"}
            icon={<Route aria-hidden="true" size={18} />}
            label={harnessStudioLabel}
            onClick={() => {
              openView("harnessStudio");
            }}
          />
          <NavButton
            active={activeView === "agentStudio"}
            icon={<Bot aria-hidden="true" size={18} />}
            label={agentStudioLabel}
            onClick={() => {
              openView("agentStudio");
            }}
          />
          <NavButton
            active={activeView === "gitPanel"}
            icon={<GitBranch aria-hidden="true" size={18} />}
            label="Git"
            onClick={() => {
              openView("gitPanel");
            }}
          />
          <NavButton
            active={activeView === "settings"}
            icon={<KeyRound aria-hidden="true" size={18} />}
            label="Settings"
            onClick={() => {
              openView("settings");
            }}
          />
        </nav>
      <main aria-label={t("app.mainLabel", { defaultValue: "Workspace" })} className="app-main">
        {activeView === "cockpit" ? (
          <Cockpit
            activeWorkspace={activeWorkspace}
            agentStudioSnapshot={loadState.agentStudioSnapshot}
            harnessStudioSnapshot={loadState.harnessStudioSnapshot}
            onLoadoutChange={(loadout) => {
              void updateActiveLoadout(loadout);
            }}
            onWorkspaceChange={openWorkspace}
            workspaces={workspaces}
          />
        ) : null}
        {activeView === "missionControl" ? (
          <MissionControl snapshot={loadState.missionControlSnapshot} />
        ) : null}
        {activeView === "skillSources" ? (
          <SkillSources snapshot={loadState.skillSourcesSnapshot} />
        ) : null}
        {activeView === "harnessStudio" ? (
          <HarnessStudio
            availableSkillRoutes={loadState.skillSourcesSnapshot.sources.flatMap((source) => source.discoveredSkills ?? [])}
            invoke={harnessStudioInvoke}
            onSnapshotChange={(harnessStudioSnapshot) => {
              setLoadState({
                ...loadState,
                harnessStudioSnapshot
              });
            }}
            snapshot={loadState.harnessStudioSnapshot}
          />
        ) : null}
        {activeView === "agentStudio" ? (
          <AgentStudio
            availableSkillRoutes={loadState.skillSourcesSnapshot.sources.flatMap((source) => source.discoveredSkills ?? [])}
            harnessSnapshot={loadState.harnessStudioSnapshot}
            invoke={agentStudioInvoke}
            modelOptions={loadState.settingsSnapshot.aiProvider.availableModels}
            onSnapshotChange={(agentStudioSnapshot) => {
              setLoadState({
                ...loadState,
                agentStudioSnapshot
              });
            }}
            snapshot={loadState.agentStudioSnapshot}
          />
        ) : null}
        {activeView === "gitPanel" ? (
          <GitPanel
            onWorkspaceChange={(changes) => {
              void updateActiveWorkspace(changes);
            }}
            workspace={activeWorkspace}
          />
        ) : null}
        {activeView === "settings" ? (
          <SettingsPanel
            invoke={settingsInvoke}
            onSnapshotChange={(settingsSnapshot) => {
              setLoadState({
                ...loadState,
                settingsSnapshot
              });
            }}
            snapshot={loadState.settingsSnapshot}
          />
        ) : null}
      </main>
      </div>
      </div>
    </MantineProvider>
  );
}

function resolveInitialRoute(): AppRouteState {
  const match = /^\/workspace\/([^/]+)(?:\/([^/]+))?/u.exec(window.location.pathname);

  if (match === null) {
    return { view: "cockpit", workspaceId: null };
  }

  const [, workspaceId, routeSegment = "cockpit"] = match;
  return {
    view: viewByRouteSegment[routeSegment] ?? "cockpit",
    workspaceId
  };
}

type NavButtonProps = Readonly<{
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}>;

function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <Tooltip label={label} position="bottom" withArrow>
      <button aria-pressed={active} className="topbar-tab" onClick={onClick} type="button">
        {icon}
        <span>{label}</span>
      </button>
    </Tooltip>
  );
}

type WorkspaceLaunchpadProps = Readonly<{
  onWorkspaceCreate: (request: CreateWorkspaceRequest) => void;
  onWorkspaceSelect: (workspaceId: string) => void;
  workspaces: readonly CockpitWorkspace[];
}>;

function WorkspaceLaunchpad({ onWorkspaceCreate, onWorkspaceSelect, workspaces }: WorkspaceLaunchpadProps) {
  const [branch, setBranch] = useState("main");
  const [mission, setMission] = useState("Start a new agent mission");
  const [name, setName] = useState("New Workspace");
  const [path, setPath] = useState("C:\\Users\\vriegert\\IdeaProjects");

  return (
    <main aria-labelledby="workspace-launchpad-title" className="workspace-launchpad">
      <header className="launchpad-header">
        <div className="launchpad-mark" aria-hidden="true">
          AC
        </div>
        <div>
          <p className="eyebrow">AgenticCrew</p>
          <h1 id="workspace-launchpad-title">Choose a workspace</h1>
          <p>Load agents, harnesses, skills, and Git context for the mission you want to run.</p>
        </div>
      </header>

      <form
        aria-label="Create workspace"
        className="workspace-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          onWorkspaceCreate({ branch, id: slugify(name), mission, name, path });
        }}
      >
        <label>
          <span>Workspace name</span>
          <input
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </label>
        <label>
          <span>Workspace path</span>
          <input
            onChange={(event) => {
              setPath(event.target.value);
            }}
            value={path}
          />
        </label>
        <label>
          <span>Branch</span>
          <input
            onChange={(event) => {
              setBranch(event.target.value);
            }}
            value={branch}
          />
        </label>
        <label>
          <span>Mission</span>
          <input
            onChange={(event) => {
              setMission(event.target.value);
            }}
            value={mission}
          />
        </label>
        <button disabled={slugify(name).length === 0} type="submit">
          <Plus aria-hidden="true" size={16} />
          <span>Create workspace</span>
        </button>
      </form>

      <section aria-label="Available workspaces" className="launchpad-grid">
        {workspaces.map((workspace) => {
          const budgetPercent = Math.round((workspace.budgetUsedUsd / workspace.budgetLimitUsd) * 100);

          return (
            <button
              className="launchpad-card"
              key={workspace.id}
              onClick={() => {
                onWorkspaceSelect(workspace.id);
              }}
              type="button"
            >
              <span className="launchpad-card-icon" aria-hidden="true">
                <FolderKanban size={22} />
              </span>
              <span className="launchpad-card-main">
                <strong>{workspace.name}</strong>
                <small>{workspace.id}</small>
              </span>
              <span className="launchpad-card-meta">
                <span>
                  <GitBranch aria-hidden="true" size={15} />
                  {workspace.branch}
                </span>
                <span>
                  <Brain aria-hidden="true" size={15} />
                  {workspace.agents.length} agents
                </span>
                <span>
                  <Settings2 aria-hidden="true" size={15} />
                  {budgetPercent}% budget
                </span>
              </span>
              <span className="launchpad-card-action">
                Open workspace
                <ChevronRight aria-hidden="true" size={18} />
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}

type CockpitProps = Readonly<{
  activeWorkspace: CockpitWorkspace;
  agentStudioSnapshot: AgentStudioSnapshot;
  harnessStudioSnapshot: HarnessStudioSnapshot;
  onLoadoutChange: (loadout: WorkspaceLoadout) => void;
  onWorkspaceChange: (workspaceId: string) => void;
  workspaces: readonly CockpitWorkspace[];
}>;

type WorkspaceLoadout = Readonly<{
  agentTemplateId: string;
  harnessProfileId: string;
}>;

function Cockpit({
  activeWorkspace,
  agentStudioSnapshot,
  harnessStudioSnapshot,
  onLoadoutChange,
  onWorkspaceChange,
  workspaces
}: CockpitProps) {
  const agentsById = Object.fromEntries(activeWorkspace.agents.map((agent) => [agent.id, agent])) as Record<
    string,
    CockpitWorkspace["agents"][number]
  >;
  const activeAgent = agentsById[activeWorkspace.activeAgentId];
  const agentTemplates = preferredActiveItems(agentStudioSnapshot.templates);
  const harnessProfiles = preferredActiveItems(harnessStudioSnapshot.profiles);
  const selectedAgentTemplateId =
    activeWorkspace.selectedAgentTemplateId ?? (agentTemplates.at(0)?.id ?? "");
  const selectedHarnessProfileId =
    activeWorkspace.selectedHarnessProfileId ?? (harnessProfiles.at(0)?.id ?? "");
  const selectedAgentTemplate = agentTemplates.find((template) => template.id === selectedAgentTemplateId);
  const selectedHarnessProfile = harnessProfiles.find((profile) => profile.id === selectedHarnessProfileId);
  const budgetPercent = Math.round((activeWorkspace.budgetUsedUsd / activeWorkspace.budgetLimitUsd) * 100);
  const updateLoadout = (next: Partial<WorkspaceLoadout>) => {
    onLoadoutChange({
      agentTemplateId: selectedAgentTemplateId,
      harnessProfileId: selectedHarnessProfileId,
      ...next
    });
  };

  return (
    <div className="cockpit-grid">
      <aside className="cockpit-sidebar" aria-label="Cockpit controls">
        <section aria-labelledby="workspace-selector-title">
          <h2 id="workspace-selector-title">Workspaces</h2>
          <div className="workspace-list">
            {workspaces.map((workspace) => (
              <button
                aria-pressed={workspace.id === activeWorkspace.id}
                className="workspace-card"
                key={workspace.id}
                onClick={() => {
                  onWorkspaceChange(workspace.id);
                }}
                type="button"
              >
                <span>{workspace.name}</span>
                <strong>{workspace.id}</strong>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="team-title">
          <h2 id="team-title">Team Agents</h2>
          <ul className="agent-list">
            {activeWorkspace.agents.map((agent) => (
              <li key={agent.id}>
                <span className={`status-dot status-dot-${agent.status}`} aria-hidden="true" />
                <span>
                  <strong>{agent.name}</strong>
                  <small>
                    {agent.role} / {agent.status}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="loadout-title" className="loadout-panel">
          <h2 id="loadout-title">
            <SlidersHorizontal aria-hidden="true" size={16} />
            Loadout
          </h2>
          <label>
            <span>Agent</span>
            <select
              aria-label="Agent template"
              onChange={(event) => {
                updateLoadout({ agentTemplateId: event.target.value });
              }}
              value={selectedAgentTemplateId}
            >
              {agentTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Harness</span>
            <select
              aria-label="Harness profile"
              onChange={(event) => {
                updateLoadout({ harnessProfileId: event.target.value });
              }}
              value={selectedHarnessProfileId}
            >
              {harnessProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section aria-labelledby="progress-title">
          <h2 id="progress-title">Progress</h2>
          <ol className="checkpoint-list">
            {activeWorkspace.checkpoints.map((checkpoint) => (
              <li className={`checkpoint-${checkpoint.state}`} key={checkpoint.label}>
                <span>{checkpoint.label}</span>
                <small>{checkpoint.state}</small>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="skills-title">
          <h2 id="skills-title">Skills Active</h2>
          <ul className="pill-list">
            {activeWorkspace.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="plugins-title" className="plugins-panel">
          <h2 id="plugins-title">Plugins</h2>
          <p>Browser, GitHub, Documents</p>
          <button type="button">Open plugin bay</button>
        </section>
      </aside>

      <section className="terminal-panel" aria-labelledby="cockpit-title">
        <header className="cockpit-hero">
          <div>
            <p className="eyebrow">Active workspace / {activeWorkspace.branch}</p>
            <h1 id="cockpit-title">AgenticCrew Cockpit</h1>
            <h2>{activeWorkspace.mission}</h2>
          </div>
          <dl className="metric-strip" aria-label="Workspace budget and status">
            <div>
              <dt>Status</dt>
              <dd>{activeWorkspace.status}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{budgetPercent}%</dd>
            </div>
            <div>
              <dt>Agents</dt>
              <dd>{activeWorkspace.agents.length}</dd>
            </div>
          </dl>
        </header>

        <article className="agent-terminal" aria-labelledby="active-agent-title">
          <header className="agent-header">
            <div>
              <p className="eyebrow">Active agent</p>
              <h3 id="active-agent-title">{selectedAgentTemplate?.name ?? activeAgent.name}</h3>
              <p>
                {(selectedAgentTemplate?.role ?? activeAgent.role)} / {(selectedAgentTemplate?.modelId ?? activeAgent.model)}
              </p>
              <p>
                Harness: {selectedHarnessProfile?.name ?? (selectedHarnessProfileId || "None")}
              </p>
            </div>
            <ul className="tool-list" aria-label="Active agent tools">
              {activeAgent.tools.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          </header>

          <div className="terminal-stream" aria-label="Active terminal stream">
            <div className="terminal-caption">Active terminal stream</div>
            {activeWorkspace.logs.map((line) => (
              <p key={line}>
                <span aria-hidden="true">&gt;</span>
                <code>{line}</code>
              </p>
            ))}
          </div>
        </article>

        <form className="command-bar" aria-label="Command composer">
          <label htmlFor="agent-command">Message active agent</label>
          <input id="agent-command" placeholder="Ask for next checkpoint, attach logs, or pause run..." type="text" />
          <button type="button">Queue</button>
        </form>
        <footer className="run-status-bar" aria-label="Run status">
          <span>AgenticCrew 0.1</span>
          <span>{activeWorkspace.agents.length} agents</span>
          <span>{activeWorkspace.status}</span>
          <span>engine: langgraph</span>
          <span>workspace: local/fs</span>
          <span>cache: 74% hit</span>
        </footer>
      </section>
    </div>
  );
}

function preferredActiveItems<T extends AgentTemplate | HarnessProfile>(items: readonly T[]): T[] {
  const activeItems = items.filter((item) => item.active);

  return activeItems.length > 0 ? activeItems : [...items];
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .split("")
    .map((character) => (isSlugCharacter(character) ? character : "-"))
    .join("");

  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .join("-");
}

function isSlugCharacter(character: string): boolean {
  return (
    (character >= "a" && character <= "z") ||
    (character >= "0" && character <= "9") ||
    character === "_" ||
    character === "-"
  );
}
