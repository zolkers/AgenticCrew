import type { MissionControlSnapshot } from "../../shared/types/core";

const defaultSnapshot: MissionControlSnapshot = {
  activeAgents: 3,
  activeSessions: 1,
  currentCheckpoint: "Design approved",
  currentCostUsd: "$0.00",
  humanGateStatus: "Human gate pending",
  model: "gpt-4o",
  provider: "openai"
};

export function MissionControl() {
  return (
    <section aria-label="Mission Control">
      <h1>Mission Control</h1>
      <dl>
        <div>
          <dt>Active sessions</dt>
          <dd>{defaultSnapshot.activeSessions}</dd>
        </div>
        <div>
          <dt>Active agents</dt>
          <dd>{defaultSnapshot.activeAgents}</dd>
        </div>
        <div>
          <dt>Current cost</dt>
          <dd>{defaultSnapshot.currentCostUsd}</dd>
        </div>
        <div>
          <dt>Provider / model</dt>
          <dd>
            {defaultSnapshot.provider} / {defaultSnapshot.model}
          </dd>
        </div>
        <div>
          <dt>Checkpoint</dt>
          <dd>{defaultSnapshot.currentCheckpoint}</dd>
        </div>
        <div>
          <dt>Human gate</dt>
          <dd>{defaultSnapshot.humanGateStatus}</dd>
        </div>
      </dl>
    </section>
  );
}
