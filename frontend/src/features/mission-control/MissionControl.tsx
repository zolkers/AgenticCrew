import type { MissionControlSnapshot } from "../../shared/types/core";
import { useTranslation } from "react-i18next";

type MissionControlProps = Readonly<{
  snapshot: MissionControlSnapshot;
}>;

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency"
});

export function MissionControl({ snapshot }: MissionControlProps) {
  const { t } = useTranslation();
  const title = t("missionControl.title", { defaultValue: "Mission Control" });

  return (
    <section aria-label={title}>
      <h1>{title}</h1>
      <dl>
        <div>
          <dt>{t("missionControl.labels.activeSessionCount", { defaultValue: "Active sessions" })}</dt>
          <dd>{snapshot.activeSessionCount}</dd>
        </div>
        <div>
          <dt>{t("missionControl.labels.activeAgentCount", { defaultValue: "Active agents" })}</dt>
          <dd>{snapshot.activeAgentCount}</dd>
        </div>
        <div>
          <dt>{t("missionControl.labels.currentCostUsd", { defaultValue: "Current cost" })}</dt>
          <dd>{usdFormatter.format(snapshot.currentCostUsd)}</dd>
        </div>
        <div>
          <dt>{t("missionControl.labels.providerModel", { defaultValue: "Provider / model" })}</dt>
          <dd>
            {snapshot.provider} / {snapshot.model}
          </dd>
        </div>
        <div>
          <dt>{t("missionControl.labels.currentCheckpoint", { defaultValue: "Checkpoint" })}</dt>
          <dd>{snapshot.currentCheckpoint}</dd>
        </div>
        <div>
          <dt>{t("missionControl.labels.humanGateStatus", { defaultValue: "Human gate" })}</dt>
          <dd>{snapshot.humanGateStatus}</dd>
        </div>
      </dl>
    </section>
  );
}
