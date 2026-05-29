import { useState } from "react";
import { FolderOpen, GitBranch, GitCommit, GitPullRequest, RefreshCcw, Save, ShieldCheck } from "lucide-react";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";

type GitPanelProps = Readonly<{
  onRefreshGitStatus: () => void;
  onWorkspaceChange: (changes: Pick<CockpitWorkspace, "branch" | "path">) => void;
  workspace: CockpitWorkspace;
}>;

export function GitPanel({ onRefreshGitStatus, onWorkspaceChange, workspace }: GitPanelProps) {
  const [branch, setBranch] = useState(workspace.branch);
  const [path, setPath] = useState(workspace.path);
  const gitStatus = workspace.gitStatus;
  const aheadCount = gitStatus?.aheadCount ?? 0;
  const behindCount = gitStatus?.behindCount ?? 0;
  const isDirty = gitStatus?.isDirty ?? false;
  const hasDivergence = aheadCount + behindCount > 0;

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
        <button className="icon-action" onClick={onRefreshGitStatus} type="button">
          <RefreshCcw aria-hidden="true" size={16} />
          <span>Refresh</span>
        </button>
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
          <span>{isDirty ? "Working tree dirty" : "Working tree clean"}</span>
        </article>
        <article className="surface-card">
          <GitPullRequest aria-hidden="true" size={20} />
          <strong>Remote</strong>
          <span>{gitStatus?.remoteBranch ?? "No upstream"}</span>
        </article>
        <article className="surface-card">
          <ShieldCheck aria-hidden="true" size={20} />
          <strong>Sync</strong>
          <span>{hasDivergence ? `${String(aheadCount)} ahead / ${String(behindCount)} behind` : "In sync"}</span>
        </article>
      </div>

      <dl className="git-status-strip" aria-label="Git status details">
        <div>
          <dt>Untracked</dt>
          <dd>{gitStatus?.hasUntracked ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Last refresh</dt>
          <dd>{gitStatus?.lastRefreshedAt ?? "Never"}</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{gitStatus?.lastError ?? "Ready"}</dd>
        </div>
      </dl>

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
