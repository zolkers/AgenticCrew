import { KeyRound, LockKeyhole, RadioTower, SlidersHorizontal } from "lucide-react";

export function SettingsPanel() {
  return (
    <section aria-label="Settings">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Provider</p>
          <h2>Settings</h2>
        </div>
        <strong>OpenAI</strong>
      </header>

      <div className="surface-grid">
        <article className="surface-card">
          <RadioTower aria-hidden="true" size={20} />
          <strong>Connection</strong>
          <span>ChatGPT provider selected</span>
        </article>
        <article className="surface-card">
          <SlidersHorizontal aria-hidden="true" size={20} />
          <strong>Model</strong>
          <span>Selectable in backend phase</span>
        </article>
        <article className="surface-card">
          <KeyRound aria-hidden="true" size={20} />
          <strong>API key</strong>
          <span>Encrypted storage pending</span>
        </article>
        <article className="surface-card">
          <LockKeyhole aria-hidden="true" size={20} />
          <strong>Harness</strong>
          <span>Workspace binding required</span>
        </article>
      </div>
    </section>
  );
}
