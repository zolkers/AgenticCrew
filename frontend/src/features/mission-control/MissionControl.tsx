import type { MissionControlSnapshot } from "../../shared/types/core";
import { Activity, CheckCircle2, GitBranch, KeyRound, PackageSearch, RadioTower } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type MissionControlProps = Readonly<{
  snapshot: MissionControlSnapshot;
}>;

export function MissionControl({ snapshot }: MissionControlProps) {
  const { i18n, t } = useTranslation();
  const title = t("missionControl.title", { defaultValue: "Mission Control" });
  const usdFormatter = new Intl.NumberFormat(i18n.language, {
    currency: "USD",
    style: "currency"
  });

  return (
    <section aria-label={title} className="mission-page">
      <header className="surface-header mission-header">
        <div>
          <p className="eyebrow">Ops center</p>
          <h1>{title}</h1>
        </div>
        <strong>{t(`missionControl.humanGateStatus.${snapshot.humanGateStatus}`)}</strong>
      </header>

      <dl className="mission-kpis">
        <Metric
          icon={<RadioTower aria-hidden="true" size={18} />}
          label={t("missionControl.labels.activeSessionCount", { defaultValue: "Active sessions" })}
          value={String(snapshot.activeSessionCount)}
        />
        <Metric
          icon={<Activity aria-hidden="true" size={18} />}
          label={t("missionControl.labels.activeAgentCount", { defaultValue: "Active agents" })}
          value={String(snapshot.activeAgentCount)}
        />
        <Metric
          icon={<KeyRound aria-hidden="true" size={18} />}
          label={t("missionControl.labels.currentCostUsd", { defaultValue: "Current cost" })}
          value={usdFormatter.format(snapshot.currentCostUsd)}
        />
        <Metric
          icon={<PackageSearch aria-hidden="true" size={18} />}
          label="Skills"
          value={`${String(snapshot.skillSummary.activeSourceCount)}/${String(snapshot.skillSummary.sourceCount)}`}
        />
      </dl>

      <div className="mission-grid">
        <section aria-labelledby="mission-sessions-title" className="mission-panel">
          <h2 id="mission-sessions-title">Sessions</h2>
          {snapshot.sessions.length === 0 ? (
            <p className="mission-empty">No active sessions</p>
          ) : (
            <ul className="mission-list">
              {snapshot.sessions.map((session) => (
                <li key={session.id}>
                  <strong>{session.title}</strong>
                  <span>
                    <GitBranch aria-hidden="true" size={14} />
                    {session.branch} / {session.status}
                  </span>
                  <small>
                    {session.pendingCheckpointCount}/{session.checkpointCount} checkpoints pending
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="mission-checkpoints-title" className="mission-panel">
          <h2 id="mission-checkpoints-title">Checkpoints</h2>
          <ol className="mission-list">
            {snapshot.checkpoints.map((checkpoint) => (
              <li key={`${checkpoint.sessionId}-${checkpoint.label}`}>
                <strong>{checkpoint.label}</strong>
                <span>{checkpoint.ownerAgent}</span>
                <small>{checkpoint.status}</small>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="mission-runtime-title" className="mission-panel">
          <h2 id="mission-runtime-title">Runtime</h2>
          <dl className="mission-facts">
            <div>
              <dt>{t("missionControl.labels.providerModel", { defaultValue: "Provider / model" })}</dt>
              <dd>{snapshot.activeProvider.providerId} / {snapshot.activeModel.modelId}</dd>
            </div>
            <div>
              <dt>{t("missionControl.labels.currentCheckpoint", { defaultValue: "Checkpoint" })}</dt>
              <dd>{snapshot.currentCheckpoint}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>{snapshot.activeWorkspace?.name ?? "None"}</dd>
            </div>
            <div>
              <dt>Model calls</dt>
              <dd>{snapshot.costSummary.modelCallCount}</dd>
            </div>
            <div>
              <dt>Workspaces</dt>
              <dd>{snapshot.gitSummary.workspaceCount}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="mission-evidence-title" className="mission-panel">
          <h2 id="mission-evidence-title">Evidence</h2>
          {snapshot.recentEvidence.length === 0 ? (
            <p className="mission-empty">No evidence recorded</p>
          ) : (
            <ul className="mission-list evidence-list">
              {snapshot.recentEvidence.map((evidence) => (
                <li key={evidence.evidenceId}>
                  <strong>
                    <CheckCircle2 aria-hidden="true" size={14} />
                    {evidence.command}
                  </strong>
                  <span>{evidence.checkpointId}</span>
                  <small>
                    exit {evidence.exitCode} / {evidence.createdAt}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

type MetricProps = Readonly<{
  icon: ReactNode;
  label: string;
  value: string;
}>;

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div>
      <dt>
        {icon}
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
