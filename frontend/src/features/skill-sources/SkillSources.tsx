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
import type {
  DiscoveredSkillManifest,
  SkillSource,
  SkillSourceActivationStatus,
  SkillSourceTrustLevel,
  SkillSourcesSnapshot
} from "../../shared/types/core";

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
  const [selectedSkillRoute, setSelectedSkillRoute] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState(snapshot.sources[0]?.id ?? "");
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
  const selectedSource =
    filteredSources.length === 0
      ? null
      : (filteredSources.find((source) => source.id === selectedSourceId) ?? filteredSources[0]);
  const selectedSkills = selectedSource === null ? [] : (selectedSource.discoveredSkills ?? []);
  const selectedSkill =
    selectedSkills.length === 0
      ? null
      : (selectedSkills.find((skill) => skill.route === selectedSkillRoute) ?? selectedSkills[0]);

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
      <SkillSourcesBrowser
        emptyMessage={t("skillSources.empty", { defaultValue: "No external skill source registered" })}
        invokeEnabled={invoke !== undefined}
        onActivate={(source) => {
          if (invoke !== undefined) {
            void runSourceAction(() => activateSkillSource(invoke, source.id), "Skill source activation failed");
          }
        }}
        onApprove={(source) => {
          if (invoke !== undefined) {
            void runSourceAction(
              () => approveSkillSourcePermissions(invoke, source.id, defaultExternalPermissionPolicy()),
              "Permission approval failed"
            );
          }
        }}
        onInspect={(source) => {
          if (invoke !== undefined) {
            void runSourceAction(() => inspectCachedSkillSource(invoke, source.id), "Skill source inspection failed");
          }
        }}
        onSelectSkill={setSelectedSkillRoute}
        onSelectSource={setSelectedSourceId}
        onSync={(source) => {
          if (invoke !== undefined) {
            void runSourceAction(() => syncGitHubSkillSource(invoke, source.id), "Skill source sync failed");
          }
        }}
        saving={saving}
        selectedSkill={selectedSkill}
        selectedSource={selectedSource}
        sources={filteredSources}
        sourceTotal={snapshot.sources.length}
      />
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

type SkillSourcesBrowserProps = Readonly<{
  emptyMessage: string;
  invokeEnabled: boolean;
  onActivate: (source: SkillSource) => void;
  onApprove: (source: SkillSource) => void;
  onInspect: (source: SkillSource) => void;
  onSelectSkill: (route: string) => void;
  onSelectSource: (sourceId: string) => void;
  onSync: (source: SkillSource) => void;
  saving: boolean;
  selectedSkill: DiscoveredSkillManifest | null;
  selectedSource: SkillSource | null;
  sources: readonly SkillSource[];
  sourceTotal: number;
}>;

function SkillSourcesBrowser({
  emptyMessage,
  invokeEnabled,
  onActivate,
  onApprove,
  onInspect,
  onSelectSkill,
  onSelectSource,
  onSync,
  saving,
  selectedSkill,
  selectedSource,
  sources,
  sourceTotal
}: SkillSourcesBrowserProps) {
  if (sourceTotal === 0) {
    return <p>{emptyMessage}</p>;
  }

  if (sources.length === 0 || selectedSource === null) {
    return <p>No skill source matches</p>;
  }

  return (
    <div className="skill-source-layout">
      <nav className="skill-source-roster" aria-label="Skill source list">
        {sources.map((source) => (
          <button
            aria-pressed={selectedSource.id === source.id}
            key={source.id}
            onClick={() => {
              onSelectSource(source.id);
              onSelectSkill(source.discoveredSkills?.[0]?.route ?? "");
            }}
            type="button"
          >
            {source.active ? (
              <CheckCircle2 aria-label="Active source" size={16} />
            ) : (
              <Box aria-label="Inactive source" size={16} />
            )}
            <span>
              <strong>{source.id}</strong>
              <small>{formatSourceLabel(source.status)}</small>
            </span>
            <code>{source.discoveredSkills?.length ?? 0} skills</code>
          </button>
        ))}
      </nav>
      <article className="skill-source-detail" aria-label="Selected skill source">
        <header>
          <div>
            <p className="eyebrow">Selected source</p>
            <h3>{selectedSource.id}</h3>
            <span>{selectedSource.repositoryUrl}</span>
          </div>
          {invokeEnabled ? (
            <div className="skill-source-actions">
              <button
                className="inline-action"
                disabled={saving}
                onClick={() => {
                  onSync(selectedSource);
                }}
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                <span>Sync</span>
              </button>
              <button
                className="inline-action"
                disabled={saving || selectedSource.localCachePath === null || selectedSource.localCachePath === undefined}
                onClick={() => {
                  onInspect(selectedSource);
                }}
                type="button"
              >
                <Search aria-hidden="true" size={16} />
                <span>Inspect</span>
              </button>
              <button
                className="inline-action"
                disabled={saving || selectedSource.permissionGate.approved}
                onClick={() => {
                  onApprove(selectedSource);
                }}
                type="button"
              >
                <ShieldCheck aria-hidden="true" size={16} />
                <span>Approve</span>
              </button>
              <button
                className="inline-action"
                disabled={
                  saving ||
                  selectedSource.active ||
                  selectedSource.status !== "validated" ||
                  !selectedSource.permissionGate.approved
                }
                onClick={() => {
                  onActivate(selectedSource);
                }}
                type="button"
              >
                <Play aria-hidden="true" size={16} />
                <span>Activate</span>
              </button>
            </div>
          ) : null}
        </header>
        <dl>
          <div>
            <dt>Kind</dt>
            <dd>{formatSourceLabel(selectedSource.kind)}</dd>
          </div>
          <div>
            <dt>Trust</dt>
            <dd>{formatSourceLabel(selectedSource.trustLevel)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{formatSourceLabel(selectedSource.status)}</dd>
          </div>
          <div>
            <dt>Permissions</dt>
            <dd>{selectedSource.permissionGate.approved ? "Approved" : "Pending approval"}</dd>
          </div>
        </dl>
        <SourceDiagnostics source={selectedSource} />
        <SkillPreview
          onSelectSkill={onSelectSkill}
          selectedSkill={selectedSkill}
          skills={selectedSource.discoveredSkills ?? []}
        />
      </article>
    </div>
  );
}

function SourceDiagnostics({ source }: Readonly<{ source: SkillSource }>) {
  return (
    <details className="skill-source-diagnostics">
      <summary>
        <ShieldCheck aria-hidden="true" size={16} />
        <h4>Source diagnostics</h4>
      </summary>
      <dl>
        <div>
          <dt>Last sync</dt>
          <dd>{formatSourceLabel(source.lastSyncStatus)}</dd>
        </div>
        <div>
          <dt>Ref</dt>
          <dd>{source.selectedRef}</dd>
        </div>
        {source.lastSyncedCommit ? (
          <div>
            <dt>Commit</dt>
            <dd>{source.lastSyncedCommit}</dd>
          </div>
        ) : null}
        {source.localCachePath ? (
          <div>
            <dt>Cache</dt>
            <dd>{source.localCachePath}</dd>
          </div>
        ) : null}
        {source.lastSyncError ? (
          <div>
            <dt>Sync error</dt>
            <dd>{source.lastSyncError}</dd>
          </div>
        ) : null}
      </dl>
      {source.validationErrors && source.validationErrors.length > 0 ? (
        <ul className="skill-source-errors">
          {source.validationErrors.map((error) => (
            <li key={`${error.relativePath}:${error.message}`}>
              <strong>{error.relativePath}</strong>
              <span>{error.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

function SkillPreview({
  onSelectSkill,
  selectedSkill,
  skills
}: Readonly<{
  onSelectSkill: (route: string) => void;
  selectedSkill: DiscoveredSkillManifest | null;
  skills: readonly DiscoveredSkillManifest[];
}>) {
  if (skills.length === 0 || selectedSkill === null) {
    return <p className="skill-preview-empty">No skill preview available. Sync and inspect this source to load skills.</p>;
  }

  return (
    <section className="skill-preview-panel" aria-label="Skill preview">
      <nav aria-label="Skills">
        {skills.map((skill) => (
          <button
            aria-pressed={selectedSkill.route === skill.route}
            key={skill.route}
            onClick={() => {
              onSelectSkill(skill.route);
            }}
            type="button"
          >
            <strong>{skill.name}</strong>
            <small>{skill.relativePath}</small>
          </button>
        ))}
      </nav>
      <article>
        <header>
          <div>
            <p className="eyebrow">Skill preview</p>
            <h4>{selectedSkill.name}</h4>
          </div>
          <code>{selectedSkill.route}</code>
        </header>
        <p>{selectedSkill.description}</p>
        <dl>
          <div>
            <dt>Manifest</dt>
            <dd>{selectedSkill.relativePath}</dd>
          </div>
          <div>
            <dt>Id</dt>
            <dd>{selectedSkill.id}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}

function formatSourceLabel(value: string) {
  if (value === "git_hub") {
    return "GitHub";
  }

  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
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
