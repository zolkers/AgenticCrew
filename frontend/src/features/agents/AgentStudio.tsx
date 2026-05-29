import type { AgentStudioSnapshot } from "../../shared/types/core";

type AgentStudioProps = Readonly<{
  snapshot: AgentStudioSnapshot;
}>;

export function AgentStudio({ snapshot }: AgentStudioProps) {
  return (
    <section aria-label="Agent Studio">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Custom agents</p>
          <h2>Agent Studio</h2>
        </div>
        <strong>{snapshot.activeTemplateCount} active</strong>
      </header>
      {snapshot.templates.length === 0 ? (
        <p>No custom agent saved</p>
      ) : (
        <ul className="surface-list">
          {snapshot.templates.map((template) => (
            <li key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>
                  {template.role} / v{template.version}
                </span>
              </div>
              <dl>
                <div>
                  <dt>Model</dt>
                  <dd>
                    {template.providerId} / {template.modelId}
                  </dd>
                </div>
                <div>
                  <dt>Harness</dt>
                  <dd>{template.harnessProfileId ?? "None"}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>${(template.budgetCents / 100).toFixed(2)}</dd>
                </div>
              </dl>
              <p>{template.description}</p>
              <ul className="pill-list">
                {template.skillRoutes.map((route) => (
                  <li key={route}>{route}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {snapshot.trainingRuns.length > 0 ? (
        <p>{snapshot.trainingRuns.length} training run queued</p>
      ) : null}
    </section>
  );
}
