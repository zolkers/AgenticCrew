import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  FileCode,
  GitBranch,
  GitCommit,
  GitPullRequest,
  History,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldCheck
} from "lucide-react";
import type { CockpitWorkspace } from "../../shared/preview/cockpitData";
import { loadCommitPreview, type InvokeCommitPreview } from "../../shared/api/workspaceApi";
import type {
  CommitPreviewFile,
  CommitPreviewLineKind,
  CommitPreviewResponse,
  WorkspaceGitHistoryEntry
} from "../../shared/types/core";
import { uniqueStrings } from "../../shared/strings";

type GitPanelProps = Readonly<{
  branchOptions: readonly string[];
  commitPreviewInvoke: InvokeCommitPreview;
  onRefreshGitStatus: () => void;
  onWorkspaceChange: (changes: Pick<CockpitWorkspace, "branch" | "path">) => void;
  workspace: CockpitWorkspace;
}>;

type CommitPreviewState =
  | Readonly<{ commitHash: string; status: "error"; message: string; workspaceId: string }>
  | Readonly<{ status: "idle" }>
  | Readonly<{ preview: CommitPreviewResponse; status: "ready" }>;

export function GitPanel({
  branchOptions,
  commitPreviewInvoke,
  onRefreshGitStatus,
  onWorkspaceChange,
  workspace
}: GitPanelProps) {
  const gitStatus = workspace.gitStatus;
  const aheadCount = gitStatus?.aheadCount ?? 0;
  const behindCount = gitStatus?.behindCount ?? 0;
  const isDirty = gitStatus?.isDirty ?? false;
  const hasDivergence = aheadCount + behindCount > 0;
  const selectableBranches = useMemo(
    () =>
      uniqueStrings([
        workspace.branch,
        gitStatus?.branch,
        gitStatus?.remoteBranch?.replace(/^origin\//u, ""),
        ...branchOptions
      ]),
    [branchOptions, gitStatus?.branch, gitStatus?.remoteBranch, workspace.branch]
  );
  const historyEntries = workspace.gitHistory ?? [];
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  const selectedCommit = historyEntries.find((entry) => entry.hash === selectedCommitHash) ?? historyEntries.at(0) ?? null;
  const [commitPreviewState, setCommitPreviewState] = useState<CommitPreviewState>({ status: "idle" });

  useEffect(() => {
    if (selectedCommit === null) {
      return;
    }

    let isCurrent = true;
    const requestedCommitHash = selectedCommit.hash;
    void loadCommitPreview(commitPreviewInvoke, {
      commitHash: requestedCommitHash,
      workspaceId: workspace.id
    })
      .then((preview) => {
        if (isCurrent) {
          setCommitPreviewState({ preview, status: "ready" });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setCommitPreviewState({
            commitHash: requestedCommitHash,
            message: error instanceof Error ? error.message : "Commit preview unavailable",
            status: "error",
            workspaceId: workspace.id
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [commitPreviewInvoke, selectedCommit, workspace.id]);

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

      <GitContextForm
        key={`${workspace.id}:${workspace.branch}:${workspace.path}`}
        branch={workspace.branch}
        branchOptions={selectableBranches}
        onSubmit={onWorkspaceChange}
        path={workspace.path}
      />

      <CommitComposer
        aheadCount={aheadCount}
        behindCount={behindCount}
        branch={workspace.branch}
        hasUntracked={gitStatus?.hasUntracked ?? false}
        isDirty={isDirty}
      />

      <section className="git-history-panel" aria-labelledby="git-history-title">
        <header>
          <History aria-hidden="true" size={18} />
          <div>
            <h3 id="git-history-title">History</h3>
            <span>{historyEntries.length === 0 ? "No local history loaded" : `${String(historyEntries.length)} commits`}</span>
          </div>
        </header>
        {historyEntries.length === 0 ? (
          <p className="empty-state">Commit history will appear here once this workspace reports Git log data.</p>
        ) : (
          <div className="git-history-workbench">
            <ol className="git-history-list">
              {historyEntries.map((entry) => (
                <li key={`${entry.hash}:${entry.message}`}>
                  <span className="git-history-node" aria-hidden="true" />
                  <button
                    aria-label={`Preview ${entry.message}`}
                    aria-pressed={entry.hash === selectedCommit?.hash}
                    onClick={() => {
                      setSelectedCommitHash(entry.hash);
                    }}
                    type="button"
                  >
                    <span>
                      <strong>{entry.message}</strong>
                      <small>
                        {entry.hash} · {entry.author} · {entry.relativeTime}
                      </small>
                    </span>
                  </button>
                  <code>{entry.branch}</code>
                </li>
              ))}
            </ol>
            <CommitPreview commit={selectedCommit} previewState={commitPreviewState} workspaceId={workspace.id} />
          </div>
        )}
      </section>
    </section>
  );
}

type CommitFileFilter = "all" | CommitPreviewFile["category"];

const commitFileFilters: readonly { label: string; value: CommitFileFilter }[] = [
  { label: "All", value: "all" },
  { label: "Code", value: "source" },
  { label: "Docs", value: "docs" },
  { label: "Tests", value: "test" },
  { label: "Config", value: "config" },
  { label: "Generated", value: "generated" }
];

function CommitPreview({
  commit,
  previewState,
  workspaceId
}: Readonly<{
  commit: WorkspaceGitHistoryEntry | null;
  previewState: CommitPreviewState;
  workspaceId: string;
}>) {
  const [activeFilter, setActiveFilter] = useState<CommitFileFilter>("all");
  const [fileQuery, setFileQuery] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  if (commit === null) {
    return <p className="empty-state">Select a commit to inspect files, stats, and a diff preview.</p>;
  }

  const preview =
    previewState.status === "ready" &&
    previewState.preview.commitHash === commit.hash &&
    previewState.preview.workspaceId === workspaceId
      ? previewState.preview
      : null;
  const currentPreviewStatus = commitPreviewStatus(previewState, commit.hash, workspaceId, preview);
  const files = preview?.files ?? [];
  const normalizedQuery = fileQuery.trim().toLowerCase();
  const filteredFiles = files.filter(
    (file) =>
      (activeFilter === "all" || file.category === activeFilter) &&
      (normalizedQuery.length === 0 || file.path.toLowerCase().includes(normalizedQuery))
  );
  const selectedFile =
    filteredFiles.find((file) => file.path === selectedFilePath) ??
    filteredFiles.at(0) ??
    null;
  const totalAdditions = files.reduce((total, file) => total + file.additions, 0);
  const totalDeletions = files.reduce((total, file) => total + file.deletions, 0);
  const commitSubject = preview?.metadata.subject ?? commit.message;
  const commitAuthor = preview?.metadata.authorName ?? commit.author;
  const commitTime = preview?.metadata.authoredAt ?? commit.relativeTime;
  const commitHash = preview?.metadata.shortHash ?? commit.hash;

  return (
    <article className="git-commit-preview" aria-labelledby="commit-preview-title">
      <header>
        <div>
          <p className="eyebrow">Selected commit</p>
          <h3 id="commit-preview-title">Commit preview</h3>
          <strong>{commitSubject}</strong>
          <span>{commitHash} · {commitAuthor} · {commitTime}</span>
        </div>
        <div className="git-preview-actions">
          <button type="button">
            <Copy aria-hidden="true" size={15} />
            <span>Copy hash</span>
          </button>
          <button type="button">
            <FileCode aria-hidden="true" size={15} />
            <span>Open diff</span>
          </button>
          <button type="button">
            <GitBranch aria-hidden="true" size={15} />
            <span>Create branch from here</span>
          </button>
        </div>
      </header>

      {currentPreviewStatus === "loading" ? <p className="git-preview-status">Loading diff preview...</p> : null}
      {currentPreviewStatus === "error" && previewState.status === "error" ? (
        <p className="git-preview-status git-preview-status-error">{previewState.message}</p>
      ) : null}

      <dl className="git-preview-stats" aria-label="Commit file statistics">
        <div>
          <dt>Files</dt>
          <dd>{files.length}</dd>
        </div>
        <div>
          <dt>Additions</dt>
          <dd>+{totalAdditions}</dd>
        </div>
        <div>
          <dt>Deletions</dt>
          <dd>-{totalDeletions}</dd>
        </div>
        <div>
          <dt>Branch</dt>
          <dd>{commit.branch}</dd>
        </div>
      </dl>

      <div className="git-preview-toolbar">
        <div className="git-preview-filter-group" aria-label="Changed file filters">
          {commitFileFilters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter.value}
              key={filter.value}
              onClick={() => {
                setActiveFilter(filter.value);
                setSelectedFilePath(null);
              }}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label>
          <Search aria-hidden="true" size={15} />
          <span>Search changed files</span>
          <input
            aria-label="Search changed files"
            onChange={(event) => {
              setFileQuery(event.target.value);
              setSelectedFilePath(null);
            }}
            value={fileQuery}
          />
        </label>
      </div>

      <div className="git-preview-layout">
        <div className="git-preview-files" aria-label="Files changed">
          {filteredFiles.length === 0 ? (
            <p>{currentPreviewStatus === "ready" ? "No files match the current filters" : "No backend diff loaded yet"}</p>
          ) : (
            filteredFiles.map((file) => (
              <button
                aria-label={file.path}
                aria-pressed={file.path === selectedFile?.path}
                key={file.path}
                onClick={() => {
                  setSelectedFilePath(file.path);
                }}
                type="button"
              >
                <span>
                  <strong>{file.path}</strong>
                  <small>{file.status} · {file.category}</small>
                </span>
                <code>+{file.additions} -{file.deletions}</code>
              </button>
            ))
          )}
        </div>
        <section aria-label="Selected file diff" className="git-preview-diff">
          {selectedFile === null ? (
            <p>No file selected</p>
          ) : (
            <>
              <header>
                <strong>{selectedFile.path}</strong>
                <span>{selectedFile.status} · +{selectedFile.additions} -{selectedFile.deletions}</span>
              </header>
              <pre>
                {selectedFile.diffLines.map((line, index) => (
                  <code className={diffLineClassName(line.kind)} key={`${selectedFile.path}:${String(index)}:${line.kind}`}>
                    {line.content}
                  </code>
                ))}
              </pre>
            </>
          )}
        </section>
      </div>
    </article>
  );
}

function diffLineClassName(kind: CommitPreviewLineKind) {
  if (kind === "addition") {
    return "diff-line-added";
  }

  if (kind === "deletion") {
    return "diff-line-deleted";
  }

  return "diff-line-context";
}

function commitPreviewStatus(
  previewState: CommitPreviewState,
  commitHash: string,
  workspaceId: string,
  preview: CommitPreviewResponse | null
) {
  if (
    previewState.status === "error" &&
    previewState.commitHash === commitHash &&
    previewState.workspaceId === workspaceId
  ) {
    return "error";
  }

  if (preview === null) {
    return "loading";
  }

  return "ready";
}

type CommitComposerProps = Readonly<{
  aheadCount: number;
  behindCount: number;
  branch: string;
  hasUntracked: boolean;
  isDirty: boolean;
}>;

function CommitComposer({ aheadCount, behindCount, branch, hasUntracked, isDirty }: CommitComposerProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const trimmedMessage = commitMessage.trim();
  const canCommit = trimmedMessage.length > 0 && (isDirty || hasUntracked);
  const changeSummary = isDirty || hasUntracked ? "Changes ready for review" : "No local changes detected";

  const submitCommit = (action: "commit" | "commit-push") => {
    if (!canCommit) {
      return;
    }

    setLastAction(action === "commit" ? "Commit prepared" : "Commit and push prepared");
  };

  return (
    <section className="git-commit-panel" aria-labelledby="git-commit-title">
      <header>
        <GitCommit aria-hidden="true" size={18} />
        <div>
          <h3 id="git-commit-title">Commit</h3>
          <span>{changeSummary}</span>
        </div>
      </header>
      <div className="git-commit-layout">
        <label>
          <span>Commit message</span>
          <textarea
            aria-label="Commit message"
            onChange={(event) => {
              setCommitMessage(event.target.value);
              setLastAction(null);
            }}
            placeholder="type(scope): describe the change"
            rows={5}
            value={commitMessage}
          />
        </label>
        <aside aria-label="Commit context">
          <dl>
            <div>
              <dt>Branch</dt>
              <dd>{branch}</dd>
            </div>
            <div>
              <dt>Working tree</dt>
              <dd>{isDirty ? "Modified" : "Clean"}</dd>
            </div>
            <div>
              <dt>Untracked</dt>
              <dd>{hasUntracked ? "Present" : "None"}</dd>
            </div>
            <div>
              <dt>Remote</dt>
              <dd>{`${String(aheadCount)} ahead / ${String(behindCount)} behind`}</dd>
            </div>
          </dl>
        </aside>
      </div>
      <div className="git-commit-actions">
        <button
          disabled={!canCommit}
          onClick={() => {
            submitCommit("commit");
          }}
          type="button"
        >
          <GitCommit aria-hidden="true" size={16} />
          <span>Commit</span>
        </button>
        <button
          disabled={!canCommit}
          onClick={() => {
            submitCommit("commit-push");
          }}
          type="button"
        >
          <Send aria-hidden="true" size={16} />
          <span>Commit & Push</span>
        </button>
        {lastAction ? <output>{lastAction}: {trimmedMessage}</output> : null}
      </div>
    </section>
  );
}

type GitContextFormProps = Readonly<{
  branch: string;
  branchOptions: readonly string[];
  onSubmit: (changes: Pick<CockpitWorkspace, "branch" | "path">) => void;
  path: string;
}>;

function GitContextForm({ branch: initialBranch, branchOptions, onSubmit, path: initialPath }: GitContextFormProps) {
  const [branch, setBranch] = useState(initialBranch);

  return (
    <form
      className="git-context-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          branch,
          path: initialPath
        });
      }}
    >
      <label>
        <span>Branch</span>
        <select
          onChange={(event) => {
            setBranch(event.target.value);
          }}
          value={branch}
        >
          {branchOptions.map((branchOption) => (
            <option key={branchOption} value={branchOption}>
              {branchOption}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">
        <Save aria-hidden="true" size={16} />
        <span>Save branch</span>
      </button>
    </form>
  );
}
