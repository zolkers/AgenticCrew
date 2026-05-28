import { useTranslation } from "react-i18next";
import type { SkillSourcesSnapshot } from "../../shared/types/core";

type SkillSourcesProps = Readonly<{
  snapshot: SkillSourcesSnapshot;
}>;

export function SkillSources({ snapshot }: SkillSourcesProps) {
  const { t } = useTranslation();
  const title = t("skillSources.title", { defaultValue: "Skill Sources" });

  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <p>
        {t("skillSources.activeCount", {
          count: snapshot.activeSourceCount,
          defaultValue: "{{count}} active source"
        })}
      </p>
      {snapshot.sources.length === 0 ? (
        <p>{t("skillSources.empty", { defaultValue: "No external skill source registered" })}</p>
      ) : (
        <ul>
          {snapshot.sources.map((source) => (
            <li key={source.id}>
              <strong>{source.id}</strong>
              <dl>
                <div>
                  <dt>{t("skillSources.labels.kind", { defaultValue: "Kind" })}</dt>
                  <dd>{t(`skillSources.kind.${source.kind}`)}</dd>
                </div>
                <div>
                  <dt>{t("skillSources.labels.trustLevel", { defaultValue: "Trust" })}</dt>
                  <dd>{t(`skillSources.trustLevel.${source.trustLevel}`)}</dd>
                </div>
                <div>
                  <dt>{t("skillSources.labels.status", { defaultValue: "Status" })}</dt>
                  <dd>{t(`skillSources.status.${source.status}`)}</dd>
                </div>
                <div>
                  <dt>{t("skillSources.labels.lastSyncStatus", { defaultValue: "Last sync" })}</dt>
                  <dd>{t(`skillSources.lastSyncStatus.${source.lastSyncStatus}`)}</dd>
                </div>
                <div>
                  <dt>{t("skillSources.labels.ref", { defaultValue: "Ref" })}</dt>
                  <dd>{source.selectedRef}</dd>
                </div>
                <div>
                  <dt>{t("skillSources.labels.repository", { defaultValue: "Repository" })}</dt>
                  <dd>{source.repositoryUrl}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
