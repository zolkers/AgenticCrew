import { GitBranch, GitCommit, GitPullRequest, ShieldCheck } from "lucide-react";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";

type GitPanelProps = Readonly<{
  workspace: CockpitWorkspace;
}>;

export function GitPanel({ workspace }: GitPanelProps) {
  return (
    <section aria-label="Git Panel">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Repository</p>
          <h2>Git Panel</h2>
        </div>
        <strong>{workspace.branch}</strong>
      </header>

      <div className="surface-grid">
        <article className="surface-card">
          <GitBranch aria-hidden="true" size={20} />
          <strong>Branch</strong>
          <span>{workspace.branch}</span>
        </article>
        <article className="surface-card">
          <GitCommit aria-hidden="true" size={20} />
          <strong>Status</strong>
          <span>{workspace.status}</span>
        </article>
        <article className="surface-card">
          <GitPullRequest aria-hidden="true" size={20} />
          <strong>Review</strong>
          <span>PR workflow ready</span>
        </article>
        <article className="surface-card">
          <ShieldCheck aria-hidden="true" size={20} />
          <strong>Gate</strong>
          <span>Evidence required</span>
        </article>
      </div>
    </section>
  );
}
