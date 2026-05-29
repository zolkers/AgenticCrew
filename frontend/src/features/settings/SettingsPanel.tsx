import { KeyRound, LockKeyhole, RadioTower, SlidersHorizontal } from "lucide-react";
import type { SettingsSnapshot } from "../../shared/types/core";
import type { InvokeSettings } from "../../shared/api/settingsApi";

type SettingsPanelProps = Readonly<{
  invoke: InvokeSettings;
  snapshot: SettingsSnapshot;
}>;

export function SettingsPanel({ snapshot }: SettingsPanelProps) {
  const provider = snapshot.aiProvider;
  const keyStatus = provider.apiKeyConfigured
    ? `Configured ending in ${provider.apiKeyLastFour ?? "****"}`
    : "Not configured";

  return (
    <section aria-label="Settings">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Provider</p>
          <h2>Settings</h2>
        </div>
        <strong>{provider.displayName}</strong>
      </header>

      <div className="surface-grid">
        <article className="surface-card">
          <RadioTower aria-hidden="true" size={20} />
          <strong>Connection</strong>
          <span>{provider.providerId === "openai" ? "ChatGPT provider selected" : provider.providerId}</span>
        </article>
        <article className="surface-card">
          <SlidersHorizontal aria-hidden="true" size={20} />
          <strong>Model</strong>
          <span>{provider.selectedModelId}</span>
        </article>
        <article className="surface-card">
          <KeyRound aria-hidden="true" size={20} />
          <strong>API key</strong>
          <span>{keyStatus}</span>
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
