use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use super::{
    agents::AgentTemplate, harnesses::HarnessProfile, settings::ReasoningEffort,
    state::AgentOsState, workspaces::WorkspaceRecord,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Queued,
    Preparing,
    Running,
    Stopping,
    Stopped,
    Failed,
    Completed,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunRecord {
    pub id: String,
    pub workspace_id: String,
    pub task: String,
    pub status: RunStatus,
    pub base_branch: String,
    pub run_branch: String,
    pub worktree_path: String,
    #[serde(default)]
    pub manifest_path: String,
    pub agent_template_id: Option<String>,
    pub harness_profile_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    #[serde(default = "default_reasoning_effort")]
    pub reasoning_effort: ReasoningEffort,
    #[serde(default)]
    pub skill_routes: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub stopped_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunManifest {
    pub run_id: String,
    pub workspace_id: String,
    pub task: String,
    pub agent_template_id: Option<String>,
    pub harness_profile_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub reasoning_effort: ReasoningEffort,
    pub skill_routes: Vec<String>,
    pub base_branch: String,
    pub run_branch: String,
    pub worktree_path: String,
    pub manifest_path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunEvent {
    pub id: String,
    pub run_id: String,
    pub level: RunEventLevel,
    pub message: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RunEventLevel {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRunRequest {
    pub id: String,
    pub workspace_id: String,
    pub task: String,
    pub agent_template_id: Option<String>,
    pub harness_profile_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    #[serde(default)]
    pub reasoning_effort: Option<ReasoningEffort>,
    #[serde(default)]
    pub skill_routes: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunsSnapshot {
    pub active_run_id: Option<String>,
    pub events: Vec<RunEvent>,
    pub runs: Vec<RunRecord>,
}

pub fn runs_snapshot_from_state(state: &AgentOsState) -> RunsSnapshot {
    RunsSnapshot {
        active_run_id: state.runs.last().map(|run| run.id.clone()),
        events: state.run_events.clone(),
        runs: state.runs.clone(),
    }
}

impl RunRecord {
    pub fn queued(
        request: StartRunRequest,
        workspace: &WorkspaceRecord,
        agent_template: Option<&AgentTemplate>,
        harness_profile: Option<&HarnessProfile>,
        created_at: String,
    ) -> Result<Self, RunError> {
        let id = validate_identifier("run id", request.id)?;
        let task = validate_required("run task", request.task)?;
        let skill_routes = normalize_skill_routes(request.skill_routes);
        let run_branch = format!("codex/run-{id}");
        let worktree_path = run_worktree_path(&workspace.path, &id);
        let manifest_path = run_manifest_path(&worktree_path);

        Ok(Self {
            agent_template_id: agent_template.map(|template| template.id.clone()),
            base_branch: workspace.branch.clone(),
            created_at: created_at.clone(),
            harness_profile_id: harness_profile.map(|profile| profile.id.clone()),
            id,
            model_id: request
                .model_id
                .or_else(|| agent_template.map(|template| template.model_id.clone())),
            provider_id: request
                .provider_id
                .or_else(|| agent_template.map(|template| template.provider_id.clone())),
            reasoning_effort: request
                .reasoning_effort
                .or_else(|| agent_template.map(|template| template.reasoning_effort))
                .unwrap_or(ReasoningEffort::Medium),
            manifest_path,
            run_branch,
            skill_routes,
            started_at: None,
            status: RunStatus::Queued,
            stopped_at: None,
            task,
            updated_at: created_at,
            workspace_id: workspace.id.clone(),
            worktree_path,
        })
    }

    pub fn to_manifest(&self) -> RunManifest {
        RunManifest {
            agent_template_id: self.agent_template_id.clone(),
            base_branch: self.base_branch.clone(),
            harness_profile_id: self.harness_profile_id.clone(),
            manifest_path: self.manifest_path.clone(),
            model_id: self.model_id.clone(),
            provider_id: self.provider_id.clone(),
            reasoning_effort: self.reasoning_effort,
            run_branch: self.run_branch.clone(),
            run_id: self.id.clone(),
            skill_routes: self.skill_routes.clone(),
            task: self.task.clone(),
            workspace_id: self.workspace_id.clone(),
            worktree_path: self.worktree_path.clone(),
        }
    }
}

fn default_reasoning_effort() -> ReasoningEffort {
    ReasoningEffort::Medium
}

fn normalize_skill_routes(skill_routes: Vec<String>) -> Vec<String> {
    skill_routes
        .into_iter()
        .map(|route| route.trim().to_owned())
        .filter(|route| !route.is_empty())
        .fold(Vec::new(), |mut routes, route| {
            if !routes.contains(&route) {
                routes.push(route);
            }
            routes
        })
}

fn run_worktree_path(workspace_path: &str, run_id: &str) -> String {
    PathBuf::from(workspace_path.trim_end_matches(['\\', '/']))
        .join(".agenticcrew")
        .join("runs")
        .join(run_id)
        .display()
        .to_string()
}

fn run_manifest_path(worktree_path: &str) -> String {
    PathBuf::from(worktree_path)
        .join("run-manifest.json")
        .display()
        .to_string()
}

impl RunEvent {
    pub fn info(run_id: &str, message: impl Into<String>, created_at: String) -> Self {
        Self {
            created_at,
            id: format!("{run_id}-event-1"),
            level: RunEventLevel::Info,
            message: message.into(),
            run_id: run_id.to_owned(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RunError {
    EmptyField { field: &'static str },
    InvalidIdentifier { field: &'static str, value: String },
}

impl std::fmt::Display for RunError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RunError::EmptyField { field } => write!(formatter, "{field} is required"),
            RunError::InvalidIdentifier { field, value } => {
                write!(
                    formatter,
                    "{field} '{value}' must use lowercase letters, numbers, '-' or '_'"
                )
            }
        }
    }
}

impl std::error::Error for RunError {}

fn validate_required(field: &'static str, value: String) -> Result<String, RunError> {
    let value = value.trim();

    if value.is_empty() {
        return Err(RunError::EmptyField { field });
    }

    Ok(value.to_owned())
}

fn validate_identifier(field: &'static str, value: String) -> Result<String, RunError> {
    let value = validate_required(field, value)?;
    let is_valid = value.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == '-'
            || character == '_'
    });

    if !is_valid {
        return Err(RunError::InvalidIdentifier { field, value });
    }

    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::{runs_snapshot_from_state, RunRecord, RunStatus, StartRunRequest};
    use crate::core::settings::ReasoningEffort;
    use crate::core::state::AgentOsState;

    #[test]
    fn queued_run_trims_task_and_derives_git_context() {
        let state = AgentOsState::empty();
        let workspace = state
            .workspaces
            .iter()
            .find(|workspace| workspace.id == "fullstack-app")
            .expect("workspace");
        let agent = state
            .agent_templates
            .iter()
            .find(|template| template.id == "developer-pi");
        let harness = state
            .harness_profiles
            .iter()
            .find(|profile| profile.id == "pi-execution-discipline");

        let run = RunRecord::queued(
            StartRunRequest {
                agent_template_id: Some("developer-pi".to_owned()),
                harness_profile_id: Some("pi-execution-discipline".to_owned()),
                id: "run-1".to_owned(),
                model_id: None,
                provider_id: None,
                reasoning_effort: Some(ReasoningEffort::High),
                skill_routes: vec![
                    "agenticcrew://skills/superpowers/subagent-driven-development".to_owned(),
                    " agenticcrew://skills/superpowers/subagent-driven-development ".to_owned(),
                ],
                task: " Build the run composer ".to_owned(),
                workspace_id: "fullstack-app".to_owned(),
            },
            workspace,
            agent,
            harness,
            "123".to_owned(),
        )
        .expect("run");

        assert_eq!(run.task, "Build the run composer");
        assert_eq!(run.status, RunStatus::Queued);
        assert_eq!(run.base_branch, "dev");
        assert_eq!(run.run_branch, "codex/run-run-1");
        assert!(normalized_path(&run.worktree_path).ends_with("/.agenticcrew/runs/run-1"));
        assert!(
            normalized_path(&run.manifest_path)
                .ends_with("/.agenticcrew/runs/run-1/run-manifest.json")
        );
        assert_eq!(run.provider_id, Some("openai".to_owned()));
        assert_eq!(run.model_id, Some("gpt-5.4".to_owned()));
        assert_eq!(run.reasoning_effort, ReasoningEffort::High);
        assert_eq!(
            run.skill_routes,
            vec!["agenticcrew://skills/superpowers/subagent-driven-development".to_owned()]
        );

        let manifest = run.to_manifest();
        assert_eq!(manifest.run_id, "run-1");
        assert_eq!(manifest.workspace_id, "fullstack-app");
        assert_eq!(manifest.provider_id, Some("openai".to_owned()));
        assert_eq!(manifest.model_id, Some("gpt-5.4".to_owned()));
        assert_eq!(manifest.reasoning_effort, ReasoningEffort::High);
        assert_eq!(manifest.manifest_path, run.manifest_path);
    }

    #[test]
    fn runs_snapshot_returns_active_last_run() {
        let mut state = AgentOsState::empty();
        let run = RunRecord::queued(
            StartRunRequest {
                agent_template_id: None,
                harness_profile_id: None,
                id: "run-1".to_owned(),
                model_id: None,
                provider_id: None,
                reasoning_effort: None,
                skill_routes: Vec::new(),
                task: "Task".to_owned(),
                workspace_id: "fullstack-app".to_owned(),
            },
            &state.workspaces[0],
            None,
            None,
            "123".to_owned(),
        )
        .expect("run");
        state.runs.push(run);

        let snapshot = runs_snapshot_from_state(&state);

        assert_eq!(snapshot.active_run_id, Some("run-1".to_owned()));
        assert_eq!(snapshot.runs.len(), 1);
    }

    fn normalized_path(path: &str) -> String {
        path.replace('\\', "/")
    }
}
