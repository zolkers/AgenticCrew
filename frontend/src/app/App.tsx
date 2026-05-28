import { useEffect, useState } from "react";
import { MissionControl } from "../features/mission-control/MissionControl";
import { loadMissionControlSnapshot, type InvokeMissionControl } from "../shared/api/missionControlApi";
import type { MissionControlSnapshot } from "../shared/types/core";
import "../i18n";

type AppProps = Readonly<{
  missionControlInvoke?: InvokeMissionControl;
}>;

export function App({ missionControlInvoke }: AppProps) {
  const [snapshot, setSnapshot] = useState<MissionControlSnapshot | null>(null);

  useEffect(() => {
    void loadMissionControlSnapshot(missionControlInvoke).then(setSnapshot);
  }, [missionControlInvoke]);

  if (snapshot === null) {
    return null;
  }

  return <MissionControl snapshot={snapshot} />;
}
