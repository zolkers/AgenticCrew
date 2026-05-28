import type { MissionControlSnapshot } from "../../shared/types/core";
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
          <dd>{t(`missionControl.humanGateStatus.${snapshot.humanGateStatus}`)}</dd>
        </div>
      </dl>
    </section>
  );
}
