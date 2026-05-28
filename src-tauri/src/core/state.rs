use serde::{Deserialize, Serialize};
use std::{
    fmt, fs, io,
    path::{Path, PathBuf},
};

use super::{
    costs::ModelCallEstimate,
    evidence::Evidence,
    sessions::{DesignSession, FeatureSession, GoalObject},
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
        }
    }
}

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
        temp_path_for, AgentOsState, JsonStateStore, StateStoreError, CURRENT_SCHEMA_VERSION,
    };
    use crate::core::{
        costs::ModelCallEstimate,
        evidence::{CommandExitCodeEvidence, Evidence},
        sessions::{Checkpoint, CheckpointStatus, DesignSession, FeatureSession, GoalObject},
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
        let goal = GoalObject {
            id: "goal_agentos".to_owned(),
            title: "Persist AgentOS state".to_owned(),
            definition_of_done: vec!["State round trip passes".to_owned()],
            constraints: vec!["Rust owns state".to_owned()],
            out_of_scope: vec!["Cloud sync".to_owned()],
        };
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
