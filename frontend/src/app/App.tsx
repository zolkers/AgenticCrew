import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AgentStudio } from "../features/agents/AgentStudio";
import { HarnessStudio } from "../features/harnesses/HarnessStudio";
import { MissionControl } from "../features/mission-control/MissionControl";
import { SkillSources } from "../features/skill-sources/SkillSources";
import { loadAgentStudioSnapshot, type InvokeAgentStudio } from "../shared/api/agentStudioApi";
import { loadHarnessStudioSnapshot, type InvokeHarnessStudio } from "../shared/api/harnessStudioApi";
import { loadMissionControlSnapshot, type InvokeMissionControl } from "../shared/api/missionControlApi";
import { loadSkillSourcesSnapshot, type InvokeSkillSources } from "../shared/api/skillSourcesApi";
import { cockpitWorkspaces, type CockpitWorkspace } from "../shared/preview/cockpitData";
import type {
  AgentStudioSnapshot,
  HarnessStudioSnapshot,
  MissionControlSnapshot,
  SkillSourcesSnapshot
} from "../shared/types/core";
import "../i18n";
import "./App.css";

type AppProps = Readonly<{
  agentStudioInvoke: InvokeAgentStudio;
  harnessStudioInvoke: InvokeHarnessStudio;
  missionControlInvoke: InvokeMissionControl;
  skillSourcesInvoke: InvokeSkillSources;
}>;

type AppLoadState =
  | Readonly<{ status: "error" }>
  | Readonly<{
      missionControlSnapshot: MissionControlSnapshot;
      agentStudioSnapshot: AgentStudioSnapshot;
      harnessStudioSnapshot: HarnessStudioSnapshot;
      skillSourcesSnapshot: SkillSourcesSnapshot;
      status: "ready";
    }>
  | Readonly<{ status: "loading" }>;

type AppView = "cockpit" | "missionControl" | "skillSources" | "harnessStudio" | "agentStudio";

export function App({ agentStudioInvoke, harnessStudioInvoke, missionControlInvoke, skillSourcesInvoke }: AppProps) {
  const [loadState, setLoadState] = useState<AppLoadState>({ status: "loading" });
  const [activeView, setActiveView] = useState<AppView>("cockpit");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(cockpitWorkspaces[0].id);
  const { t } = useTranslation();

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      loadMissionControlSnapshot(missionControlInvoke),
      loadSkillSourcesSnapshot(skillSourcesInvoke),
      loadHarnessStudioSnapshot(harnessStudioInvoke),
      loadAgentStudioSnapshot(agentStudioInvoke)
    ])
      .then(([missionControlSnapshot, skillSourcesSnapshot, harnessStudioSnapshot, agentStudioSnapshot]) => {
        if (isCurrent) {
          setLoadState({
            agentStudioSnapshot,
            harnessStudioSnapshot,
            missionControlSnapshot,
            skillSourcesSnapshot,
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
  }, [agentStudioInvoke, harnessStudioInvoke, missionControlInvoke, skillSourcesInvoke]);

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
  const workspacesById = Object.fromEntries(
    cockpitWorkspaces.map((workspace) => [workspace.id, workspace])
  ) as Record<string, CockpitWorkspace>;
  const activeWorkspace = workspacesById[activeWorkspaceId];

  return (
    <div className="app-shell">
      <nav aria-label={t("app.navigationLabel", { defaultValue: "Workspace navigation" })} className="topbar">
        <button
          aria-pressed={activeView === "cockpit"}
          className="brand-button"
          onClick={() => {
            setActiveView("cockpit");
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
          <strong>{activeWorkspace.status}</strong>
        </div>
        <div className="topbar-budget" aria-label="Budget status">
          <span>Budget</span>
          <strong>
            ${activeWorkspace.budgetUsedUsd.toFixed(2)} / ${activeWorkspace.budgetLimitUsd.toFixed(2)}
          </strong>
        </div>
        <button
          className="topbar-tab"
          aria-pressed={activeView === "missionControl"}
          onClick={() => {
            setActiveView("missionControl");
          }}
          type="button"
        >
          {missionControlLabel}
        </button>
        <button
          className="topbar-tab"
          aria-pressed={activeView === "skillSources"}
          onClick={() => {
            setActiveView("skillSources");
          }}
          type="button"
        >
          {skillSourcesLabel}
        </button>
        <button
          className="topbar-tab"
          aria-pressed={activeView === "harnessStudio"}
          onClick={() => {
            setActiveView("harnessStudio");
          }}
          type="button"
        >
          {harnessStudioLabel}
        </button>
        <button
          className="topbar-tab"
          aria-pressed={activeView === "agentStudio"}
          onClick={() => {
            setActiveView("agentStudio");
          }}
          type="button"
        >
          {agentStudioLabel}
        </button>
      </nav>
      <main aria-label={t("app.mainLabel", { defaultValue: "Workspace" })} className="app-main">
        {activeView === "cockpit" ? (
          <Cockpit
            activeWorkspace={activeWorkspace}
            onWorkspaceChange={setActiveWorkspaceId}
            workspaces={cockpitWorkspaces}
          />
        ) : null}
        {activeView === "missionControl" ? (
          <MissionControl snapshot={loadState.missionControlSnapshot} />
        ) : null}
        {activeView === "skillSources" ? (
          <SkillSources snapshot={loadState.skillSourcesSnapshot} />
        ) : null}
        {activeView === "harnessStudio" ? (
          <HarnessStudio snapshot={loadState.harnessStudioSnapshot} />
        ) : null}
        {activeView === "agentStudio" ? <AgentStudio snapshot={loadState.agentStudioSnapshot} /> : null}
      </main>
    </div>
  );
}

type CockpitProps = Readonly<{
  activeWorkspace: CockpitWorkspace;
  onWorkspaceChange: (workspaceId: string) => void;
  workspaces: readonly CockpitWorkspace[];
}>;

function Cockpit({ activeWorkspace, onWorkspaceChange, workspaces }: CockpitProps) {
  const agentsById = Object.fromEntries(activeWorkspace.agents.map((agent) => [agent.id, agent])) as Record<
    string,
    CockpitWorkspace["agents"][number]
  >;
  const activeAgent = agentsById[activeWorkspace.activeAgentId];
  const budgetPercent = Math.round((activeWorkspace.budgetUsedUsd / activeWorkspace.budgetLimitUsd) * 100);

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
              <h3 id="active-agent-title">{activeAgent.name}</h3>
              <p>
                {activeAgent.role} / {activeAgent.model}
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
