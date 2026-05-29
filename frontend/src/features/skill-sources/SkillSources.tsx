import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, CheckCircle2, Download, Play, Plus, Route, Search, ShieldCheck } from "lucide-react";
import {
  activateSkillSource,
  approveSkillSourcePermissions,
  inspectCachedSkillSource,
  loadSkillSourcesSnapshot,
  registerGitHubSkillSource,
  syncGitHubSkillSource,
  type InvokeSkillSources
} from "../../shared/api/skillSourcesApi";
import type { SkillSourceActivationStatus, SkillSourceTrustLevel, SkillSourcesSnapshot } from "../../shared/types/core";

type SkillSourcesProps = Readonly<{
  invoke?: InvokeSkillSources;
  onSnapshotChange?: (snapshot: SkillSourcesSnapshot) => void;
  snapshot: SkillSourcesSnapshot;
}>;

export function SkillSources({ invoke, onSnapshotChange, snapshot }: SkillSourcesProps) {
  const { t } = useTranslation();
  const title = t("skillSources.title", { defaultValue: "Skill Sources" });
  const [error, setError] = useState<null | string>(null);
  const [formId, setFormId] = useState("superpowers");
  const [formRef, setFormRef] = useState("main");
  const [formRepositoryUrl, setFormRepositoryUrl] = useState("https://github.com/obra/superpowers");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | SkillSourceActivationStatus>("all");
  const [trustFilter, setTrustFilter] = useState<"all" | SkillSourceTrustLevel>("all");
  const discoveredSkillCount = snapshot.sources.reduce(
    (count, source) => count + (source.discoveredSkills?.length ?? 0),
    0
  );
  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return snapshot.sources.filter((source) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          source.id,
          source.repositoryUrl,
          source.selectedRef,
          ...(source.discoveredSkills ?? []).flatMap((skill) => [
            skill.name,
            skill.description,
            skill.route,
            skill.relativePath
          ])
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || source.status === statusFilter;
      const matchesTrust = trustFilter === "all" || source.trustLevel === trustFilter;

      return matchesQuery && matchesStatus && matchesTrust;
    });
  }, [query, snapshot.sources, statusFilter, trustFilter]);
  let sourcesContent = <p>{t("skillSources.empty", { defaultValue: "No external skill source registered" })}</p>;

  if (snapshot.sources.length > 0 && filteredSources.length === 0) {
    sourcesContent = <p>No skill source matches</p>;
  }

  if (filteredSources.length > 0) {
    sourcesContent = (
      <ul className="marketplace-list">
        {filteredSources.map((source) => (
          <li className="marketplace-source" key={source.id}>
            <header>
              <div>
                <strong>{source.id}</strong>
                <span>{source.repositoryUrl}</span>
              </div>
              {source.active ? (
                <CheckCircle2 aria-label="Active source" size={18} />
              ) : (
                <Box aria-label="Inactive source" size={18} />
              )}
            </header>
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
              {source.lastSyncedCommit ? (
                <div>
                  <dt>{t("skillSources.labels.lastSyncedCommit", { defaultValue: "Commit" })}</dt>
                  <dd>{source.lastSyncedCommit}</dd>
                </div>
              ) : null}
              {source.localCachePath ? (
                <div>
                  <dt>{t("skillSources.labels.localCachePath", { defaultValue: "Cache" })}</dt>
                  <dd>{source.localCachePath}</dd>
                </div>
              ) : null}
              {source.lastSyncError ? (
                <div>
                  <dt>{t("skillSources.labels.lastSyncError", { defaultValue: "Sync error" })}</dt>
                  <dd>{source.lastSyncError}</dd>
                </div>
              ) : null}
              {source.validationErrors && source.validationErrors.length > 0 ? (
                <div>
                  <dt>{t("skillSources.labels.validationErrors", { defaultValue: "Validation errors" })}</dt>
                  <dd>
                    <ul>
                      {source.validationErrors.map((error) => (
                        <li key={`${error.relativePath}:${error.message}`}>
                          <strong>{error.relativePath}</strong>
                          <span>{error.message}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{t("skillSources.labels.permissionGate", { defaultValue: "Permissions" })}</dt>
                <dd>
                  {source.permissionGate.approved
                    ? t("skillSources.permissionGate.approved", { defaultValue: "Approved" })
                    : t("skillSources.permissionGate.pending", { defaultValue: "Pending approval" })}
                </dd>
              </div>
              <div>
                <dt>{t("skillSources.labels.ref", { defaultValue: "Ref" })}</dt>
                <dd>{source.selectedRef}</dd>
              </div>
            </dl>
            {source.discoveredSkills && source.discoveredSkills.length > 0 ? (
              <div className="marketplace-routes">
                {source.discoveredSkills.map((skill) => (
                  <article key={skill.route}>
                    <strong>{skill.name}</strong>
                    <code>{skill.route}</code>
                    <span>{skill.description}</span>
                  </article>
                ))}
              </div>
            ) : null}
            {invoke === undefined ? null : (
              <div className="settings-actions">
                <button
                  className="inline-action"
                  disabled={saving}
                  onClick={() => {
                    void runSourceAction(() => syncGitHubSkillSource(invoke, source.id), "Skill source sync failed");
                  }}
                  type="button"
                >
                  <Download aria-hidden="true" size={16} />
                  <span>Sync</span>
                </button>
                <button
                  className="inline-action"
                  disabled={saving || source.localCachePath === null || source.localCachePath === undefined}
                  onClick={() => {
                    void runSourceAction(
                      () => inspectCachedSkillSource(invoke, source.id),
                      "Skill source inspection failed"
                    );
                  }}
                  type="button"
                >
                  <Search aria-hidden="true" size={16} />
                  <span>Inspect</span>
                </button>
                <button
                  className="inline-action"
                  disabled={saving || source.permissionGate.approved}
                  onClick={() => {
                    void runSourceAction(
                      () => approveSkillSourcePermissions(invoke, source.id, defaultExternalPermissionPolicy()),
                      "Permission approval failed"
                    );
                  }}
                  type="button"
                >
                  <ShieldCheck aria-hidden="true" size={16} />
                  <span>Approve</span>
                </button>
                <button
                  className="inline-action"
                  disabled={saving || source.active || source.status !== "validated" || !source.permissionGate.approved}
                  onClick={() => {
                    void runSourceAction(() => activateSkillSource(invoke, source.id), "Skill source activation failed");
                  }}
                  type="button"
                >
                  <Play aria-hidden="true" size={16} />
                  <span>Activate</span>
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-label={title}>
      <header className="surface-header">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h2>{title}</h2>
        </div>
        <strong>
          {t("skillSources.activeCount", {
            count: snapshot.activeSourceCount,
            defaultValue: "{{count}} active source"
          })}
        </strong>
      </header>
      <div className="surface-grid compact">
        <article className="surface-card">
          <Search aria-hidden="true" size={20} />
          <strong>Search</strong>
          <span>{filteredSources.length} source matches</span>
        </article>
        <article className="surface-card">
          <Route aria-hidden="true" size={20} />
          <strong>Routes</strong>
          <span>{discoveredSkillCount} skills indexed</span>
        </article>
        <article className="surface-card">
          <ShieldCheck aria-hidden="true" size={20} />
          <strong>Trust</strong>
          <span>Permission gated</span>
        </article>
      </div>
      <div className="settings-form marketplace-filters">
        {invoke === undefined ? null : (
          <>
            <label>
              <span>Source id</span>
              <input
                disabled={saving}
                onChange={(event) => {
                  setFormId(event.target.value);
                }}
                value={formId}
              />
            </label>
            <label>
              <span>Repository URL</span>
              <input
                disabled={saving}
                onChange={(event) => {
                  setFormRepositoryUrl(event.target.value);
                }}
                value={formRepositoryUrl}
              />
            </label>
            <label>
              <span>Ref</span>
              <input
                disabled={saving}
                onChange={(event) => {
                  setFormRef(event.target.value);
                }}
                value={formRef}
              />
            </label>
            <button
              disabled={saving || formId.trim().length === 0 || formRepositoryUrl.trim().length === 0 || formRef.trim().length === 0}
              onClick={() => {
                void registerSource();
              }}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              <span>Register</span>
            </button>
          </>
        )}
        <label>
          <span>Search</span>
          <input
            aria-label="Search skills"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="skill, route, source"
            type="search"
            value={query}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            aria-label="Filter status"
            onChange={(event) => {
              setStatusFilter(event.target.value as "all" | SkillSourceActivationStatus);
            }}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="pending_validation">Pending validation</option>
            <option value="validated">Validated</option>
            <option value="rejected">Rejected</option>
            <option value="sync_failed">Sync failed</option>
          </select>
        </label>
        <label>
          <span>Trust</span>
          <select
            aria-label="Filter trust"
            onChange={(event) => {
              setTrustFilter(event.target.value as "all" | SkillSourceTrustLevel);
            }}
            value={trustFilter}
          >
            <option value="all">All trust</option>
            <option value="built_in">Built in</option>
            <option value="local">Local</option>
            <option value="external">External</option>
          </select>
        </label>
      </div>
      {error ? (
        <output aria-live="polite" className="settings-error">
          {error}
        </output>
      ) : null}
      {sourcesContent}
    </section>
  );

  async function registerSource() {
    if (invoke === undefined) {
      return;
    }

    await runSourceAction(
      () =>
        registerGitHubSkillSource(invoke, {
          id: formId.trim(),
          repositoryUrl: formRepositoryUrl.trim(),
          selectedRef: formRef.trim()
        }),
      "Skill source registration failed"
    );
  }

  async function runSourceAction(action: () => Promise<void>, errorMessage: string) {
    if (invoke === undefined) {
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await action();
      onSnapshotChange?.(await loadSkillSourcesSnapshot(invoke));
    } catch {
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }
}

function defaultExternalPermissionPolicy() {
  return {
    commands: [{ command: "git" }],
    docker: false,
    fileSystem: [{ path: "skill-sources", writable: true }],
    git: true,
    network: [{ host: "github.com" }]
  };
}
