import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MissionControl } from "../features/mission-control/MissionControl";
import { SkillSources } from "../features/skill-sources/SkillSources";
import { loadMissionControlSnapshot, type InvokeMissionControl } from "../shared/api/missionControlApi";
import { loadSkillSourcesSnapshot, type InvokeSkillSources } from "../shared/api/skillSourcesApi";
import type { MissionControlSnapshot, SkillSourcesSnapshot } from "../shared/types/core";
import "../i18n";

type AppProps = Readonly<{
  missionControlInvoke: InvokeMissionControl;
  skillSourcesInvoke: InvokeSkillSources;
}>;

type AppLoadState =
  | Readonly<{ status: "error" }>
  | Readonly<{
      missionControlSnapshot: MissionControlSnapshot;
      skillSourcesSnapshot: SkillSourcesSnapshot;
      status: "ready";
    }>
  | Readonly<{ status: "loading" }>;

export function App({ missionControlInvoke, skillSourcesInvoke }: AppProps) {
  const [loadState, setLoadState] = useState<AppLoadState>({ status: "loading" });
  const { t } = useTranslation();

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([loadMissionControlSnapshot(missionControlInvoke), loadSkillSourcesSnapshot(skillSourcesInvoke)])
      .then(([missionControlSnapshot, skillSourcesSnapshot]) => {
        if (isCurrent) {
          setLoadState({ missionControlSnapshot, skillSourcesSnapshot, status: "ready" });
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
  }, [missionControlInvoke, skillSourcesInvoke]);

  if (loadState.status === "error") {
    return <p role="alert">{t("missionControl.loadError", { defaultValue: "Mission Control unavailable" })}</p>;
  }

  if (loadState.status === "loading") {
    return <p>{t("missionControl.loading", { defaultValue: "Loading Mission Control" })}</p>;
  }

  return (
    <>
      <MissionControl snapshot={loadState.missionControlSnapshot} />
      <SkillSources snapshot={loadState.skillSourcesSnapshot} />
    </>
  );
}
