import { useState } from "react";
import { FolderOpen, GitBranch, GitCommit, GitPullRequest, Save, ShieldCheck } from "lucide-react";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";

type GitPanelProps = Readonly<{
  onWorkspaceChange: (changes: Pick<CockpitWorkspace, "branch" | "path">) => void;
  workspace: CockpitWorkspace;
}>;

export function GitPanel({ onWorkspaceChange, workspace }: GitPanelProps) {
  const [branch, setBranch] = useState(workspace.branch);
  const [path, setPath] = useState(workspace.path);

  function saveGitContext() {
    onWorkspaceChange({
      branch,
      path
    });
  }

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
          <FolderOpen aria-hidden="true" size={20} />
          <strong>Path</strong>
          <span>{workspace.path}</span>
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

      <form
        className="git-context-form"
        onSubmit={(event) => {
          event.preventDefault();
          saveGitContext();
        }}
      >
        <label>
          <span>Branch</span>
          <input
            onChange={(event) => {
              setBranch(event.target.value);
            }}
            value={branch}
          />
        </label>
        <label>
          <span>Workspace path</span>
          <input
            onChange={(event) => {
              setPath(event.target.value);
            }}
            value={path}
          />
        </label>
        <button type="submit">
          <Save aria-hidden="true" size={16} />
          <span>Save Git context</span>
        </button>
      </form>
    </section>
  );
}
