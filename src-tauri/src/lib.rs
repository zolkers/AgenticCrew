pub mod core;

use std::{
    fmt,
    path::{Path, PathBuf},
};

use serde::Serialize;

use core::{
    mission_control::{mission_control_snapshot_from_state, MissionControlSnapshot},
    skills::{
        skill_sources_snapshot_from_state, RegisterGitHubSkillSourceRequest, SkillSourcesSnapshot,
    },
    state::{
        AgentOsState, CreateCheckpointRequest, CreateFeatureSessionRequest, JsonStateStore,
        RecordCommandEvidenceRequest, StateMutationError, StateStoreError,
    },
};

pub const STATE_FILE_NAME: &str = "agenticcrew-state.json";

pub fn app_name() -> &'static str {
    "AgenticCrew"
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DesktopCommandError {
    pub message: String,
}

impl DesktopCommandError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl fmt::Display for DesktopCommandError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.message)
    }
}

impl std::error::Error for DesktopCommandError {}

impl From<StateStoreError> for DesktopCommandError {
    fn from(error: StateStoreError) -> Self {
        Self::new(error.to_string())
    }
}

impl From<StateMutationError> for DesktopCommandError {
    fn from(error: StateMutationError) -> Self {
        Self::new(error.to_string())
    }
}

pub fn state_file_path(app_data_dir: impl Into<PathBuf>) -> PathBuf {
    app_data_dir.into().join(STATE_FILE_NAME)
}

pub fn durable_state_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<AgentOsState, DesktopCommandError> {
    JsonStateStore::new(path).load().map_err(Into::into)
}

pub fn mission_control_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<MissionControlSnapshot, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;

    Ok(mission_control_snapshot_from_state(&state))
}

pub fn skill_sources_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<SkillSourcesSnapshot, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;

    Ok(skill_sources_snapshot_from_state(&state))
}

pub fn create_feature_session_at_path(
    path: impl AsRef<Path>,
    request: CreateFeatureSessionRequest,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.create_feature_session(request))
}

pub fn add_checkpoint_at_path(
    path: impl AsRef<Path>,
    session_id: &str,
    request: CreateCheckpointRequest,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.add_checkpoint(session_id, request))
}

pub fn record_command_evidence_at_path(
    path: impl AsRef<Path>,
    request: RecordCommandEvidenceRequest,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.record_command_evidence(request))
}

pub fn close_feature_session_at_path(
    path: impl AsRef<Path>,
    session_id: &str,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.close_feature_session(session_id))
}

pub fn register_github_skill_source_at_path(
    path: impl AsRef<Path>,
    request: RegisterGitHubSkillSourceRequest,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.register_github_skill_source(request))
}

pub fn validate_skill_source_at_path(
    path: impl AsRef<Path>,
    source_id: &str,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.validate_skill_source(source_id))
}

pub fn activate_skill_source_at_path(
    path: impl AsRef<Path>,
    source_id: &str,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.activate_skill_source(source_id))
}

fn mutate_state_at_path(
    path: impl AsRef<Path>,
    mutate: impl FnOnce(&mut AgentOsState) -> Result<(), StateMutationError>,
) -> Result<AgentOsState, DesktopCommandError> {
    let store = JsonStateStore::new(path.as_ref());
    let mut state = store.load()?;
    mutate(&mut state)?;
    store.save(&state)?;

    Ok(state)
}

#[cfg(feature = "desktop-shell")]
mod commands {
    use std::path::PathBuf;

    use tauri::Manager;

    use crate::{
        activate_skill_source_at_path, add_checkpoint_at_path, close_feature_session_at_path,
        core::skills::{RegisterGitHubSkillSourceRequest, SkillSourcesSnapshot},
        core::state::AgentOsState,
        create_feature_session_at_path, durable_state_snapshot_at_path,
        mission_control_snapshot_at_path, record_command_evidence_at_path,
        register_github_skill_source_at_path, skill_sources_snapshot_at_path, state_file_path,
        validate_skill_source_at_path, CreateCheckpointRequest, CreateFeatureSessionRequest,
        DesktopCommandError, MissionControlSnapshot, RecordCommandEvidenceRequest,
    };

    #[tauri::command]
    pub fn mission_control_snapshot(
        app: tauri::AppHandle,
    ) -> Result<MissionControlSnapshot, DesktopCommandError> {
        mission_control_snapshot_at_path(app_state_path(&app)?)
    }

    #[tauri::command]
    pub fn durable_state_snapshot(
        app: tauri::AppHandle,
    ) -> Result<AgentOsState, DesktopCommandError> {
        durable_state_snapshot_at_path(app_state_path(&app)?)
    }

    #[tauri::command]
    pub fn skill_sources_snapshot(
        app: tauri::AppHandle,
    ) -> Result<SkillSourcesSnapshot, DesktopCommandError> {
        skill_sources_snapshot_at_path(app_state_path(&app)?)
    }

    #[tauri::command]
    pub fn create_feature_session(
        app: tauri::AppHandle,
        request: CreateFeatureSessionRequest,
    ) -> Result<AgentOsState, DesktopCommandError> {
        create_feature_session_at_path(app_state_path(&app)?, request)
    }

    #[tauri::command]
    pub fn add_checkpoint(
        app: tauri::AppHandle,
        session_id: String,
        request: CreateCheckpointRequest,
    ) -> Result<AgentOsState, DesktopCommandError> {
        add_checkpoint_at_path(app_state_path(&app)?, &session_id, request)
    }

    #[tauri::command]
    pub fn record_command_evidence(
        app: tauri::AppHandle,
        request: RecordCommandEvidenceRequest,
    ) -> Result<AgentOsState, DesktopCommandError> {
        record_command_evidence_at_path(app_state_path(&app)?, request)
    }

    #[tauri::command]
    pub fn close_feature_session(
        app: tauri::AppHandle,
        session_id: String,
    ) -> Result<AgentOsState, DesktopCommandError> {
        close_feature_session_at_path(app_state_path(&app)?, &session_id)
    }

    #[tauri::command]
    pub fn register_github_skill_source(
        app: tauri::AppHandle,
        request: RegisterGitHubSkillSourceRequest,
    ) -> Result<AgentOsState, DesktopCommandError> {
        register_github_skill_source_at_path(app_state_path(&app)?, request)
    }

    #[tauri::command]
    pub fn validate_skill_source(
        app: tauri::AppHandle,
        source_id: String,
    ) -> Result<AgentOsState, DesktopCommandError> {
        validate_skill_source_at_path(app_state_path(&app)?, &source_id)
    }

    #[tauri::command]
    pub fn activate_skill_source(
        app: tauri::AppHandle,
        source_id: String,
    ) -> Result<AgentOsState, DesktopCommandError> {
        activate_skill_source_at_path(app_state_path(&app)?, &source_id)
    }

    fn app_state_path(app: &tauri::AppHandle) -> Result<PathBuf, DesktopCommandError> {
        app.path()
            .app_data_dir()
            .map(state_file_path)
            .map_err(|error| DesktopCommandError::new(error.to_string()))
    }
}

#[cfg(feature = "desktop-shell")]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::mission_control_snapshot,
            commands::durable_state_snapshot,
            commands::skill_sources_snapshot,
            commands::create_feature_session,
            commands::add_checkpoint,
            commands::record_command_evidence,
            commands::close_feature_session,
            commands::register_github_skill_source,
            commands::validate_skill_source,
            commands::activate_skill_source
        ])
        .run(tauri::generate_context!())
        .expect("failed to run AgenticCrew desktop shell");
}

#[cfg(not(feature = "desktop-shell"))]
pub fn run() {
    panic!("AgenticCrew desktop shell requires the desktop-shell Cargo feature");
}

#[cfg(test)]
mod tests {
    use std::{
        env,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{
        activate_skill_source_at_path, add_checkpoint_at_path, app_name,
        close_feature_session_at_path, create_feature_session_at_path,
        durable_state_snapshot_at_path, mission_control_snapshot_at_path,
        record_command_evidence_at_path, register_github_skill_source_at_path,
        skill_sources_snapshot_at_path, state_file_path, validate_skill_source_at_path,
        STATE_FILE_NAME,
    };
    use crate::core::{
        sessions::GoalObject,
        skills::RegisterGitHubSkillSourceRequest,
        state::{
            CreateCheckpointRequest, CreateFeatureSessionRequest, RecordCommandEvidenceRequest,
        },
    };

    #[test]
    fn app_name_is_agenticcrew() {
        assert_eq!(app_name(), "AgenticCrew");
    }

    #[test]
    fn durable_state_snapshot_returns_empty_state() {
        use super::core::state::AgentOsState;

        let path = test_path("durable_state_snapshot_returns_empty_state", "state.json");

        assert_eq!(
            durable_state_snapshot_at_path(&path).expect("missing state should load"),
            AgentOsState::empty()
        );
    }

    #[test]
    fn state_file_path_uses_agenticcrew_state_file_name() {
        let app_data_dir = Path::new("data").join("dev.agenticcrew.app");

        assert_eq!(
            state_file_path(&app_data_dir),
            app_data_dir.join(STATE_FILE_NAME)
        );
    }

    #[test]
    fn create_feature_session_command_state_persists_to_disk() {
        let path = test_path(
            "create_feature_session_command_state_persists_to_disk",
            "state.json",
        );

        let state = create_feature_session_at_path(&path, create_session_request())
            .expect("feature session should save");
        let loaded = durable_state_snapshot_at_path(&path).expect("state should load");

        assert_eq!(state, loaded);
        assert_eq!(loaded.feature_sessions[0].id, "feat_state_v1");
    }

    #[test]
    fn session_lifecycle_commands_update_persisted_state() {
        let path = test_path(
            "session_lifecycle_commands_update_persisted_state",
            "state.json",
        );
        create_feature_session_at_path(&path, create_session_request())
            .expect("feature session should save");
        add_checkpoint_at_path(
            &path,
            "feat_state_v1",
            CreateCheckpointRequest {
                id: "review".to_owned(),
                label: "Review".to_owned(),
                owner_agent: "reviewer".to_owned(),
                required_evidence: vec!["command_exit_code".to_owned()],
            },
        )
        .expect("checkpoint should save");
        record_command_evidence_at_path(&path, command_evidence_request("state_tests"))
            .expect("state test evidence should save");
        record_command_evidence_at_path(&path, command_evidence_request("review"))
            .expect("review evidence should save");
        let state = close_feature_session_at_path(&path, "feat_state_v1")
            .expect("feature session should close");

        assert_eq!(state.evidence.len(), 2);
        assert_eq!(
            durable_state_snapshot_at_path(&path)
                .expect("state should load")
                .feature_sessions[0]
                .status,
            crate::core::sessions::FeatureSessionStatus::Closed
        );
    }

    #[test]
    fn mission_control_command_reads_persisted_state() {
        let path = test_path(
            "mission_control_command_reads_persisted_state",
            "state.json",
        );
        create_feature_session_at_path(&path, create_session_request())
            .expect("feature session should save");

        let snapshot =
            mission_control_snapshot_at_path(&path).expect("mission control should load");

        assert_eq!(snapshot.active_session_count, 1);
        assert_eq!(snapshot.current_checkpoint, "State tests");
    }

    #[test]
    fn register_github_skill_source_command_persists_to_disk() {
        let path = test_path(
            "register_github_skill_source_command_persists_to_disk",
            "state.json",
        );

        let state = register_github_skill_source_at_path(&path, github_skill_source_request())
            .expect("github skill source should save");
        let loaded = durable_state_snapshot_at_path(&path).expect("state should load");

        assert_eq!(state, loaded);
        assert_eq!(loaded.skill_sources[0].id, "superpowers");
        assert_eq!(
            loaded.skill_sources[0].repository_url,
            "https://github.com/obra/superpowers"
        );
        assert!(!loaded.skill_sources[0].active);
    }

    #[test]
    fn skill_sources_snapshot_command_reads_persisted_sources() {
        let path = test_path(
            "skill_sources_snapshot_command_reads_persisted_sources",
            "state.json",
        );
        register_github_skill_source_at_path(&path, github_skill_source_request())
            .expect("github skill source should save");

        let snapshot = skill_sources_snapshot_at_path(&path).expect("skill sources should load");

        assert_eq!(snapshot.sources.len(), 1);
        assert_eq!(snapshot.sources[0].id, "superpowers");
        assert_eq!(snapshot.active_source_count, 0);
    }

    #[test]
    fn validate_and_activate_skill_source_commands_persist_to_disk() {
        let path = test_path(
            "validate_and_activate_skill_source_commands_persist_to_disk",
            "state.json",
        );
        register_github_skill_source_at_path(&path, github_skill_source_request())
            .expect("github skill source should save");

        let validated = validate_skill_source_at_path(&path, "superpowers")
            .expect("skill source should validate");

        assert_eq!(
            validated.skill_sources[0].status,
            crate::core::skills::SkillSourceActivationStatus::Validated
        );
        assert!(!validated.skill_sources[0].active);

        let activated = activate_skill_source_at_path(&path, "superpowers")
            .expect("skill source should activate");
        let loaded = durable_state_snapshot_at_path(&path).expect("state should load");

        assert_eq!(activated, loaded);
        assert!(loaded.skill_sources[0].active);
    }

    fn create_session_request() -> CreateFeatureSessionRequest {
        CreateFeatureSessionRequest {
            session_id: "feat_state_v1".to_owned(),
            title: "Build durable sessions".to_owned(),
            goal: GoalObject {
                id: "goal_state_v1".to_owned(),
                title: "Persist sessions".to_owned(),
                definition_of_done: vec!["State survives restart".to_owned()],
                constraints: vec!["Rust owns state".to_owned()],
                out_of_scope: Vec::new(),
            },
            team_id: "core".to_owned(),
            branch: "feat/state-v1".to_owned(),
            checkpoints: vec![CreateCheckpointRequest {
                id: "state_tests".to_owned(),
                label: "State tests".to_owned(),
                owner_agent: "qa".to_owned(),
                required_evidence: vec!["command_exit_code".to_owned()],
            }],
        }
    }

    fn command_evidence_request(checkpoint_id: &str) -> RecordCommandEvidenceRequest {
        RecordCommandEvidenceRequest {
            evidence_id: format!("ev_{checkpoint_id}"),
            session_id: "feat_state_v1".to_owned(),
            checkpoint_id: checkpoint_id.to_owned(),
            command: "npm run desktop:test".to_owned(),
            exit_code: 0,
            created_at: "2026-05-28T20:00:00Z".to_owned(),
            created_by: "qa".to_owned(),
        }
    }

    fn github_skill_source_request() -> RegisterGitHubSkillSourceRequest {
        RegisterGitHubSkillSourceRequest {
            id: "superpowers".to_owned(),
            repository_url: "https://github.com/obra/superpowers".to_owned(),
            selected_ref: "main".to_owned(),
        }
    }

    fn test_path(test_name: &str, file_name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        env::temp_dir()
            .join(format!(
                "agenticcrew_desktop_command_tests_{}_{}_{}",
                std::process::id(),
                test_name,
                unique
            ))
            .join(file_name)
    }
}
