import { useTranslation } from "react-i18next";
import "../i18n";

export function App() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t("missionControl.title")}</h1>
      <p>{t("missionControl.status")}</p>
    </main>
  );
}
