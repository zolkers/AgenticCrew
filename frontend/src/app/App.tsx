import { MissionControl } from "../features/mission-control/MissionControl";
import { fallbackMissionControlSnapshot } from "../shared/api/missionControlApi";
import "../i18n";

export function App() {
  return <MissionControl snapshot={fallbackMissionControlSnapshot} />;
}
