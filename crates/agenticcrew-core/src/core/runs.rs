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
    #[serde(default)]
    pub participants: Vec<RunParticipant>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub stopped_at: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RunCommandStatus {
    Failed,
    Succeeded,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunCommandRecord {
    pub id: String,
    pub run_id: String,
    pub participant_id: String,
    pub command: String,
    pub cwd: String,
    pub status: RunCommandStatus,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordRunCommandRequest {
    pub run_id: String,
    pub participant_id: String,
    pub command: String,
    pub cwd: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RunParticipantExecutionMode {
    ReadOnly,
    Write,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RunParticipantRole {
    Implementation,
    Review,
    Qa,
    Security,
    Documentation,
    Orchestration,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RunParticipantStatus {
    Queued,
    Preparing,
    Running,
    Blocked,
    Failed,
    Completed,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunParticipant {
    pub id: String,
    pub role: RunParticipantRole,
    pub execution_mode: RunParticipantExecutionMode,
    pub status: RunParticipantStatus,
    pub agent_template_id: Option<String>,
    pub harness_profile_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    #[serde(default = "default_reasoning_effort")]
    pub reasoning_effort: ReasoningEffort,
    #[serde(default)]
    pub skill_routes: Vec<String>,
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
    pub participants: Vec<RunParticipant>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunEvent {
    pub id: String,
    pub run_id: String,
    #[serde(default)]
    pub participant_id: Option<String>,
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
    #[serde(default)]
    pub participants: Vec<RunParticipantRequest>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunParticipantRequest {
    pub id: String,
    pub role: RunParticipantRole,
    pub execution_mode: RunParticipantExecutionMode,
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
    pub commands: Vec<RunCommandRecord>,
    pub events: Vec<RunEvent>,
    pub runs: Vec<RunRecord>,
}

pub fn runs_snapshot_from_state(state: &AgentOsState) -> RunsSnapshot {
    RunsSnapshot {
        active_run_id: state.runs.last().map(|run| run.id.clone()),
        commands: state.run_commands.clone(),
        events: state.run_events.clone(),
        runs: state.runs.clone(),
    }
}

impl RunCommandRecord {
    pub fn recorded(
        id: String,
        request: RecordRunCommandRequest,
        created_at: String,
    ) -> Result<Self, RunError> {
        Ok(Self {
            command: validate_required("run command", request.command)?,
            created_at,
            cwd: validate_required("run command cwd", request.cwd)?,
            exit_code: request.exit_code,
            id,
            participant_id: validate_identifier("run participant id", request.participant_id)?,
            run_id: validate_identifier("run id", request.run_id)?,
            status: if request.exit_code == 0 {
                RunCommandStatus::Succeeded
            } else {
                RunCommandStatus::Failed
            },
            stderr: request.stderr,
            stdout: request.stdout,
        })
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
        let agent_template_id = agent_template.map(|template| template.id.clone());
        let harness_profile_id = harness_profile.map(|profile| profile.id.clone());
        let model_id = request
            .model_id
            .or_else(|| agent_template.map(|template| template.model_id.clone()));
        let provider_id = request
            .provider_id
            .or_else(|| agent_template.map(|template| template.provider_id.clone()));
        let reasoning_effort = request
            .reasoning_effort
            .or_else(|| agent_template.map(|template| template.reasoning_effort))
            .unwrap_or(ReasoningEffort::Medium);
        let participants = build_run_participants(
            request.participants,
            &agent_template_id,
            &harness_profile_id,
            &provider_id,
            &model_id,
            reasoning_effort,
            &skill_routes,
        )?;

        Ok(Self {
            agent_template_id,
            base_branch: workspace.branch.clone(),
            created_at: created_at.clone(),
            harness_profile_id,
            id,
            model_id,
            provider_id,
            reasoning_effort,
            manifest_path,
            participants,
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
            participants: self.participants.clone(),
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

fn build_run_participants(
    participant_requests: Vec<RunParticipantRequest>,
    agent_template_id: &Option<String>,
    harness_profile_id: &Option<String>,
    provider_id: &Option<String>,
    model_id: &Option<String>,
    reasoning_effort: ReasoningEffort,
    skill_routes: &[String],
) -> Result<Vec<RunParticipant>, RunError> {
    if participant_requests.is_empty() {
        return Ok(vec![RunParticipant {
            agent_template_id: agent_template_id.clone(),
            execution_mode: RunParticipantExecutionMode::Write,
            harness_profile_id: harness_profile_id.clone(),
            id: "developer".to_owned(),
            model_id: model_id.clone(),
            provider_id: provider_id.clone(),
            reasoning_effort,
            role: RunParticipantRole::Implementation,
            skill_routes: skill_routes.to_vec(),
            status: RunParticipantStatus::Queued,
        }]);
    }

    participant_requests
        .into_iter()
        .map(|participant| {
            Ok(RunParticipant {
                agent_template_id: normalize_optional_identifier(participant.agent_template_id),
                execution_mode: participant.execution_mode,
                harness_profile_id: normalize_optional_identifier(participant.harness_profile_id),
                id: validate_identifier("run participant id", participant.id)?,
                model_id: normalize_optional_identifier(participant.model_id),
                provider_id: normalize_optional_identifier(participant.provider_id),
                reasoning_effort: participant.reasoning_effort.unwrap_or(reasoning_effort),
                role: participant.role,
                skill_routes: normalize_skill_routes(participant.skill_routes),
                status: RunParticipantStatus::Queued,
            })
        })
        .collect()
}

fn normalize_optional_identifier(value: Option<String>) -> Option<String> {
    value
        .map(|candidate| candidate.trim().to_owned())
        .filter(|candidate| !candidate.is_empty())
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
            participant_id: None,
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
    use super::{
        runs_snapshot_from_state, RunParticipantExecutionMode, RunParticipantRequest,
        RunParticipantRole, RunRecord, RunStatus, StartRunRequest,
    };
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
                participants: Vec::new(),
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
        assert!(normalized_path(&run.manifest_path)
            .ends_with("/.agenticcrew/runs/run-1/run-manifest.json"));
        assert_eq!(run.provider_id, Some("openai".to_owned()));
        assert_eq!(run.model_id, Some("gpt-5.4".to_owned()));
        assert_eq!(run.reasoning_effort, ReasoningEffort::High);
        assert_eq!(run.participants.len(), 1);
        assert_eq!(run.participants[0].id, "developer");
        assert_eq!(run.participants[0].role, RunParticipantRole::Implementation);
        assert_eq!(
            run.participants[0].execution_mode,
            RunParticipantExecutionMode::Write
        );
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
        assert_eq!(manifest.participants[0].id, "developer");
        assert_eq!(
            manifest.participants[0].skill_routes,
            vec!["agenticcrew://skills/superpowers/subagent-driven-development".to_owned()]
        );
    }

    #[test]
    fn queued_crew_run_records_multiple_participants() {
        let state = AgentOsState::empty();
        let workspace = state
            .workspaces
            .iter()
            .find(|workspace| workspace.id == "fullstack-app")
            .expect("workspace");

        let run = RunRecord::queued(
            StartRunRequest {
                agent_template_id: Some("developer-pi".to_owned()),
                harness_profile_id: Some("pi-execution-discipline".to_owned()),
                id: "crew-run".to_owned(),
                model_id: Some("gpt-5.4".to_owned()),
                provider_id: Some("openai".to_owned()),
                reasoning_effort: Some(ReasoningEffort::Medium),
                skill_routes: vec!["agenticcrew://skills/superpowers/planning".to_owned()],
                participants: vec![
                    RunParticipantRequest {
                        agent_template_id: Some("developer-pi".to_owned()),
                        execution_mode: RunParticipantExecutionMode::Write,
                        harness_profile_id: Some("pi-execution-discipline".to_owned()),
                        id: "developer".to_owned(),
                        model_id: Some("gpt-5.4".to_owned()),
                        provider_id: Some("openai".to_owned()),
                        reasoning_effort: Some(ReasoningEffort::High),
                        role: RunParticipantRole::Implementation,
                        skill_routes: vec!["agenticcrew://skills/superpowers/planning".to_owned()],
                    },
                    RunParticipantRequest {
                        agent_template_id: Some("developer-pi".to_owned()),
                        execution_mode: RunParticipantExecutionMode::ReadOnly,
                        harness_profile_id: Some("pi-execution-discipline".to_owned()),
                        id: "reviewer".to_owned(),
                        model_id: Some("gpt-5.4".to_owned()),
                        provider_id: Some("openai".to_owned()),
                        reasoning_effort: Some(ReasoningEffort::Medium),
                        role: RunParticipantRole::Review,
                        skill_routes: Vec::new(),
                    },
                ],
                task: "Coordinate a crew".to_owned(),
                workspace_id: "fullstack-app".to_owned(),
            },
            workspace,
            state.agent_templates.first(),
            state.harness_profiles.first(),
            "123".to_owned(),
        )
        .expect("crew run");

        assert_eq!(run.participants.len(), 2);
        assert_eq!(run.participants[0].id, "developer");
        assert_eq!(run.participants[0].reasoning_effort, ReasoningEffort::High);
        assert_eq!(run.participants[1].id, "reviewer");
        assert_eq!(run.participants[1].role, RunParticipantRole::Review);
        assert_eq!(
            run.participants[1].execution_mode,
            RunParticipantExecutionMode::ReadOnly
        );

        let manifest = run.to_manifest();
        assert_eq!(manifest.participants.len(), 2);
        assert_eq!(manifest.participants[1].id, "reviewer");
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
                participants: Vec::new(),
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
