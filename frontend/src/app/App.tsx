import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MissionControl } from "../features/mission-control/MissionControl";
import { loadMissionControlSnapshot, type InvokeMissionControl } from "../shared/api/missionControlApi";
import type { MissionControlSnapshot } from "../shared/types/core";
import "../i18n";

type AppProps = Readonly<{
  missionControlInvoke: InvokeMissionControl;
}>;

type MissionControlLoadState =
  | Readonly<{ status: "error" }>
  | Readonly<{ snapshot: MissionControlSnapshot; status: "ready" }>
  | Readonly<{ status: "loading" }>;

export function App({ missionControlInvoke }: AppProps) {
  const [loadState, setLoadState] = useState<MissionControlLoadState>({ status: "loading" });
  const { t } = useTranslation();

  useEffect(() => {
    let isCurrent = true;

    void loadMissionControlSnapshot(missionControlInvoke)
      .then((nextSnapshot) => {
        if (isCurrent) {
          setLoadState({ snapshot: nextSnapshot, status: "ready" });
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
  }, [missionControlInvoke]);

  if (loadState.status === "error") {
    return <p role="alert">{t("missionControl.loadError", { defaultValue: "Mission Control unavailable" })}</p>;
  }

  if (loadState.status === "loading") {
    return <p>{t("missionControl.loading", { defaultValue: "Loading Mission Control" })}</p>;
  }

  return <MissionControl snapshot={loadState.snapshot} />;
}
