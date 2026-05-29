import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
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
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedSkillRoute, setSelectedSkillRoute] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState(snapshot.sources[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | SkillSourceActivationStatus>("all");
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

      return matchesQuery && matchesStatus;
    });
  }, [query, snapshot.sources, statusFilter]);
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
          <p className="eyebrow">Library</p>
          <h2>{title}</h2>
        </div>
        <div className="skill-source-header-actions">
          <strong>
            {t("skillSources.activeCount", {
              count: snapshot.activeSourceCount,
              defaultValue: "{{count}} active source"
            })}
          </strong>
          {invoke === undefined ? null : (
            <button
              className="inline-action"
              onClick={() => {
                setIsAddSourceOpen((isOpen) => !isOpen);
              }}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              <span>Add source</span>
            </button>
          )}
        </div>
      </header>
      <div className="skill-source-summary" aria-label="Skill source summary">
        <span>{snapshot.sources.length} sources</span>
        <span>{filteredSources.length} matching</span>
        <span>{discoveredSkillCount} skills indexed</span>
      </div>
      {invoke !== undefined && isAddSourceOpen ? (
        <section className="skill-source-add-panel" aria-label="Add skill source">
          <header>
            <div>
              <h3>Add source</h3>
              <span>Register a GitHub skill source, then sync and inspect it.</span>
            </div>
          </header>
          <div className="settings-form marketplace-filters">
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
          </div>
        </section>
      ) : null}
      <div className="skill-source-toolbar">
        <label>
          <Search aria-hidden="true" size={16} />
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
        <div className="skill-source-filter-chips" aria-label="Filter status">
          {[
            ["all", "All"],
            ["pending_validation", "Needs review"],
            ["validated", "Ready"],
            ["sync_failed", "Failed"],
            ["rejected", "Rejected"]
          ].map(([value, label]) => (
            <button
              aria-pressed={statusFilter === value}
              key={value}
              onClick={() => {
                setStatusFilter(value as "all" | SkillSourceActivationStatus);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
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
            <SourceStateIcon source={source} />
            <span>
              <strong>{source.id}</strong>
              <small>{source.repositoryUrl}</small>
            </span>
            <code>{source.active ? "Active" : sourceStatusLabel(source)}</code>
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
              <PrimarySourceAction
                onActivate={onActivate}
                onApprove={onApprove}
                onInspect={onInspect}
                onSync={onSync}
                saving={saving}
                source={selectedSource}
              />
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
          <div>
            <dt>Skills</dt>
            <dd>{selectedSource.discoveredSkills?.length ?? 0}</dd>
          </div>
        </dl>
        <SkillPreview
          onSelectSkill={onSelectSkill}
          selectedSkill={selectedSkill}
          skills={selectedSource.discoveredSkills ?? []}
        />
        <SourceDiagnostics source={selectedSource} />
      </article>
    </div>
  );
}

function SourceStateIcon({ source }: Readonly<{ source: SkillSource }>) {
  if (source.active) {
    return <CheckCircle2 aria-label="Active source" size={16} />;
  }

  if (source.status === "sync_failed" || source.status === "rejected") {
    return <AlertTriangle aria-label="Source needs attention" size={16} />;
  }

  return <Box aria-label="Inactive source" size={16} />;
}

function PrimarySourceAction({
  onActivate,
  onApprove,
  onInspect,
  onSync,
  saving,
  source
}: Readonly<{
  onActivate: (source: SkillSource) => void;
  onApprove: (source: SkillSource) => void;
  onInspect: (source: SkillSource) => void;
  onSync: (source: SkillSource) => void;
  saving: boolean;
  source: SkillSource;
}>) {
  if (source.active) {
    return (
      <button className="inline-action" disabled type="button">
        <CheckCircle2 aria-hidden="true" size={16} />
        <span>Active</span>
      </button>
    );
  }

  if (source.localCachePath === null || source.localCachePath === undefined || source.lastSyncStatus === "never_synced") {
    return (
      <button
        className="inline-action primary"
        disabled={saving}
        onClick={() => {
          onSync(source);
        }}
        type="button"
      >
        <Download aria-hidden="true" size={16} />
        <span>Sync source</span>
      </button>
    );
  }

  if (source.status !== "validated" || (source.discoveredSkills?.length ?? 0) === 0) {
    return (
      <button
        className="inline-action primary"
        disabled={saving}
        onClick={() => {
          onInspect(source);
        }}
        type="button"
      >
        <Search aria-hidden="true" size={16} />
        <span>Inspect source</span>
      </button>
    );
  }

  if (!source.permissionGate.approved) {
    return (
      <button
        className="inline-action primary"
        disabled={saving}
        onClick={() => {
          onApprove(source);
        }}
        type="button"
      >
        <ShieldCheck aria-hidden="true" size={16} />
        <span>Review permissions</span>
      </button>
    );
  }

  return (
    <button
      className="inline-action primary"
      disabled={saving}
      onClick={() => {
        onActivate(source);
      }}
      type="button"
    >
      <Play aria-hidden="true" size={16} />
      <span>Activate</span>
    </button>
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
    return (
      <div className="skill-preview-empty">
        <Sparkles aria-hidden="true" size={18} />
        <div>
          <strong>No skill preview yet</strong>
          <span>Sync and inspect this source to load skill manifests.</span>
        </div>
      </div>
    );
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
            <p className="eyebrow">Preview</p>
            <h4>{selectedSkill.name}</h4>
          </div>
        </header>
        <p>{selectedSkill.description}</p>
        <dl>
          <div>
            <dt>Manifest</dt>
            <dd>{selectedSkill.relativePath}</dd>
          </div>
          <div>
            <dt>Route</dt>
            <dd>{selectedSkill.route}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}

function sourceStatusLabel(source: SkillSource) {
  if (source.status === "pending_validation") {
    return "Needs review";
  }

  if (source.status === "validated" && source.permissionGate.approved) {
    return "Ready";
  }

  if (source.status === "sync_failed") {
    return "Failed";
  }

  return formatSourceLabel(source.status);
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
