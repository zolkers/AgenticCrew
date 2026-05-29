import { useMemo, useState } from "react";
import { Edit3, Layers3, Plus, Power, Route, Shield, Upload, X } from "lucide-react";
import {
  createHarnessProfile,
  importPiExtension,
  setPiExtensionActive,
  setHarnessProfileActive,
  updateHarnessProfile,
  type InvokeHarnessStudio
} from "../../shared/api/harnessStudioApi";
import type {
  DiscoveredSkillManifest,
  HarnessProfile,
  HarnessStudioSnapshot,
  PiExtension
} from "../../shared/types/core";

type HarnessStudioProps = Readonly<{
  availableSkillRoutes?: readonly DiscoveredSkillManifest[];
  invoke: InvokeHarnessStudio;
  onSnapshotChange?: (snapshot: HarnessStudioSnapshot) => void;
  snapshot: HarnessStudioSnapshot;
}>;

export function HarnessStudio({ availableSkillRoutes, invoke, onSnapshotChange, snapshot }: HarnessStudioProps) {
  const [basePolicy, setBasePolicy] = useState("Validate before final claims.");
  const [description, setDescription] = useState("Local execution profile for this workspace.");
  const [editingProfileId, setEditingProfileId] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);
  const [piBasePolicy, setPiBasePolicy] = useState("Require explicit PI review before release claims.");
  const [piDescription, setPiDescription] = useState("Local PI extension for this workspace.");
  const [piName, setPiName] = useState("Release PI Extension");
  const [isEditorOpen, setIsEditorOpen] = useState(snapshot.profiles.length === 0);
  const [name, setName] = useState("Workspace Harness");
  const [saving, setSaving] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(snapshot.profiles[0]?.id ?? "");
  const [skillRoutesText, setSkillRoutesText] = useState("");
  const selectedSkillRoutes = splitSkillRoutes(skillRoutesText);
  const piExtensions = snapshot.piExtensions ?? [];
  const effectiveHarnesses = snapshot.effectiveHarnesses ?? effectiveHarnessPreviews(snapshot.profiles, piExtensions);
  const generatedId = useMemo(() => slugify(name), [name]);
  const generatedPiId = useMemo(() => slugify(piName), [piName]);
  const selectedProfile = snapshot.profiles.find((profile) => profile.id === selectedProfileId) ?? snapshot.profiles[0];
  const submitLabel = saving ? "Saving" : getHarnessSubmitLabel(editingProfileId);

  async function submitHarnessProfile() {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot =
        editingProfileId === null
          ? await createHarnessProfile(invoke, {
              active: true,
              basePolicy,
              description,
              id: generatedId,
              name,
              skillRoutes: selectedSkillRoutes
            })
          : await updateHarnessProfile(invoke, {
              basePolicy,
              description,
              name,
              profileId: editingProfileId,
              skillRoutes: selectedSkillRoutes
            });
      onSnapshotChange?.(nextSnapshot);
      resetForm();
      setIsEditorOpen(false);
    } catch {
      setError(editingProfileId === null ? "Harness creation failed" : "Harness update failed");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(profile: HarnessProfile) {
    const basePolicyModule = profile.modules.find((module) => module.kind === "base_policy");

    setEditingProfileId(profile.id);
    setName(profile.name);
    setDescription(profile.description);
    setBasePolicy(basePolicyModule?.content ?? "");
    setSkillRoutesText(profile.skillRoutes.join("\n"));
    setError(null);
    setIsEditorOpen(true);
  }

  function resetForm(options: { close?: boolean } = {}) {
    setEditingProfileId(null);
    setName("Workspace Harness");
    setDescription("Local execution profile for this workspace.");
    setBasePolicy("Validate before final claims.");
    setSkillRoutesText("");
    setError(null);
    if (options.close === true && snapshot.profiles.length > 0) {
      setIsEditorOpen(false);
    }
  }

  function beginCreate() {
    resetForm();
    setIsEditorOpen(true);
  }

  function toggleSkillRoute(route: string) {
    const routeSet = new Set(selectedSkillRoutes);

    if (routeSet.has(route)) {
      routeSet.delete(route);
    } else {
      routeSet.add(route);
    }

    setSkillRoutesText([...routeSet].join("\n"));
  }

  async function toggleHarnessProfile(profileId: string, active: boolean) {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot = await setHarnessProfileActive(invoke, { active, profileId });
      onSnapshotChange?.(nextSnapshot);
    } catch {
      setError("Harness status update failed");
    } finally {
      setSaving(false);
    }
  }

  async function importLocalPiExtension() {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot = await importPiExtension(invoke, {
        agentPersona: null,
        basePolicy: piBasePolicy,
        behaviorRules: [],
        description: piDescription,
        id: generatedPiId,
        name: piName,
        outputStyle: null,
        projectMemory: null,
        safetyRules: [],
        toolRules: []
      });
      onSnapshotChange?.(nextSnapshot);
      setPiName("Release PI Extension");
      setPiDescription("Local PI extension for this workspace.");
      setPiBasePolicy("Require explicit PI review before release claims.");
    } catch {
      setError("PI extension import failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePiExtension(extensionId: string, active: boolean) {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot = await setPiExtensionActive(invoke, { active, extensionId });
      onSnapshotChange?.(nextSnapshot);
    } catch {
      setError("PI extension status update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Harness Studio">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Runtime control</p>
          <h2>Harness Studio</h2>
        </div>
        <div className="studio-header-actions">
          <strong>{snapshot.activeProfileCount} active</strong>
          <button className="inline-action primary" onClick={beginCreate} type="button">
            <Plus aria-hidden="true" size={16} />
            <span>New harness</span>
          </button>
        </div>
      </header>
      {error && !isEditorOpen ? (
        <output aria-live="polite" className="settings-error studio-error">
          {error}
        </output>
      ) : null}
      {snapshot.profiles.length === 0 ? (
        <p>No harness profile registered</p>
      ) : (
        <>
        <div className="surface-grid compact">
          <article className="surface-card">
            <Layers3 aria-hidden="true" size={20} />
            <strong>Profiles</strong>
            <span>{snapshot.profiles.length}</span>
          </article>
          <article className="surface-card">
            <Route aria-hidden="true" size={20} />
            <strong>Bindings</strong>
            <span>{snapshot.bindings.length}</span>
          </article>
          <article className="surface-card">
            <Shield aria-hidden="true" size={20} />
            <strong>PI extensions</strong>
            <span>{piExtensions.length} inspected</span>
          </article>
        </div>
        <HarnessProfileBrowser
          onEdit={beginEdit}
          onSelect={setSelectedProfileId}
          onToggleActive={(profile) => {
            void toggleHarnessProfile(profile.id, !profile.active);
          }}
          profiles={snapshot.profiles}
          saving={saving}
          selectedProfile={selectedProfile}
        />
        {effectiveHarnesses.length > 0 ? <EffectiveHarnessDrawer harnesses={effectiveHarnesses} /> : null}
        </>
      )}
      <details className="harness-studio-drawer">
        <summary>
          <Upload aria-hidden="true" size={18} />
          <h3 id="pi-extensions-title">PI extensions</h3>
        </summary>
        {piExtensions.length === 0 ? <p>No PI extension imported</p> : null}
        {piExtensions.length > 0 ? (
          <ul className="surface-list">
            {piExtensions.map((extension) => (
              <li key={extension.id}>
                <div>
                  <strong>{extension.name}</strong>
                  <span>{extension.route}</span>
                </div>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{extension.active ? "Active" : "Inactive"}</dd>
                  </div>
                  <div>
                    <dt>Modules</dt>
                    <dd>{extension.modules.length}</dd>
                  </div>
                </dl>
                <p>{extension.description}</p>
                <button
                  className="inline-action"
                  disabled={saving}
                  onClick={() => {
                    void togglePiExtension(extension.id, !extension.active);
                  }}
                  type="button"
                >
                  <Power aria-hidden="true" size={16} />
                  <span>{extension.active ? "Deactivate PI" : "Activate PI"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="harness-form"
          onSubmit={(event) => {
            event.preventDefault();
            void importLocalPiExtension();
          }}
        >
          <label>
            <span>PI name</span>
            <input
              disabled={saving}
              onChange={(event) => {
                setPiName(event.target.value);
              }}
              value={piName}
            />
          </label>
          <label>
            <span>PI route</span>
            <input disabled readOnly value={`agenticcrew://pi/local/${generatedPiId}`} />
          </label>
          <label>
            <span>PI description</span>
            <input
              disabled={saving}
              onChange={(event) => {
                setPiDescription(event.target.value);
              }}
              value={piDescription}
            />
          </label>
          <label>
            <span>PI base policy</span>
            <textarea
              disabled={saving}
              onChange={(event) => {
                setPiBasePolicy(event.target.value);
              }}
              value={piBasePolicy}
            />
          </label>
          <div className="settings-actions">
            <button disabled={saving || generatedPiId.length === 0} type="submit">
              <Upload aria-hidden="true" size={16} />
              <span>Import PI extension</span>
            </button>
          </div>
        </form>
      </details>
      {isEditorOpen ? (
        <HarnessEditorPanel
          availableSkillRoutes={availableSkillRoutes}
          basePolicy={basePolicy}
          description={description}
          editingProfileId={editingProfileId}
          error={error}
          generatedId={generatedId}
          name={name}
          onBasePolicyChange={setBasePolicy}
          onClose={() => {
            resetForm({ close: true });
          }}
          onDescriptionChange={setDescription}
          onNameChange={setName}
          onSkillRoutesChange={setSkillRoutesText}
          onSubmit={submitHarnessProfile}
          saving={saving}
          selectedSkillRoutes={selectedSkillRoutes}
          shouldShowClose={snapshot.profiles.length > 0}
          skillRoutesText={skillRoutesText}
          submitLabel={submitLabel}
          toggleSkillRoute={toggleSkillRoute}
        />
      ) : null}
    </section>
  );
}

type HarnessEditorPanelProps = Readonly<{
  availableSkillRoutes?: readonly DiscoveredSkillManifest[];
  basePolicy: string;
  description: string;
  editingProfileId: null | string;
  error: null | string;
  generatedId: string;
  name: string;
  onBasePolicyChange: (value: string) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSkillRoutesChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  saving: boolean;
  selectedSkillRoutes: readonly string[];
  shouldShowClose: boolean;
  skillRoutesText: string;
  submitLabel: string;
  toggleSkillRoute: (route: string) => void;
}>;

function HarnessEditorPanel({
  availableSkillRoutes,
  basePolicy,
  description,
  editingProfileId,
  error,
  generatedId,
  name,
  onBasePolicyChange,
  onClose,
  onDescriptionChange,
  onNameChange,
  onSkillRoutesChange,
  onSubmit,
  saving,
  selectedSkillRoutes,
  shouldShowClose,
  skillRoutesText,
  submitLabel,
  toggleSkillRoute
}: HarnessEditorPanelProps) {
  const isCreating = editingProfileId === null;

  return (
    <section aria-label={isCreating ? "Create harness panel" : "Edit harness panel"} className="studio-editor-panel">
      <header>
        <div>
          <p className="eyebrow">{isCreating ? "New runtime profile" : "Edit runtime profile"}</p>
          <h3>{isCreating ? "Create harness" : "Save harness changes"}</h3>
        </div>
        {shouldShowClose ? (
          <button className="icon-action" disabled={saving} onClick={onClose} type="button">
            <X aria-hidden="true" size={16} />
            <span>Close</span>
          </button>
        ) : null}
      </header>
      <dl className="studio-editor-summary">
        <div>
          <dt>Route</dt>
          <dd>{editingProfileId ?? (generatedId || "No route")}</dd>
        </div>
        <div>
          <dt>Skills</dt>
          <dd>{selectedSkillRoutes.length}</dd>
        </div>
        <div>
          <dt>Policy</dt>
          <dd>{basePolicy.trim().length > 0 ? "Defined" : "Empty"}</dd>
        </div>
      </dl>
      <form
        className="harness-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label>
          <span>Name</span>
          <input disabled={saving} onChange={(event) => { onNameChange(event.target.value); }} value={name} />
        </label>
        <label>
          <span>Route</span>
          <input disabled readOnly value={`agenticcrew://harnesses/local/${editingProfileId ?? generatedId}`} />
        </label>
        <label>
          <span>Description</span>
          <input disabled={saving} onChange={(event) => { onDescriptionChange(event.target.value); }} value={description} />
        </label>
        <label>
          <span>Base policy</span>
          <textarea disabled={saving} onChange={(event) => { onBasePolicyChange(event.target.value); }} value={basePolicy} />
        </label>
        <label>
          <span>Skill routes</span>
          <textarea disabled={saving} onChange={(event) => { onSkillRoutesChange(event.target.value); }} value={skillRoutesText} />
        </label>
        <HarnessSkillRoutePicker
          availableSkillRoutes={availableSkillRoutes}
          saving={saving}
          selectedSkillRoutes={selectedSkillRoutes}
          toggleSkillRoute={toggleSkillRoute}
        />
        <div className="settings-actions">
          <button disabled={saving || generatedId.length === 0} type="submit">
            <Plus aria-hidden="true" size={16} />
            <span>{submitLabel}</span>
          </button>
          {isCreating ? null : (
            <button disabled={saving} onClick={onClose} type="button">
              <X aria-hidden="true" size={16} />
              <span>Cancel</span>
            </button>
          )}
          {error ? (
            <output aria-live="polite" className="settings-error">
              {error}
            </output>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function HarnessSkillRoutePicker({
  availableSkillRoutes,
  saving,
  selectedSkillRoutes,
  toggleSkillRoute
}: Readonly<{
  availableSkillRoutes?: readonly DiscoveredSkillManifest[];
  saving: boolean;
  selectedSkillRoutes: readonly string[];
  toggleSkillRoute: (route: string) => void;
}>) {
  if (availableSkillRoutes === undefined || availableSkillRoutes.length === 0) {
    return null;
  }

  return (
    <div aria-label="Available harness skill routes" className="route-picker">
      {availableSkillRoutes.map((skill) => {
        const selected = selectedSkillRoutes.includes(skill.route);

        return (
          <button
            aria-pressed={selected}
            disabled={saving}
            key={skill.route}
            onClick={() => {
              toggleSkillRoute(skill.route);
            }}
            type="button"
          >
            <Route aria-hidden="true" size={14} />
            <span>{skill.name}</span>
            <code>{skill.route}</code>
          </button>
        );
      })}
    </div>
  );
}

type HarnessProfileBrowserProps = Readonly<{
  onEdit: (profile: HarnessProfile) => void;
  onSelect: (profileId: string) => void;
  onToggleActive: (profile: HarnessProfile) => void;
  profiles: readonly HarnessProfile[];
  saving: boolean;
  selectedProfile: HarnessProfile;
}>;

function HarnessProfileBrowser({
  onEdit,
  onSelect,
  onToggleActive,
  profiles,
  saving,
  selectedProfile
}: HarnessProfileBrowserProps) {
  const basePolicyModule = selectedProfile.modules.find((module) => module.kind === "base_policy");

  return (
    <div className="harness-studio-layout">
      <nav className="harness-roster-panel" aria-label="Harness profiles">
        {profiles.map((profile) => (
          <button
            aria-pressed={selectedProfile.id === profile.id}
            key={profile.id}
            onClick={() => {
              onSelect(profile.id);
            }}
            type="button"
          >
            <span className={`status-dot status-dot-${profile.active ? "active" : "queued"}`} aria-hidden="true" />
            <span>
              <strong>{profile.name}</strong>
              <small>
                {profile.active ? "active" : "inactive"} / v{profile.version}
              </small>
            </span>
            <code>{profile.modules.length} modules</code>
          </button>
        ))}
      </nav>
      <article className="harness-detail-panel" aria-label="Selected harness details">
        <header>
          <div>
            <p className="eyebrow">Selected harness</p>
            <h3>{selectedProfile.name}</h3>
            <span>
              {selectedProfile.id} / {selectedProfile.active ? "active" : "inactive"}
            </span>
          </div>
          <div className="harness-detail-actions">
            <button
              className="inline-action"
              disabled={saving}
              onClick={() => {
                onToggleActive(selectedProfile);
              }}
              type="button"
            >
              <Power aria-hidden="true" size={16} />
              <span>{selectedProfile.active ? "Deactivate" : "Activate"}</span>
            </button>
            <button
              className="inline-action"
              disabled={saving}
              onClick={() => {
                onEdit(selectedProfile);
              }}
              type="button"
            >
              <Edit3 aria-hidden="true" size={16} />
              <span>Edit</span>
            </button>
          </div>
        </header>
        <dl>
          <div>
            <dt>Version</dt>
            <dd>{selectedProfile.version}</dd>
          </div>
          <div>
            <dt>Modules</dt>
            <dd>{selectedProfile.modules.length}</dd>
          </div>
          <div>
            <dt>Skill routes</dt>
            <dd>{selectedProfile.skillRoutes.length}</dd>
          </div>
        </dl>
        <p>{selectedProfile.description}</p>
        <div className="harness-policy-preview">
          <strong>{basePolicyModule?.name ?? "Base policy"}</strong>
          <p>{basePolicyModule?.content.trim() || "No base policy content"}</p>
        </div>
        <ul className="pill-list compact-pills" aria-label={`${selectedProfile.name} modules`}>
          {selectedProfile.modules.map((module) => (
            <li key={module.id}>{module.name}</li>
          ))}
        </ul>
        {selectedProfile.skillRoutes.length > 0 ? (
          <ul className="pill-list compact-pills" aria-label={`${selectedProfile.name} skill routes`}>
            {selectedProfile.skillRoutes.map((route) => (
              <li key={route}>{route}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}

type EffectiveHarnessPreview = NonNullable<HarnessStudioSnapshot["effectiveHarnesses"]>[number];

function EffectiveHarnessDrawer({ harnesses }: Readonly<{ harnesses: readonly EffectiveHarnessPreview[] }>) {
  return (
    <details className="harness-studio-drawer">
      <summary>
        <Layers3 aria-hidden="true" size={18} />
        <h3 id="effective-harness-title">Effective harness</h3>
      </summary>
      <ul className="surface-list">
        {harnesses.map((harness) => (
          <li key={harness.profileId}>
            <div>
              <strong>{harness.profileName}</strong>
              <span>{harness.profileId}</span>
            </div>
            <dl>
              <div>
                <dt>Enabled modules</dt>
                <dd>{harness.enabledModuleCount}</dd>
              </div>
              <div>
                <dt>Skill routes</dt>
                <dd>{harness.skillRouteCount}</dd>
              </div>
              <div>
                <dt>PI extensions</dt>
                <dd>{harness.piExtensionCount ?? 0}</dd>
              </div>
            </dl>
            <p>{harness.preview || "No enabled module content"}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .split("")
    .map((character) => (isSlugCharacter(character) ? character : "-"))
    .join("");

  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .join("-");
}

function getHarnessSubmitLabel(editingProfileId: null | string): string {
  return editingProfileId === null ? "Create harness" : "Save harness";
}

function splitSkillRoutes(value: string): string[] {
  return value
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((route) => route.trim())
    .filter((route) => route.length > 0);
}

function effectiveHarnessPreviews(profiles: readonly HarnessProfile[], piExtensions: readonly PiExtension[]) {
  const activePiExtensions = piExtensions.filter((extension) => extension.active);
  const piExtensionContent = activePiExtensions
    .flatMap((extension) => extension.modules)
    .filter((module) => module.enabled)
    .map((module) => module.content.trim())
    .filter(Boolean);

  return profiles
    .filter((profile) => profile.active)
    .map((profile) => {
      const enabledModules = profile.modules.filter((module) => module.enabled);
      const preview = [
        ...enabledModules.map((module) => module.content.trim()).filter(Boolean),
        ...piExtensionContent
      ].join("\n\n");

      return {
        enabledModuleCount: enabledModules.length,
        piExtensionCount: activePiExtensions.length,
        preview,
        profileId: profile.id,
        profileName: profile.name,
        skillRouteCount: profile.skillRoutes.length
      };
    });
}

function isSlugCharacter(character: string): boolean {
  return (
    (character >= "a" && character <= "z") ||
    (character >= "0" && character <= "9") ||
    character === "_" ||
    character === "-"
  );
}
