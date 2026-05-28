use serde::{Deserialize, Serialize};
use std::{
    fmt, fs, io,
    path::{Path, PathBuf},
};

use super::{
    costs::ModelCallEstimate,
    evidence::{CommandExitCodeEvidence, Evidence},
    sessions::{
        Checkpoint, CheckpointStatus, DesignSession, FeatureSession, GoalObject,
        SessionTransitionError,
    },
    skills::{RegisterGitHubSkillSourceRequest, SkillSource, SkillSourceError},
};

pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct AgentOsState {
    pub schema_version: u32,
    pub goals: Vec<GoalObject>,
    pub design_sessions: Vec<DesignSession>,
    pub feature_sessions: Vec<FeatureSession>,
    pub evidence: Vec<Evidence>,
    pub model_call_estimates: Vec<ModelCallEstimate>,
    #[serde(default)]
    pub skill_sources: Vec<SkillSource>,
}

impl AgentOsState {
    pub fn empty() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            goals: Vec::new(),
            design_sessions: Vec::new(),
            feature_sessions: Vec::new(),
            evidence: Vec::new(),
            model_call_estimates: Vec::new(),
            skill_sources: Vec::new(),
        }
    }

    pub fn create_feature_session(
        &mut self,
        request: CreateFeatureSessionRequest,
    ) -> Result<(), StateMutationError> {
        if self
            .feature_sessions
            .iter()
            .any(|session| session.id == request.session_id)
        {
            return Err(StateMutationError::DuplicateFeatureSession {
                session_id: request.session_id,
            });
        }

        if !self.goals.iter().any(|goal| goal.id == request.goal.id) {
            self.goals.push(request.goal.clone());
        }

        self.feature_sessions.push(FeatureSession {
            id: request.session_id,
            title: request.title,
            goal_object_id: request.goal.id,
            team_id: request.team_id,
            branch: request.branch,
            checkpoints: request
                .checkpoints
                .into_iter()
                .map(Checkpoint::from)
                .collect(),
            status: super::sessions::FeatureSessionStatus::Draft,
        });

        Ok(())
    }

    pub fn add_checkpoint(
        &mut self,
        session_id: &str,
        request: CreateCheckpointRequest,
    ) -> Result<(), StateMutationError> {
        let session = self
            .feature_sessions
            .iter_mut()
            .find(|session| session.id == session_id)
            .ok_or_else(|| StateMutationError::MissingFeatureSession {
                session_id: session_id.to_owned(),
            })?;

        if session
            .checkpoints
            .iter()
            .any(|checkpoint| checkpoint.id == request.id)
        {
            return Err(StateMutationError::DuplicateCheckpoint {
                session_id: session_id.to_owned(),
                checkpoint_id: request.id,
            });
        }

        session.checkpoints.push(Checkpoint::from(request));

        Ok(())
    }

    pub fn record_command_evidence(
        &mut self,
        request: RecordCommandEvidenceRequest,
    ) -> Result<(), StateMutationError> {
        let session = self
            .feature_sessions
            .iter_mut()
            .find(|session| session.id == request.session_id)
            .ok_or_else(|| StateMutationError::MissingFeatureSession {
                session_id: request.session_id.clone(),
            })?;
        let checkpoint = session
            .checkpoints
            .iter_mut()
            .find(|checkpoint| checkpoint.id == request.checkpoint_id)
            .ok_or_else(|| StateMutationError::MissingCheckpoint {
                session_id: request.session_id.clone(),
                checkpoint_id: request.checkpoint_id.clone(),
            })?;

        let evidence = Evidence::command_exit_code(CommandExitCodeEvidence {
            evidence_id: request.evidence_id,
            session_id: request.session_id,
            checkpoint_id: request.checkpoint_id,
            command: request.command,
            exit_code: request.exit_code,
            created_at: request.created_at,
            created_by: request.created_by,
        });

        if evidence.command_succeeded()
            && checkpoint
                .required_evidence
                .iter()
                .any(|required| required == "command_exit_code")
        {
            checkpoint.status = CheckpointStatus::Passed;
        }

        self.evidence.push(evidence);

        Ok(())
    }

    pub fn close_feature_session(&mut self, session_id: &str) -> Result<(), StateMutationError> {
        let position = self
            .feature_sessions
            .iter()
            .position(|session| session.id == session_id)
            .ok_or_else(|| StateMutationError::MissingFeatureSession {
                session_id: session_id.to_owned(),
            })?;
        let closed = self.feature_sessions[position]
            .clone()
            .close()
            .map_err(StateMutationError::CheckpointNotPassed)?;

        self.feature_sessions[position] = closed;

        Ok(())
    }

    pub fn register_github_skill_source(
        &mut self,
        request: RegisterGitHubSkillSourceRequest,
    ) -> Result<(), StateMutationError> {
        if self
            .skill_sources
            .iter()
            .any(|source| source.id == request.id)
        {
            return Err(StateMutationError::DuplicateSkillSource {
                source_id: request.id,
            });
        }

        self.skill_sources
            .push(SkillSource::github(request).map_err(StateMutationError::InvalidSkillSource)?);

        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct CreateFeatureSessionRequest {
    pub session_id: String,
    pub title: String,
    pub goal: GoalObject,
    pub team_id: String,
    pub branch: String,
    pub checkpoints: Vec<CreateCheckpointRequest>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct CreateCheckpointRequest {
    pub id: String,
    pub label: String,
    pub owner_agent: String,
    pub required_evidence: Vec<String>,
}

impl From<CreateCheckpointRequest> for Checkpoint {
    fn from(request: CreateCheckpointRequest) -> Self {
        Self {
            id: request.id,
            label: request.label,
            owner_agent: request.owner_agent,
            required_evidence: request.required_evidence,
            status: CheckpointStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct RecordCommandEvidenceRequest {
    pub evidence_id: String,
    pub session_id: String,
    pub checkpoint_id: String,
    pub command: String,
    pub exit_code: i32,
    pub created_at: String,
    pub created_by: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StateMutationError {
    DuplicateFeatureSession {
        session_id: String,
    },
    MissingFeatureSession {
        session_id: String,
    },
    DuplicateCheckpoint {
        session_id: String,
        checkpoint_id: String,
    },
    MissingCheckpoint {
        session_id: String,
        checkpoint_id: String,
    },
    DuplicateSkillSource {
        source_id: String,
    },
    InvalidSkillSource(SkillSourceError),
    CheckpointNotPassed(SessionTransitionError),
}

impl fmt::Display for StateMutationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StateMutationError::DuplicateFeatureSession { session_id } => {
                write!(formatter, "feature session '{session_id}' already exists")
            }
            StateMutationError::MissingFeatureSession { session_id } => {
                write!(formatter, "feature session '{session_id}' does not exist")
            }
            StateMutationError::DuplicateCheckpoint {
                session_id,
                checkpoint_id,
            } => {
                write!(
                    formatter,
                    "checkpoint '{checkpoint_id}' already exists in feature session '{session_id}'"
                )
            }
            StateMutationError::MissingCheckpoint {
                session_id,
                checkpoint_id,
            } => {
                write!(
                    formatter,
                    "checkpoint '{checkpoint_id}' does not exist in feature session '{session_id}'"
                )
            }
            StateMutationError::DuplicateSkillSource { source_id } => {
                write!(formatter, "skill source '{source_id}' already exists")
            }
            StateMutationError::InvalidSkillSource(error) => {
                write!(formatter, "invalid skill source: {error}")
            }
            StateMutationError::CheckpointNotPassed(error) => {
                write!(formatter, "feature session cannot close: {error:?}")
            }
        }
    }
}

impl std::error::Error for StateMutationError {}

#[derive(Debug)]
pub enum StateStoreError {
    Io {
        path: PathBuf,
        source: io::Error,
    },
    Json {
        path: PathBuf,
        source: serde_json::Error,
    },
    UnsupportedSchemaVersion {
        path: PathBuf,
        expected: u32,
        actual: u32,
    },
}

impl fmt::Display for StateStoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StateStoreError::Io { path, source } => {
                write!(
                    formatter,
                    "state store io error at {}: {source}",
                    path.display()
                )
            }
            StateStoreError::Json { path, source } => {
                write!(
                    formatter,
                    "state store json error at {}: {source}",
                    path.display()
                )
            }
            StateStoreError::UnsupportedSchemaVersion {
                path,
                expected,
                actual,
            } => {
                write!(
                    formatter,
                    "state store schema version error at {}: expected {expected}, got {actual}",
                    path.display()
                )
            }
        }
    }
}

impl std::error::Error for StateStoreError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            StateStoreError::Io { source, .. } => Some(source),
            StateStoreError::Json { source, .. } => Some(source),
            StateStoreError::UnsupportedSchemaVersion { .. } => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JsonStateStore {
    path: PathBuf,
}

impl JsonStateStore {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub fn load(&self) -> Result<AgentOsState, StateStoreError> {
        if !self.path.exists() {
            return Ok(AgentOsState::empty());
        }

        let content = fs::read_to_string(&self.path).map_err(|source| StateStoreError::Io {
            path: self.path.clone(),
            source,
        })?;

        let state: AgentOsState =
            serde_json::from_str(&content).map_err(|source| StateStoreError::Json {
                path: self.path.clone(),
                source,
            })?;

        if state.schema_version != CURRENT_SCHEMA_VERSION {
            return Err(StateStoreError::UnsupportedSchemaVersion {
                path: self.path.clone(),
                expected: CURRENT_SCHEMA_VERSION,
                actual: state.schema_version,
            });
        }

        Ok(state)
    }

    pub fn save(&self, state: &AgentOsState) -> Result<(), StateStoreError> {
        if state.schema_version != CURRENT_SCHEMA_VERSION {
            return Err(StateStoreError::UnsupportedSchemaVersion {
                path: self.path.clone(),
                expected: CURRENT_SCHEMA_VERSION,
                actual: state.schema_version,
            });
        }

        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|source| StateStoreError::Io {
                path: parent.to_path_buf(),
                source,
            })?;
        }

        let temp_path = temp_path_for(&self.path);
        let content =
            serde_json::to_string_pretty(state).map_err(|source| StateStoreError::Json {
                path: self.path.clone(),
                source,
            })?;

        fs::write(&temp_path, content).map_err(|source| StateStoreError::Io {
            path: temp_path.clone(),
            source,
        })?;
        fs::rename(&temp_path, &self.path).map_err(|source| StateStoreError::Io {
            path: self.path.clone(),
            source,
        })
    }
}

fn temp_path_for(path: &Path) -> PathBuf {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map_or_else(|| "tmp".to_owned(), |extension| format!("{extension}.tmp"));

    path.with_extension(extension)
}

#[cfg(test)]
mod tests {
    use std::{
        env, fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{
        temp_path_for, AgentOsState, CreateCheckpointRequest, CreateFeatureSessionRequest,
        JsonStateStore, RecordCommandEvidenceRequest, StateMutationError, StateStoreError,
        CURRENT_SCHEMA_VERSION,
    };
    use crate::core::{
        costs::ModelCallEstimate,
        evidence::{CommandExitCodeEvidence, Evidence},
        sessions::{
            Checkpoint, CheckpointStatus, DesignSession, FeatureSession, GoalObject,
            SessionTransitionError,
        },
        skills::RegisterGitHubSkillSourceRequest,
    };

    #[test]
    fn empty_state_uses_current_schema_version() {
        let state = AgentOsState::empty();

        assert_eq!(state.schema_version, CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn empty_state_starts_without_product_records() {
        let state = AgentOsState::empty();

        assert!(state.goals.is_empty());
        assert!(state.design_sessions.is_empty());
        assert!(state.feature_sessions.is_empty());
        assert!(state.evidence.is_empty());
        assert!(state.model_call_estimates.is_empty());
    }

    #[test]
    fn missing_state_file_loads_empty_state() {
        let path = test_path("missing_state_file_loads_empty_state", "state.json");
        let store = JsonStateStore::new(&path);

        let loaded = store.load().expect("missing state file should load");

        assert_eq!(loaded, AgentOsState::empty());
    }

    #[test]
    fn create_feature_session_adds_goal_session_and_pending_checkpoints() {
        let mut state = AgentOsState::empty();

        state
            .create_feature_session(create_session_request("feat_state_v1"))
            .expect("feature session should be created");

        assert_eq!(state.goals, vec![sample_goal()]);
        assert_eq!(state.feature_sessions.len(), 1);
        assert_eq!(state.feature_sessions[0].id, "feat_state_v1");
        assert_eq!(state.feature_sessions[0].goal_object_id, "goal_agentos");
        assert_eq!(
            state.feature_sessions[0].checkpoints[0].status,
            CheckpointStatus::Pending
        );
    }

    #[test]
    fn create_feature_session_rejects_duplicate_session_id() {
        let mut state = AgentOsState::empty();
        state
            .create_feature_session(create_session_request("feat_state_v1"))
            .expect("feature session should be created");

        let error = state
            .create_feature_session(create_session_request("feat_state_v1"))
            .expect_err("duplicate session id should fail");

        assert_eq!(
            error,
            StateMutationError::DuplicateFeatureSession {
                session_id: "feat_state_v1".to_owned(),
            }
        );
    }

    #[test]
    fn register_github_skill_source_adds_pending_external_source() {
        let mut state = AgentOsState::empty();

        state
            .register_github_skill_source(github_skill_source_request("superpowers"))
            .expect("github skill source should be registered");

        assert_eq!(state.skill_sources.len(), 1);
        assert_eq!(state.skill_sources[0].id, "superpowers");
        assert_eq!(
            state.skill_sources[0].repository_url,
            "https://github.com/obra/superpowers"
        );
        assert!(!state.skill_sources[0].active);
    }

    #[test]
    fn register_github_skill_source_rejects_duplicate_source_id() {
        let mut state = AgentOsState::empty();
        state
            .register_github_skill_source(github_skill_source_request("superpowers"))
            .expect("github skill source should be registered");

        let error = state
            .register_github_skill_source(github_skill_source_request("superpowers"))
            .expect_err("duplicate source id should fail");

        assert_eq!(
            error,
            StateMutationError::DuplicateSkillSource {
                source_id: "superpowers".to_owned(),
            }
        );
    }

    #[test]
    fn add_checkpoint_appends_pending_checkpoint_to_existing_session() {
        let mut state = state_with_session();

        state
            .add_checkpoint(
                "feat_state_v1",
                CreateCheckpointRequest {
                    id: "review_approved".to_owned(),
                    label: "Review approved".to_owned(),
                    owner_agent: "reviewer".to_owned(),
                    required_evidence: vec!["reviewer_approved".to_owned()],
                },
            )
            .expect("checkpoint should be added");

        assert_eq!(state.feature_sessions[0].checkpoints.len(), 2);
        assert_eq!(
            state.feature_sessions[0].checkpoints[1].id,
            "review_approved"
        );
        assert_eq!(
            state.feature_sessions[0].checkpoints[1].status,
            CheckpointStatus::Pending
        );
    }

    #[test]
    fn add_checkpoint_rejects_missing_session() {
        let mut state = AgentOsState::empty();

        let error = state
            .add_checkpoint("missing", checkpoint_request("state_tests"))
            .expect_err("missing session should fail");

        assert_eq!(
            error,
            StateMutationError::MissingFeatureSession {
                session_id: "missing".to_owned(),
            }
        );
    }

    #[test]
    fn add_checkpoint_rejects_duplicate_checkpoint_id() {
        let mut state = state_with_session();

        let error = state
            .add_checkpoint("feat_state_v1", checkpoint_request("state_tests"))
            .expect_err("duplicate checkpoint should fail");

        assert_eq!(
            error,
            StateMutationError::DuplicateCheckpoint {
                session_id: "feat_state_v1".to_owned(),
                checkpoint_id: "state_tests".to_owned(),
            }
        );
    }

    #[test]
    fn record_successful_command_evidence_marks_required_checkpoint_passed() {
        let mut state = state_with_session();

        state
            .record_command_evidence(command_evidence_request(0))
            .expect("evidence should be recorded");

        assert_eq!(state.evidence.len(), 1);
        assert_eq!(state.evidence[0].command, "npm run desktop:test");
        assert_eq!(
            state.feature_sessions[0].checkpoints[0].status,
            CheckpointStatus::Passed
        );
    }

    #[test]
    fn record_failed_command_evidence_keeps_checkpoint_pending() {
        let mut state = state_with_session();

        state
            .record_command_evidence(command_evidence_request(101))
            .expect("evidence should be recorded");

        assert_eq!(state.evidence.len(), 1);
        assert_eq!(
            state.feature_sessions[0].checkpoints[0].status,
            CheckpointStatus::Pending
        );
    }

    #[test]
    fn record_command_evidence_rejects_missing_checkpoint() {
        let mut state = state_with_session();
        let mut request = command_evidence_request(0);
        request.checkpoint_id = "missing".to_owned();

        let error = state
            .record_command_evidence(request)
            .expect_err("missing checkpoint should fail");

        assert_eq!(
            error,
            StateMutationError::MissingCheckpoint {
                session_id: "feat_state_v1".to_owned(),
                checkpoint_id: "missing".to_owned(),
            }
        );
    }

    #[test]
    fn close_feature_session_closes_after_required_checkpoint_passed() {
        let mut state = state_with_session();
        state
            .record_command_evidence(command_evidence_request(0))
            .expect("evidence should pass checkpoint");

        state
            .close_feature_session("feat_state_v1")
            .expect("session should close");

        assert_eq!(
            state.feature_sessions[0].status,
            crate::core::sessions::FeatureSessionStatus::Closed
        );
    }

    #[test]
    fn close_feature_session_rejects_pending_checkpoint() {
        let mut state = state_with_session();

        let error = state
            .close_feature_session("feat_state_v1")
            .expect_err("pending checkpoint should block close");

        assert!(matches!(
            error,
            StateMutationError::CheckpointNotPassed(SessionTransitionError::CheckpointNotPassed {
                checkpoint_id,
                status: CheckpointStatus::Pending,
            }) if checkpoint_id == "state_tests"
        ));
    }

    #[test]
    fn save_then_load_round_trips_core_state() {
        let path = test_path("save_then_load_round_trips_core_state", "state.json");
        let store = JsonStateStore::new(&path);
        let state = sample_state();

        store.save(&state).expect("state should save");
        let loaded = store.load().expect("state should load");

        assert_eq!(loaded, state);
    }

    #[test]
    fn invalid_json_is_rejected() {
        let path = test_path("invalid_json_is_rejected", "state.json");
        fs::create_dir_all(path.parent().expect("state path parent")).expect("create parent");
        fs::write(&path, "{not json").expect("write invalid json");
        let store = JsonStateStore::new(&path);

        let error = store.load().expect_err("invalid json should fail");

        assert!(matches!(error, StateStoreError::Json { .. }));
    }

    #[test]
    fn unsupported_schema_version_is_rejected_on_load() {
        let path = test_path(
            "unsupported_schema_version_is_rejected_on_load",
            "state.json",
        );
        fs::create_dir_all(path.parent().expect("state path parent")).expect("create parent");
        let mut state = AgentOsState::empty();
        state.schema_version = CURRENT_SCHEMA_VERSION + 1;
        fs::write(
            &path,
            serde_json::to_string(&state).expect("state should serialize"),
        )
        .expect("write unsupported state");
        let store = JsonStateStore::new(&path);

        let error = store.load().expect_err("unsupported schema should fail");

        assert!(matches!(
            error,
            StateStoreError::UnsupportedSchemaVersion {
                expected: CURRENT_SCHEMA_VERSION,
                actual,
                ..
            } if actual == CURRENT_SCHEMA_VERSION + 1
        ));
    }

    #[test]
    fn unsupported_schema_version_is_rejected_on_save() {
        let path = test_path(
            "unsupported_schema_version_is_rejected_on_save",
            "state.json",
        );
        let store = JsonStateStore::new(&path);
        let mut state = AgentOsState::empty();
        state.schema_version = CURRENT_SCHEMA_VERSION + 1;

        let error = store
            .save(&state)
            .expect_err("unsupported schema should not save");

        assert!(matches!(
            error,
            StateStoreError::UnsupportedSchemaVersion {
                expected: CURRENT_SCHEMA_VERSION,
                actual,
                ..
            } if actual == CURRENT_SCHEMA_VERSION + 1
        ));
        assert!(!path.exists());
    }

    #[test]
    fn save_creates_parent_directory() {
        let path = test_path("save_creates_parent_directory", "nested/state.json");
        let store = JsonStateStore::new(&path);

        store
            .save(&AgentOsState::empty())
            .expect("state should save into missing parent");

        assert!(path.exists());
    }

    #[test]
    fn save_removes_temp_file_after_success() {
        let path = test_path("save_removes_temp_file_after_success", "state.json");
        let temp_path = temp_path_for(&path);
        let store = JsonStateStore::new(&path);

        store
            .save(&AgentOsState::empty())
            .expect("state should save");

        assert!(path.exists());
        assert!(!temp_path.exists());
    }

    fn sample_state() -> AgentOsState {
        let goal = sample_goal();
        let design_session =
            DesignSession::new("design_state_v1", "Design durable state", "goal_agentos");
        let mut checkpoint = Checkpoint::new(
            "state_tests",
            "State tests",
            "qa",
            vec!["command_exit_code"],
        );
        checkpoint.status = CheckpointStatus::Passed;
        let feature_session = FeatureSession::new(
            "feat_state_v1",
            "Build durable state",
            "goal_agentos",
            "core",
            "feat/state-v1",
            vec![checkpoint],
        );
        let evidence = Evidence::command_exit_code(CommandExitCodeEvidence {
            evidence_id: "ev_state_tests".to_owned(),
            session_id: "feat_state_v1".to_owned(),
            checkpoint_id: "state_tests".to_owned(),
            command: "npm run desktop:test".to_owned(),
            exit_code: 0,
            created_at: "2026-05-28T19:30:00Z".to_owned(),
            created_by: "qa".to_owned(),
        });
        let model_call_estimate = ModelCallEstimate {
            provider: "openai".to_owned(),
            model: "gpt-5".to_owned(),
            agent_id: "developer".to_owned(),
            input_tokens: 1_000,
            cached_tokens: 250,
            output_tokens: 500,
            estimated_cost_usd: 0.01,
        };

        AgentOsState {
            schema_version: CURRENT_SCHEMA_VERSION,
            goals: vec![goal],
            design_sessions: vec![design_session],
            feature_sessions: vec![feature_session],
            evidence: vec![evidence],
            model_call_estimates: vec![model_call_estimate],
            skill_sources: Vec::new(),
        }
    }

    fn state_with_session() -> AgentOsState {
        let mut state = AgentOsState::empty();
        state
            .create_feature_session(create_session_request("feat_state_v1"))
            .expect("feature session should be created");
        state
    }

    fn create_session_request(session_id: &str) -> CreateFeatureSessionRequest {
        CreateFeatureSessionRequest {
            session_id: session_id.to_owned(),
            title: "Build durable state".to_owned(),
            goal: sample_goal(),
            team_id: "core".to_owned(),
            branch: "feat/state-v1".to_owned(),
            checkpoints: vec![checkpoint_request("state_tests")],
        }
    }

    fn checkpoint_request(checkpoint_id: &str) -> CreateCheckpointRequest {
        CreateCheckpointRequest {
            id: checkpoint_id.to_owned(),
            label: "State tests".to_owned(),
            owner_agent: "qa".to_owned(),
            required_evidence: vec!["command_exit_code".to_owned()],
        }
    }

    fn command_evidence_request(exit_code: i32) -> RecordCommandEvidenceRequest {
        RecordCommandEvidenceRequest {
            evidence_id: format!("ev_state_tests_{exit_code}"),
            session_id: "feat_state_v1".to_owned(),
            checkpoint_id: "state_tests".to_owned(),
            command: "npm run desktop:test".to_owned(),
            exit_code,
            created_at: "2026-05-28T19:30:00Z".to_owned(),
            created_by: "qa".to_owned(),
        }
    }

    fn github_skill_source_request(source_id: &str) -> RegisterGitHubSkillSourceRequest {
        RegisterGitHubSkillSourceRequest {
            id: source_id.to_owned(),
            repository_url: "https://github.com/obra/superpowers".to_owned(),
            selected_ref: "main".to_owned(),
        }
    }

    fn sample_goal() -> GoalObject {
        GoalObject {
            id: "goal_agentos".to_owned(),
            title: "Persist AgenticCrew state".to_owned(),
            definition_of_done: vec!["State round trip passes".to_owned()],
            constraints: vec!["Rust owns state".to_owned()],
            out_of_scope: vec!["Cloud sync".to_owned()],
        }
    }

    fn test_path(test_name: &str, file_name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        let directory = env::temp_dir().join(format!(
            "agentos_state_tests_{}_{}_{}",
            std::process::id(),
            test_name,
            unique
        ));

        directory.join(Path::new(file_name))
    }
}
