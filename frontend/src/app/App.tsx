import { useEffect, useRef, useState, type ReactNode } from "react";
import { MantineProvider, Tooltip } from "@mantine/core";
import {
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  GitBranch,
  GitCommitHorizontal,
  KeyRound,
  LayoutDashboard,
  Play,
  Store,
  Route,
  Settings2,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Search,
  Upload
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
import { previewCommitPreviewInvoke, previewRunsInvoke, previewWorkspaceInvoke } from "../shared/api/previewInvokes";
import { loadRunsSnapshot, startRun, type InvokeRuns } from "../shared/api/runsApi";
import { loadSettingsSnapshot, type InvokeSettings } from "../shared/api/settingsApi";
import { loadSkillSourcesSnapshot, type InvokeSkillSources } from "../shared/api/skillSourcesApi";
import {
  createWorkspace as createWorkspaceRecord,
  loadWorkspaceSnapshot,
  refreshWorkspaceGitStatus,
  updateWorkspaceGitContext,
  updateWorkspaceLoadout,
  type InvokeCommitPreview,
  type InvokeWorkspace
} from "../shared/api/workspaceApi";
import type { CockpitWorkspace } from "../shared/preview/cockpitData";
import type {
  AgentStudioSnapshot,
  AgentTemplate,
  CreateWorkspaceRequest,
  DiscoveredSkillManifest,
  HarnessStudioSnapshot,
  HarnessProfile,
  MissionCostSummary,
  MissionControlSnapshot,
  ReasoningEffort,
  RunRecord,
  RunsSnapshot,
  SettingsSnapshot,
  SkillSourcesSnapshot,
  WorkspaceSnapshot
} from "../shared/types/core";
import { uniqueStrings } from "../shared/strings";
import "../i18n";
import "./App.css";

type AppProps = Readonly<{
  agentStudioInvoke: InvokeAgentStudio;
  commitPreviewInvoke?: InvokeCommitPreview;
  harnessStudioInvoke: InvokeHarnessStudio;
  missionControlInvoke: InvokeMissionControl;
  runsInvoke?: InvokeRuns;
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
      runsSnapshot: RunsSnapshot;
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

const defaultBranchOptions = ["main", "dev", "staging", "release"];

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    compactDisplay: "short",
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
    notation: "compact"
  }).format(value);
}

export function App({
  agentStudioInvoke,
  commitPreviewInvoke = previewCommitPreviewInvoke,
  harnessStudioInvoke,
  missionControlInvoke,
  runsInvoke = previewRunsInvoke,
  settingsInvoke,
  skillSourcesInvoke,
  workspaceInvoke = previewWorkspaceInvoke
}: AppProps) {
  const [loadState, setLoadState] = useState<AppLoadState>({ status: "loading" });
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const runSequenceRef = useRef(0);
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
      loadRunsSnapshot(runsInvoke),
      loadWorkspaceSnapshot(workspaceInvoke)
    ])
      .then(
        ([
          missionControlSnapshot,
          skillSourcesSnapshot,
          harnessStudioSnapshot,
          agentStudioSnapshot,
          settingsSnapshot,
          runsSnapshot,
          workspaceSnapshot
        ]) => {
        if (isCurrent) {
          setLoadState({
            agentStudioSnapshot,
            harnessStudioSnapshot,
            missionControlSnapshot,
            runsSnapshot,
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
    runsInvoke,
    settingsInvoke,
    skillSourcesInvoke,
    workspaceInvoke
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (isTextEntryElement(event.target)) {
          return;
        }

        event.preventDefault();
        setCommandQuery("");
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (loadState.status === "error") {
    return <p role="alert">{t("missionControl.loadError", { defaultValue: "Mission Control unavailable" })}</p>;
  }

  if (loadState.status === "loading") {
    return <p>{t("missionControl.loading", { defaultValue: "Loading Mission Control" })}</p>;
  }

  const missionControlLabel = t("missionControl.title", { defaultValue: "Mission Control" });
  const skillSourcesLabel = t("skillSources.title", { defaultValue: "Skill Sources" });
  const workspaces = loadState.workspaceSnapshot.workspaces;
  const workspacesById = Object.fromEntries(
    workspaces.map((workspace) => [workspace.id, workspace])
  ) as Record<string, CockpitWorkspace>;
  const activeWorkspace = activeWorkspaceId === null ? null : (workspacesById[activeWorkspaceId] ?? null);
  const branchOptions = uniqueStrings([
    ...defaultBranchOptions,
    ...loadState.missionControlSnapshot.gitSummary.activeBranches,
    ...workspaces.map((workspace) => workspace.branch),
    ...workspaces.flatMap((workspace) => [
      workspace.gitStatus?.branch,
      workspace.gitStatus?.remoteBranch?.replace(/^origin\//u, "")
    ])
  ]);
  const tokenSummary = loadState.missionControlSnapshot.costSummary;
  const openWorkspace = (workspaceId: string, view: AppView = "cockpit") => {
    setRouteState({ view, workspaceId });
    window.history.pushState(null, "", `/workspace/${workspaceId}/${routeSegmentByView[view]}`);
  };
  const openLaunchpad = () => {
    setRouteState({ view: "cockpit", workspaceId: null });
    window.history.pushState(null, "", "/workspaces");
  };
  const closeCommandPalette = () => {
    setCommandPaletteOpen(false);
    setCommandQuery("");
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
  const replaceRunsSnapshot = (runsSnapshot: RunsSnapshot) => {
    setLoadState({
      ...loadState,
      runsSnapshot
    });
  };

  if (activeWorkspace === null) {
    return (
      <MantineProvider defaultColorScheme="dark">
        <WorkspaceLaunchpad
          branchOptions={branchOptions}
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
  const openViewFromCommand = (view: AppView) => {
    openView(view);
    closeCommandPalette();
  };
  const commandItems: CommandItem[] = [
    {
      description: activeWorkspace.name,
      keywords: ["workspace", "cockpit", activeWorkspace.id, activeWorkspace.name],
      label: "Open Cockpit",
      run: () => {
        openViewFromCommand("cockpit");
      }
    },
    {
      description: "Sessions, checkpoints, gates, costs",
      keywords: ["mission", "dashboard", "runtime", "metrics"],
      label: "Open Mission Control",
      run: () => {
        openViewFromCommand("missionControl");
      }
    },
    {
      description: "Source browser, trust, permissions",
      keywords: ["skills", "marketplace", "sources", "routes"],
      label: "Open Skill Sources",
      run: () => {
        openViewFromCommand("skillSources");
      }
    },
    {
      description: "Execution policies and PI extensions",
      keywords: ["harness", "policy", "pi", "runtime"],
      label: "Open Execution Policies",
      run: () => {
        openViewFromCommand("harnessStudio");
      }
    },
    {
      description: "Agent profiles, versions, evaluations",
      keywords: ["agents", "studio", "training", "evaluations"],
      label: "Open Agent Profiles",
      run: () => {
        openViewFromCommand("agentStudio");
      }
    },
    {
      description: `${activeWorkspace.branch} / ${activeWorkspace.gitStatus?.remoteBranch ?? "no upstream"}`,
      keywords: ["git", "branch", "commit", "history", activeWorkspace.branch],
      label: "Open Git",
      run: () => {
        openViewFromCommand("gitPanel");
      }
    },
    {
      description: "Provider credentials and model sync",
      keywords: ["settings", "provider", "openai", "models"],
      label: "Open Settings",
      run: () => {
        openViewFromCommand("settings");
      }
    },
    {
      description: "Choose or create another workspace",
      keywords: ["launchpad", "workspace", "create", "switch"],
      label: "Open Workspace Launchpad",
      run: () => {
        openLaunchpad();
        closeCommandPalette();
      }
    }
  ];
  const updateActiveWorkspace = async (changes: Pick<CockpitWorkspace, "branch" | "path">) => {
    const workspaceSnapshot = await updateWorkspaceGitContext(workspaceInvoke, {
      ...changes,
      workspaceId: activeWorkspace.id
    });
    replaceWorkspaceSnapshot(workspaceSnapshot);
  };
  const refreshActiveGitStatus = async () => {
    const workspaceSnapshot = await refreshWorkspaceGitStatus(workspaceInvoke, {
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
  const startWorkspaceRun = async (task: string, skillRoutes: readonly string[], reasoningEffort: ReasoningEffort) => {
    runSequenceRef.current += 1;
    const runId = slugify(`run-${activeWorkspace.id}-${runSequenceRef.current.toString()}`);
    const selectedAgentTemplate = loadState.agentStudioSnapshot.templates.find(
      (template) => template.id === activeWorkspace.selectedAgentTemplateId
    );
    const runsSnapshot = await startRun(runsInvoke, {
      agentTemplateId: activeWorkspace.selectedAgentTemplateId ?? null,
      harnessProfileId: activeWorkspace.selectedHarnessProfileId ?? null,
      id: runId,
      modelId: selectedAgentTemplate?.modelId ?? loadState.settingsSnapshot.aiProvider.selectedModelId,
      providerId: selectedAgentTemplate?.providerId ?? loadState.settingsSnapshot.aiProvider.providerId,
      reasoningEffort,
      skillRoutes: [...skillRoutes],
      task,
      workspaceId: activeWorkspace.id
    });
    replaceRunsSnapshot(runsSnapshot);
  };
  const activeSkillRoutes = loadState.skillSourcesSnapshot.sources
    .filter((source) => source.active)
    .flatMap((source) => source.discoveredSkills ?? []);

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
            <small>Workbench</small>
          </span>
        </button>
        <div className="topbar-workspace" aria-label="Active workspace">
          <span>{activeWorkspace.id}</span>
          <div className="topbar-vcs-widget">
            <button
              aria-expanded={branchMenuOpen}
              aria-haspopup="menu"
              aria-label="Active branch"
              className="topbar-branch-button"
              onClick={() => {
                setBranchMenuOpen((isOpen) => !isOpen);
              }}
              type="button"
            >
              <GitBranch aria-hidden="true" size={14} />
              <strong>{activeWorkspace.branch}</strong>
              <ChevronDown aria-hidden="true" size={14} />
            </button>
            {branchMenuOpen ? (
              <div className="topbar-branch-menu" role="menu">
                <header>
                  <span>Git Branches</span>
                  <strong>{activeWorkspace.branch}</strong>
                </header>
                <div className="topbar-branch-actions" aria-label="VCS actions">
                  <button
                    onClick={() => {
                      setBranchMenuOpen(false);
                      void refreshActiveGitStatus();
                    }}
                    type="button"
                  >
                    <RefreshCw aria-hidden="true" size={14} />
                    <span>Update</span>
                  </button>
                  <button
                    onClick={() => {
                      setBranchMenuOpen(false);
                      openView("gitPanel");
                    }}
                    type="button"
                  >
                    <GitCommitHorizontal aria-hidden="true" size={14} />
                    <span>Commit</span>
                  </button>
                  <button
                    onClick={() => {
                      setBranchMenuOpen(false);
                      openView("gitPanel");
                    }}
                    type="button"
                  >
                    <Upload aria-hidden="true" size={14} />
                    <span>Push</span>
                  </button>
                </div>
                <div className="topbar-branch-list" role="group" aria-label="Branches">
                  {branchOptions.map((branch) => (
                    <button
                      aria-current={branch === activeWorkspace.branch ? "true" : undefined}
                      key={branch}
                      onClick={() => {
                        setBranchMenuOpen(false);
                        void updateActiveWorkspace({
                          branch,
                          path: activeWorkspace.path
                        });
                      }}
                      role="menuitem"
                      type="button"
                    >
                      {branch === activeWorkspace.branch ? <Check aria-hidden="true" size={14} /> : <span aria-hidden="true" />}
                      <span>{branch}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <button
          aria-label="Open command palette"
          className="topbar-icon"
          onClick={() => {
            setCommandQuery("");
            setCommandPaletteOpen(true);
          }}
          title="Command palette"
          type="button"
        >
          <Search aria-hidden="true" size={18} />
        </button>
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
            label="Execution Policies"
            onClick={() => {
              openView("harnessStudio");
            }}
          />
          <NavButton
            active={activeView === "agentStudio"}
            icon={<Bot aria-hidden="true" size={18} />}
            label="Agent Profiles"
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
            availableSkillRoutes={activeSkillRoutes}
            defaultReasoningEffort={loadState.settingsSnapshot.aiProvider.reasoningEffort ?? "medium"}
            harnessStudioSnapshot={loadState.harnessStudioSnapshot}
            onLoadoutChange={(loadout) => {
              void updateActiveLoadout(loadout);
            }}
            onRunStart={(task, skillRoutes, reasoningEffort) => {
              void startWorkspaceRun(task, skillRoutes, reasoningEffort);
            }}
            runsSnapshot={loadState.runsSnapshot}
            tokenSummary={tokenSummary}
            onWorkspaceChange={openWorkspace}
            workspaces={workspaces}
          />
        ) : null}
        {activeView === "missionControl" ? (
          <MissionControl snapshot={loadState.missionControlSnapshot} />
        ) : null}
        {activeView === "skillSources" ? (
          <SkillSources
            invoke={skillSourcesInvoke}
            onSnapshotChange={(skillSourcesSnapshot) => {
              setLoadState({
                ...loadState,
                skillSourcesSnapshot
              });
            }}
            snapshot={loadState.skillSourcesSnapshot}
          />
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
            modelOptions={loadState.settingsSnapshot.aiProvider.providerOptions?.flatMap((provider) => provider.models) ?? loadState.settingsSnapshot.aiProvider.availableModels}
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
            branchOptions={branchOptions}
            commitPreviewInvoke={commitPreviewInvoke}
            onRefreshGitStatus={() => {
              void refreshActiveGitStatus();
            }}
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
      {commandPaletteOpen ? (
        <CommandPalette
          items={commandItems}
          onClose={closeCommandPalette}
          query={commandQuery}
          setQuery={setCommandQuery}
        />
      ) : null}
      </div>
    </MantineProvider>
  );
}

type CommandItem = Readonly<{
  description: string;
  keywords: readonly string[];
  label: string;
  run: () => void;
}>;

type CommandPaletteProps = Readonly<{
  items: readonly CommandItem[];
  onClose: () => void;
  query: string;
  setQuery: (query: string) => void;
}>;

function CommandPalette({ items, onClose, query, setQuery }: CommandPaletteProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems =
    normalizedQuery.length === 0
      ? items
      : items.filter((item) =>
          [item.label, item.description, ...item.keywords]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        );

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="command-palette-title"
        aria-modal="true"
        className="command-palette"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <header>
          <div>
            <p className="eyebrow">Quick actions</p>
            <h2 id="command-palette-title">Command palette</h2>
          </div>
          <button aria-label="Close command palette" onClick={onClose} type="button">
            Esc
          </button>
        </header>
        <label>
          <Search aria-hidden="true" size={16} />
          <span>Search commands</span>
          <input
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onClose();
              }
            }}
            value={query}
          />
        </label>
        <div className="command-palette-list">
          {filteredItems.length === 0 ? (
            <p>No commands found</p>
          ) : (
            filteredItems.map((item) => (
              <button aria-label={item.label} key={item.label} onClick={item.run} type="button">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function isTextEntryElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
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
  branchOptions: readonly string[];
  onWorkspaceCreate: (request: CreateWorkspaceRequest) => void;
  onWorkspaceSelect: (workspaceId: string) => void;
  workspaces: readonly CockpitWorkspace[];
}>;

function WorkspaceLaunchpad({ branchOptions, onWorkspaceCreate, onWorkspaceSelect, workspaces }: WorkspaceLaunchpadProps) {
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
          <select
            onChange={(event) => {
              setBranch(event.target.value);
            }}
            value={branch}
          >
            {branchOptions.map((branchOption) => (
              <option key={branchOption} value={branchOption}>
                {branchOption}
              </option>
            ))}
          </select>
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
  availableSkillRoutes: readonly DiscoveredSkillManifest[];
  defaultReasoningEffort: ReasoningEffort;
  harnessStudioSnapshot: HarnessStudioSnapshot;
  onLoadoutChange: (loadout: WorkspaceLoadout) => void;
  onRunStart: (task: string, skillRoutes: readonly string[], reasoningEffort: ReasoningEffort) => void;
  onWorkspaceChange: (workspaceId: string) => void;
  runsSnapshot: RunsSnapshot;
  tokenSummary: MissionCostSummary;
  workspaces: readonly CockpitWorkspace[];
}>;

type WorkspaceLoadout = Readonly<{
  agentTemplateId: string;
  harnessProfileId: string;
}>;

function Cockpit({
  activeWorkspace,
  agentStudioSnapshot,
  availableSkillRoutes,
  defaultReasoningEffort,
  harnessStudioSnapshot,
  onLoadoutChange,
  onRunStart,
  onWorkspaceChange,
  runsSnapshot,
  tokenSummary,
  workspaces
}: CockpitProps) {
  const [runTask, setRunTask] = useState(activeWorkspace.mission);
  const [runReasoningEffort, setRunReasoningEffort] = useState<ReasoningEffort>(defaultReasoningEffort);
  const [selectedRunId, setSelectedRunId] = useState<null | string>(runsSnapshot.activeRunId ?? null);
  const [selectedMissionSkillRoutes, setSelectedMissionSkillRoutes] = useState<string[]>([]);
  const agentTemplates = preferredActiveItems(agentStudioSnapshot.templates);
  const harnessProfiles = preferredActiveItems(harnessStudioSnapshot.profiles);
  const selectedAgentTemplateId =
    activeWorkspace.selectedAgentTemplateId ?? (agentTemplates.at(0)?.id ?? "");
  const selectedHarnessProfileId =
    activeWorkspace.selectedHarnessProfileId ?? (harnessProfiles.at(0)?.id ?? "");
  const selectedAgentTemplate = agentTemplates.find((template) => template.id === selectedAgentTemplateId);
  const selectedHarnessProfile = harnessProfiles.find((profile) => profile.id === selectedHarnessProfileId);
  const workspaceRuns = runsSnapshot.runs.filter((run) => run.workspaceId === activeWorkspace.id);
  const selectedRun = workspaceRuns.find((run) => run.id === selectedRunId);
  const activeRun = selectedRun ?? workspaceRuns.find((run) => run.id === runsSnapshot.activeRunId) ?? workspaceRuns.at(-1);
  const activeRunEvents = activeRun === undefined
    ? []
    : runsSnapshot.events.filter((event) => event.runId === activeRun.id);
  const availableMissionSkillRoutes = uniqueSkillManifests([
    ...availableSkillRoutes,
    ...[
      ...(selectedAgentTemplate?.skillRoutes ?? []),
      ...(selectedHarnessProfile?.skillRoutes ?? [])
    ].map(skillManifestFromRoute)
  ]);
  const availableMissionSkillRouteSet = new Set(availableMissionSkillRoutes.map((skill) => skill.route));
  const updateLoadout = (next: Partial<WorkspaceLoadout>) => {
    onLoadoutChange({
      agentTemplateId: selectedAgentTemplateId,
      harnessProfileId: selectedHarnessProfileId,
      ...next
    });
  };
  const toggleMissionSkillRoute = (route: string) => {
    setSelectedMissionSkillRoutes((routes) =>
      routes.includes(route) ? routes.filter((selectedRoute) => selectedRoute !== route) : [...routes, route]
    );
  };

  return (
    <div className="cockpit-grid">
      <aside className="cockpit-sidebar" aria-label="Workbench controls">
        <section aria-labelledby="loadout-title" className="loadout-panel">
          <h2 id="loadout-title">
            <SlidersHorizontal aria-hidden="true" size={16} />
            Profiles & Policies
          </h2>
          <label>
            <span>Agent profile</span>
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
            <span>Execution policy</span>
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

        <section aria-labelledby="runs-title">
          <h2 id="runs-title">Runs</h2>
          <ol className="run-list">
            {workspaceRuns.length === 0 ? (
              <li className="empty-run">No runs queued</li>
            ) : (
              workspaceRuns.map((run) => (
                <RunListItem
                  active={run.id === activeRun?.id}
                  key={run.id}
                  onSelect={() => {
                    setSelectedRunId(run.id);
                  }}
                  run={run}
                />
              ))
            )}
          </ol>
        </section>

        <section aria-labelledby="skills-title">
          <h2 id="skills-title">Skill Routes</h2>
          <ul className="pill-list">
            {activeWorkspace.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
      </aside>

      <section className="terminal-panel" aria-labelledby="cockpit-title">
        <header className="cockpit-hero">
          <div>
            <p className="eyebrow">Active workspace / {activeWorkspace.branch}</p>
            <h1 id="cockpit-title">AgenticCrew Workbench</h1>
            <h2>{activeWorkspace.mission}</h2>
          </div>
          <label className="workspace-switcher">
            <span>Workspace</span>
            <select
              aria-label="Workspace"
              onChange={(event) => {
                onWorkspaceChange(event.target.value);
              }}
              value={activeWorkspace.id}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <dl className="metric-strip" aria-label="Workspace token usage and status">
            <div>
              <dt>Status</dt>
              <dd>{activeWorkspace.status}</dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd>
                {formatCompactNumber(tokenSummary.totalTokens)} / {formatCompactNumber(tokenSummary.tokenLimit)}
              </dd>
            </div>
            <div>
              <dt>Runs</dt>
              <dd>{workspaceRuns.length}</dd>
            </div>
          </dl>
        </header>

        <article className="mission-composer-panel" aria-labelledby="run-composer-title">
          <header className="mission-composer-header">
            <div>
              <p className="eyebrow">Mission composer</p>
              <h3 id="run-composer-title">Start a run</h3>
            </div>
            <dl className="composer-loadout" aria-label="Selected run loadout">
              <div>
                <dt>Agent</dt>
                <dd>{selectedAgentTemplate?.name ?? "Agent profile"}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{selectedAgentTemplate?.modelId ?? "model pending"}</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>{selectedHarnessProfile?.name ?? (selectedHarnessProfileId || "None")}</dd>
              </div>
            </dl>
          </header>

          <form
            aria-label="Start run"
            className="run-composer"
            onSubmit={(event) => {
              event.preventDefault();
              const task = runTask.trim();
              if (task.length > 0) {
                setSelectedRunId(null);
                onRunStart(
                  task,
                  selectedMissionSkillRoutes.filter((route) => availableMissionSkillRouteSet.has(route)),
                  runReasoningEffort
                );
              }
            }}
          >
            <label className="task-input-field" htmlFor="run-task">
              <span>Task</span>
              <textarea
                id="run-task"
                onChange={(event) => {
                  setRunTask(event.target.value);
                }}
                placeholder="Describe what the agent should do in this workspace."
                value={runTask}
              />
            </label>
            <div className="run-composer-controls">
              <label>
                <span>Thinking</span>
                <select
                  aria-label="Thinking"
                  onChange={(event) => {
                    setRunReasoningEffort(event.target.value as ReasoningEffort);
                  }}
                  value={runReasoningEffort}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <fieldset aria-label="Mission skills" className="mission-skill-picker">
                <legend>Mission skills</legend>
                {availableMissionSkillRoutes.length === 0 ? (
                  <span>No active skills</span>
                ) : (
                  availableMissionSkillRoutes.map((skill) => {
                    const checked = selectedMissionSkillRoutes.includes(skill.route);

                    return (
                      <label key={skill.route}>
                        <input
                          checked={checked}
                          onChange={() => {
                            toggleMissionSkillRoute(skill.route);
                          }}
                          type="checkbox"
                        />
                        <span>Use {skill.name}</span>
                      </label>
                    );
                  })
                )}
              </fieldset>
              <button disabled={runTask.trim().length === 0} type="submit">
                <Play aria-hidden="true" size={15} />
                <span>Start run</span>
              </button>
            </div>
          </form>
        </article>

        <article className="run-detail-panel" aria-labelledby="run-detail-title">
          <header>
            <div>
              <p className="eyebrow">Run details</p>
              <h3 id="run-detail-title">{activeRun === undefined ? "No active run" : activeRun.id}</h3>
            </div>
            <span className={`run-state-badge run-state-${activeRun?.status ?? "idle"}`}>
              {activeRun?.status ?? "idle"}
            </span>
          </header>

          <div className="terminal-stream" aria-label="Run event log">
            {activeRun === undefined ? (
              <p>
                <span aria-hidden="true">&gt;</span>
                <code>Describe a task and start a run to create a durable queue entry.</code>
              </p>
            ) : (
              <>
                <p>
                  <span aria-hidden="true">&gt;</span>
                  <code>{activeRun.task}</code>
                </p>
                <p>
                  <span aria-hidden="true">&gt;</span>
                  <code>
                    {activeRun.baseBranch} {"->"} {activeRun.runBranch}
                  </code>
                </p>
                <p>
                  <span aria-hidden="true">&gt;</span>
                  <code>{activeRun.worktreePath}</code>
                </p>
                <p>
                  <span aria-hidden="true">&gt;</span>
                  <code>manifest: {activeRun.manifestPath}</code>
                </p>
                {activeRun.skillRoutes.length > 0 ? (
                  <p>
                    <span aria-hidden="true">&gt;</span>
                    <code>skills: {activeRun.skillRoutes.join(", ")}</code>
                  </p>
                ) : null}
                <p>
                  <span aria-hidden="true">&gt;</span>
                  <code>thinking: {activeRun.reasoningEffort ?? "medium"}</code>
                </p>
                {activeRunEvents.map((event) => (
                  <p key={event.id}>
                    <span aria-hidden="true">&gt;</span>
                    <code>[{event.level}] {event.message}</code>
                  </p>
                ))}
              </>
            )}
          </div>
        </article>
        <footer className="run-status-bar" aria-label="Run status">
          <span>AgenticCrew 0.1</span>
          <span>{activeRun?.status ?? "no active run"}</span>
          <span>{activeWorkspace.status}</span>
          <span>workspace: local/fs</span>
          <span>run queue: durable</span>
        </footer>
      </section>
    </div>
  );
}

function RunListItem({
  active,
  onSelect,
  run
}: Readonly<{
  active: boolean;
  onSelect: () => void;
  run: RunRecord;
}>) {
  return (
    <li className={`run-list-item run-list-item-${run.status}`}>
      <button
        aria-current={active ? "true" : undefined}
        aria-label={`Open run ${run.id}`}
        onClick={onSelect}
        title={run.task}
        type="button"
      >
        <strong>{run.id}</strong>
        <span>{run.status}</span>
      </button>
    </li>
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

function uniqueSkillManifests(skills: readonly DiscoveredSkillManifest[]): DiscoveredSkillManifest[] {
  return skills.reduce<DiscoveredSkillManifest[]>((uniqueSkills, skill) => {
    if (!uniqueSkills.some((candidate) => candidate.route === skill.route)) {
      uniqueSkills.push(skill);
    }

    return uniqueSkills;
  }, []);
}

function skillManifestFromRoute(route: string): DiscoveredSkillManifest {
  const name = route.split("/").filter(Boolean).at(-1) ?? route;

  return {
    description: "Bound to the selected workspace loadout.",
    id: route,
    name,
    relativePath: "",
    route
  };
}
