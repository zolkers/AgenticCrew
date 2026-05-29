import { useMemo, useState } from "react";
import { Layers3, Plus, Power, Route, Shield } from "lucide-react";
import {
  createHarnessProfile,
  setHarnessProfileActive,
  type InvokeHarnessStudio
} from "../../shared/api/harnessStudioApi";
import type { HarnessStudioSnapshot } from "../../shared/types/core";

type HarnessStudioProps = Readonly<{
  invoke: InvokeHarnessStudio;
  onSnapshotChange?: (snapshot: HarnessStudioSnapshot) => void;
  snapshot: HarnessStudioSnapshot;
}>;

export function HarnessStudio({ invoke, onSnapshotChange, snapshot }: HarnessStudioProps) {
  const [basePolicy, setBasePolicy] = useState("Validate before final claims.");
  const [description, setDescription] = useState("Local execution profile for this workspace.");
  const [error, setError] = useState<null | string>(null);
  const [name, setName] = useState("Workspace Harness");
  const [saving, setSaving] = useState(false);
  const generatedId = useMemo(() => slugify(name), [name]);

  async function submitHarnessProfile() {
    setError(null);
    setSaving(true);

    try {
      const nextSnapshot = await createHarnessProfile(invoke, {
        active: true,
        basePolicy,
        description,
        id: generatedId,
        name
      });
      onSnapshotChange?.(nextSnapshot);
      setName("Workspace Harness");
      setDescription("Local execution profile for this workspace.");
      setBasePolicy("Validate before final claims.");
    } catch {
      setError("Harness creation failed");
    } finally {
      setSaving(false);
    }
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

  return (
    <section aria-label="Harness Studio">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Runtime control</p>
          <h2>Harness Studio</h2>
        </div>
        <strong>{snapshot.activeProfileCount} active</strong>
      </header>
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
            <strong>Precedence</strong>
            <span>workspace / agent / run</span>
          </article>
        </div>
        <ul className="surface-list">
          {snapshot.profiles.map((profile) => (
            <li key={profile.id}>
              <div>
                <strong>{profile.name}</strong>
                <span>{profile.id}</span>
              </div>
              <dl>
                <div>
                  <dt>Version</dt>
                  <dd>{profile.version}</dd>
                </div>
                <div>
                  <dt>Modules</dt>
                  <dd>{profile.modules.length}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{profile.active ? "Active" : "Inactive"}</dd>
                </div>
              </dl>
              <p>{profile.description}</p>
              <ul className="pill-list">
                {profile.modules.map((module) => (
                  <li key={module.id}>{module.name}</li>
                ))}
              </ul>
              <button
                className="inline-action"
                disabled={saving}
                onClick={() => {
                  void toggleHarnessProfile(profile.id, !profile.active);
                }}
                type="button"
              >
                <Power aria-hidden="true" size={16} />
                <span>{profile.active ? "Deactivate" : "Activate"}</span>
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
      <form
        className="harness-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitHarnessProfile();
        }}
      >
        <label>
          <span>Name</span>
          <input
            disabled={saving}
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </label>
        <label>
          <span>Route</span>
          <input disabled readOnly value={`agenticcrew://harnesses/local/${generatedId}`} />
        </label>
        <label>
          <span>Description</span>
          <input
            disabled={saving}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            value={description}
          />
        </label>
        <label>
          <span>Base policy</span>
          <textarea
            disabled={saving}
            onChange={(event) => {
              setBasePolicy(event.target.value);
            }}
            value={basePolicy}
          />
        </label>
        <div className="settings-actions">
          <button disabled={saving || generatedId.length === 0} type="submit">
            <Plus aria-hidden="true" size={16} />
            <span>{saving ? "Creating" : "Create harness"}</span>
          </button>
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

function isSlugCharacter(character: string): boolean {
  return (
    (character >= "a" && character <= "z") ||
    (character >= "0" && character <= "9") ||
    character === "_" ||
    character === "-"
  );
}
