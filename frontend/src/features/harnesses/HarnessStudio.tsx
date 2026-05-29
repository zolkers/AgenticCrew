import { Layers3, Route, Shield } from "lucide-react";
import type { HarnessStudioSnapshot } from "../../shared/types/core";

type HarnessStudioProps = Readonly<{
  snapshot: HarnessStudioSnapshot;
}>;

export function HarnessStudio({ snapshot }: HarnessStudioProps) {
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
            </li>
          ))}
        </ul>
        </>
      )}
    </section>
  );
}
