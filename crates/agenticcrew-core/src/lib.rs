pub mod core;

use std::{
    fmt, fs,
    path::{Path, PathBuf},
};

use serde::Serialize;

use core::{
    agents::{
        agent_studio_snapshot_from_state, AgentStudioSnapshot, CreateAgentTemplateRequest,
        PromoteAgentTrainingRunRequest, SetAgentTemplateActiveRequest, UpdateAgentTemplateRequest,
    },
    costs::RecordModelCallEstimateRequest,
    harnesses::{
        harness_studio_snapshot_from_state, CreateHarnessProfileRequest, HarnessStudioSnapshot,
        SetHarnessProfileActiveRequest, UpdateHarnessProfileRequest,
    },
    mission_control::{mission_control_snapshot_from_state, MissionControlSnapshot},
    permissions::ApprovedPermissionPolicy,
    pi_extensions::{ImportPiExtensionRequest, SetPiExtensionActiveRequest},
    runs::{runs_snapshot_from_state, RunRecord, RunsSnapshot, StartRunRequest},
    settings::{
        settings_snapshot_from_state, sync_provider_models_with_catalog, ProviderModelCatalog,
        SettingsSnapshot, SyncProviderModelsRequest, UpdateAiProviderSettingsRequest,
    },
    skill_manifest::{inspect_skill_manifests, SkillManifestInspectionError},
    skill_sync::{sync_github_skill_source_to_cache, SkillSourceSyncError},
    skills::{
        skill_sources_snapshot_from_state, RegisterGitHubSkillSourceRequest, SkillSourcesSnapshot,
    },
    state::{
        AgentOsState, CreateCheckpointRequest, CreateFeatureSessionRequest, JsonStateStore,
        RecordCommandEvidenceRequest, StateMutationError, StateStoreError,
    },
    workspaces::{
        read_commit_preview, workspace_snapshot_from_state, CommitPreviewRequest,
        CommitPreviewResponse, CreateWorkspaceRequest, RefreshWorkspaceGitStatusRequest,
        UpdateWorkspaceGitContextRequest, UpdateWorkspaceLoadoutRequest, WorkspaceSnapshot,
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

    pub fn public(message: impl Into<String>) -> Self {
        Self::new(message)
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

impl From<SkillSourceSyncError> for DesktopCommandError {
    fn from(error: SkillSourceSyncError) -> Self {
        Self::new(error.to_string())
    }
}

impl From<SkillManifestInspectionError> for DesktopCommandError {
    fn from(error: SkillManifestInspectionError) -> Self {
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

pub fn harness_studio_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<HarnessStudioSnapshot, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;

    Ok(harness_studio_snapshot_from_state(&state))
}

pub fn agent_studio_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<AgentStudioSnapshot, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;

    Ok(agent_studio_snapshot_from_state(&state))
}

pub fn workspace_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<WorkspaceSnapshot, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;

    Ok(workspace_snapshot_from_state(&state))
}

pub fn runs_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<RunsSnapshot, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;

    Ok(runs_snapshot_from_state(&state))
}

pub fn create_workspace_at_path(
    path: impl AsRef<Path>,
    request: CreateWorkspaceRequest,
) -> Result<WorkspaceSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.create_workspace(request))?;

    Ok(workspace_snapshot_from_state(&state))
}

pub fn update_workspace_git_context_at_path(
    path: impl AsRef<Path>,
    request: UpdateWorkspaceGitContextRequest,
) -> Result<WorkspaceSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.update_workspace_git_context(request))?;

    Ok(workspace_snapshot_from_state(&state))
}

pub fn refresh_workspace_git_status_at_path(
    path: impl AsRef<Path>,
    request: RefreshWorkspaceGitStatusRequest,
) -> Result<WorkspaceSnapshot, DesktopCommandError> {
    let refreshed_at = current_unix_timestamp_string()?;
    let state = mutate_state_at_path(path, |state| {
        state.refresh_workspace_git_status(request, refreshed_at)
    })?;

    Ok(workspace_snapshot_from_state(&state))
}

pub fn commit_preview_at_path(
    path: impl Into<PathBuf>,
    request: CommitPreviewRequest,
) -> Result<CommitPreviewResponse, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;
    let workspace = state
        .workspaces
        .iter()
        .find(|workspace| workspace.id == request.workspace_id)
        .ok_or_else(|| {
            DesktopCommandError::public(format!(
                "workspace '{}' was not found",
                request.workspace_id
            ))
        })?;

    read_commit_preview(workspace, &request).map_err(DesktopCommandError::public)
}

pub fn update_workspace_loadout_at_path(
    path: impl AsRef<Path>,
    request: UpdateWorkspaceLoadoutRequest,
) -> Result<WorkspaceSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.update_workspace_loadout(request))?;

    Ok(workspace_snapshot_from_state(&state))
}

pub fn start_run_at_path(
    path: impl AsRef<Path>,
    request: StartRunRequest,
) -> Result<RunsSnapshot, DesktopCommandError> {
    let created_at = current_unix_timestamp_string()?;
    let state = mutate_state_at_path(path, |state| state.start_run(request, created_at))?;
    if let Some(run) = state.runs.last() {
        write_run_manifest(run)?;
    }

    Ok(runs_snapshot_from_state(&state))
}

pub fn create_agent_template_at_path(
    path: impl AsRef<Path>,
    request: CreateAgentTemplateRequest,
) -> Result<AgentStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.create_agent_template(request))?;

    Ok(agent_studio_snapshot_from_state(&state))
}

pub fn set_agent_template_active_at_path(
    path: impl AsRef<Path>,
    request: SetAgentTemplateActiveRequest,
) -> Result<AgentStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.set_agent_template_active(request))?;

    Ok(agent_studio_snapshot_from_state(&state))
}

pub fn update_agent_template_at_path(
    path: impl AsRef<Path>,
    request: UpdateAgentTemplateRequest,
) -> Result<AgentStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.update_agent_template(request))?;

    Ok(agent_studio_snapshot_from_state(&state))
}

pub fn promote_agent_training_run_at_path(
    path: impl AsRef<Path>,
    request: PromoteAgentTrainingRunRequest,
) -> Result<AgentStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.promote_agent_training_run(request))?;

    Ok(agent_studio_snapshot_from_state(&state))
}

pub fn create_harness_profile_at_path(
    path: impl AsRef<Path>,
    request: CreateHarnessProfileRequest,
) -> Result<HarnessStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.create_harness_profile(request))?;

    Ok(harness_studio_snapshot_from_state(&state))
}

pub fn set_harness_profile_active_at_path(
    path: impl AsRef<Path>,
    request: SetHarnessProfileActiveRequest,
) -> Result<HarnessStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.set_harness_profile_active(request))?;

    Ok(harness_studio_snapshot_from_state(&state))
}

pub fn update_harness_profile_at_path(
    path: impl AsRef<Path>,
    request: UpdateHarnessProfileRequest,
) -> Result<HarnessStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.update_harness_profile(request))?;

    Ok(harness_studio_snapshot_from_state(&state))
}

pub fn import_pi_extension_at_path(
    path: impl AsRef<Path>,
    request: ImportPiExtensionRequest,
) -> Result<HarnessStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.import_pi_extension(request))?;

    Ok(harness_studio_snapshot_from_state(&state))
}

pub fn set_pi_extension_active_at_path(
    path: impl AsRef<Path>,
    request: SetPiExtensionActiveRequest,
) -> Result<HarnessStudioSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.set_pi_extension_active(request))?;

    Ok(harness_studio_snapshot_from_state(&state))
}

pub fn settings_snapshot_at_path(
    path: impl Into<PathBuf>,
) -> Result<SettingsSnapshot, DesktopCommandError> {
    let state = durable_state_snapshot_at_path(path)?;

    Ok(settings_snapshot_from_state(&state))
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

pub fn record_model_call_estimate_at_path(
    path: impl AsRef<Path>,
    request: RecordModelCallEstimateRequest,
) -> Result<MissionControlSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.record_model_call_estimate(request))?;

    Ok(mission_control_snapshot_from_state(&state))
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

pub fn record_skill_source_sync_success_at_path(
    path: impl AsRef<Path>,
    source_id: &str,
    cache_path: String,
    commit: String,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| {
        state.record_skill_source_sync_success(source_id, cache_path, commit)
    })
}

pub fn sync_github_skill_source_at_path(
    path: impl AsRef<Path>,
    cache_root: impl AsRef<Path>,
    source_id: &str,
) -> Result<AgentOsState, DesktopCommandError> {
    let store = JsonStateStore::new(path.as_ref());
    let mut state = store.load()?;
    let source = state
        .skill_sources
        .iter()
        .find(|source| source.id == source_id)
        .cloned()
        .ok_or_else(|| StateMutationError::MissingSkillSource {
            source_id: source_id.to_owned(),
        })?;

    match sync_github_skill_source_to_cache(&source, cache_root) {
        Ok(outcome) => {
            state.record_skill_source_sync_success(
                source_id,
                outcome.cache_path.display().to_string(),
                outcome.commit,
            )?;
        }
        Err(error) => {
            state.record_skill_source_sync_failure(source_id, error.to_string())?;
            store.save(&state)?;
            return Err(error.into());
        }
    }

    store.save(&state)?;

    Ok(state)
}

pub fn inspect_cached_skill_source_at_path(
    path: impl AsRef<Path>,
    source_id: &str,
) -> Result<AgentOsState, DesktopCommandError> {
    let store = JsonStateStore::new(path.as_ref());
    let mut state = store.load()?;
    let cache_path = state
        .skill_sources
        .iter()
        .find(|source| source.id == source_id)
        .ok_or_else(|| StateMutationError::MissingSkillSource {
            source_id: source_id.to_owned(),
        })?
        .local_cache_path
        .clone()
        .ok_or_else(|| {
            DesktopCommandError::new(format!("skill source '{source_id}' has no local cache"))
        })?;

    let inspection = inspect_skill_manifests(cache_path, source_id)?;
    state.record_skill_source_manifest_validation(
        source_id,
        inspection.discovered_skills,
        inspection.validation_errors,
    )?;
    store.save(&state)?;

    Ok(state)
}

pub fn approve_skill_source_permissions_at_path(
    path: impl AsRef<Path>,
    source_id: &str,
    policy: ApprovedPermissionPolicy,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| {
        state.approve_skill_source_permissions(source_id, policy)
    })
}

pub fn activate_skill_source_at_path(
    path: impl AsRef<Path>,
    source_id: &str,
) -> Result<AgentOsState, DesktopCommandError> {
    mutate_state_at_path(path, |state| state.activate_skill_source(source_id))
}

pub fn update_ai_provider_settings_at_path(
    path: impl AsRef<Path>,
    request: UpdateAiProviderSettingsRequest,
) -> Result<SettingsSnapshot, DesktopCommandError> {
    let state = mutate_state_at_path(path, |state| state.update_ai_provider_settings(request))?;

    Ok(settings_snapshot_from_state(&state))
}

pub fn sync_provider_models_at_path(
    path: impl AsRef<Path>,
    request: SyncProviderModelsRequest,
) -> Result<SettingsSnapshot, DesktopCommandError> {
    let synced_at = current_unix_timestamp_string()?;
    let state = mutate_state_at_path(path, |state| state.sync_provider_models(request, synced_at))?;

    Ok(settings_snapshot_from_state(&state))
}

pub fn sync_provider_models_at_path_with_catalog(
    path: impl AsRef<Path>,
    request: SyncProviderModelsRequest,
    catalog: &impl ProviderModelCatalog,
) -> Result<SettingsSnapshot, DesktopCommandError> {
    let synced_at = current_unix_timestamp_string()?;
    let state = mutate_state_at_path(path, |state| {
        let previous = state.desktop_settings.ai_provider.clone();
        state.desktop_settings.ai_provider =
            sync_provider_models_with_catalog(&previous, request, synced_at, catalog)
                .map_err(StateMutationError::InvalidDesktopSettings)?;
        Ok(())
    })?;

    Ok(settings_snapshot_from_state(&state))
}

fn current_unix_timestamp_string() -> Result<String, DesktopCommandError> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| DesktopCommandError::public(format!("system clock error: {error}")))?;

    Ok(timestamp.as_secs().to_string())
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

fn write_run_manifest(run: &RunRecord) -> Result<(), DesktopCommandError> {
    let manifest_path = PathBuf::from(&run.manifest_path);
    let parent = manifest_path.parent().ok_or_else(|| {
        DesktopCommandError::public(format!(
            "run manifest path '{}' has no parent directory",
            run.manifest_path
        ))
    })?;
    fs::create_dir_all(parent).map_err(|error| {
        DesktopCommandError::public(format!(
            "failed to create run manifest directory '{}': {error}",
            parent.display()
        ))
    })?;

    let content = serde_json::to_string_pretty(&run.to_manifest()).map_err(|error| {
        DesktopCommandError::public(format!("failed to serialize run manifest: {error}"))
    })?;
    fs::write(&manifest_path, content).map_err(|error| {
        DesktopCommandError::public(format!(
            "failed to write run manifest '{}': {error}",
            manifest_path.display()
        ))
    })?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{
        env, fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{
        activate_skill_source_at_path, add_checkpoint_at_path, agent_studio_snapshot_at_path,
        app_name, approve_skill_source_permissions_at_path, close_feature_session_at_path,
        create_agent_template_at_path, create_feature_session_at_path,
        create_harness_profile_at_path, create_workspace_at_path, durable_state_snapshot_at_path,
        harness_studio_snapshot_at_path, inspect_cached_skill_source_at_path,
        mission_control_snapshot_at_path, promote_agent_training_run_at_path,
        record_command_evidence_at_path, record_model_call_estimate_at_path,
        record_skill_source_sync_success_at_path, refresh_workspace_git_status_at_path,
        register_github_skill_source_at_path, runs_snapshot_at_path,
        set_agent_template_active_at_path, set_harness_profile_active_at_path,
        skill_sources_snapshot_at_path, start_run_at_path, state_file_path,
        update_agent_template_at_path, update_harness_profile_at_path,
        update_workspace_git_context_at_path, update_workspace_loadout_at_path,
        validate_skill_source_at_path, workspace_snapshot_at_path, STATE_FILE_NAME,
    };
    use crate::core::{
        agents::{
            AgentTrainingRun, AgentTrainingStatus, CreateAgentTemplateRequest,
            PromoteAgentTrainingRunRequest, SetAgentTemplateActiveRequest,
            UpdateAgentTemplateRequest,
        },
        costs::RecordModelCallEstimateRequest,
        harnesses::{
            CreateHarnessProfileRequest, SetHarnessProfileActiveRequest,
            UpdateHarnessProfileRequest,
        },
        permissions::{
            ApprovedPermissionPolicy, CommandPermissionScope, FileSystemPermissionScope,
            NetworkPermissionScope,
        },
        runs::StartRunRequest,
        sessions::GoalObject,
        settings::ReasoningEffort,
        skills::RegisterGitHubSkillSourceRequest,
        state::{
            AgentOsState, CreateCheckpointRequest, CreateFeatureSessionRequest, JsonStateStore,
            RecordCommandEvidenceRequest,
        },
        workspaces::{
            CreateWorkspaceRequest, RefreshWorkspaceGitStatusRequest,
            UpdateWorkspaceGitContextRequest, UpdateWorkspaceLoadoutRequest,
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
    fn record_model_call_estimate_at_path_updates_mission_control_snapshot() {
        let path = test_path(
            "record_model_call_estimate_at_path_updates_mission_control_snapshot",
            "state.json",
        );

        let snapshot = record_model_call_estimate_at_path(
            &path,
            RecordModelCallEstimateRequest {
                agent_id: "developer".to_owned(),
                cached_tokens: 25,
                estimated_cost_usd: 0.42,
                input_tokens: 100,
                model: "gpt-live".to_owned(),
                output_tokens: 50,
                provider: "openai".to_owned(),
            },
        )
        .expect("model call estimate should persist");

        assert_eq!(snapshot.active_model.model_id, "gpt-live");
        assert_eq!(snapshot.cost_summary.model_call_count, 1);
        assert_eq!(snapshot.cost_summary.total_usd, 0.42);
        assert_eq!(snapshot.cost_summary.total_tokens, 150);
    }

    #[test]
    fn workspace_snapshot_command_reads_seeded_workspaces() {
        let path = test_path(
            "workspace_snapshot_command_reads_seeded_workspaces",
            "state.json",
        );

        let snapshot = workspace_snapshot_at_path(&path).expect("workspaces should load");

        assert_eq!(snapshot.workspaces.len(), 2);
        assert_eq!(snapshot.workspaces[0].id, "fullstack-app");
        assert_eq!(snapshot.workspaces[1].id, "mobile-qa");
    }

    #[test]
    fn workspace_commands_persist_local_workspace_and_git_context() {
        let path = test_path(
            "workspace_commands_persist_local_workspace_and_git_context",
            "state.json",
        );

        let snapshot = create_workspace_at_path(
            &path,
            CreateWorkspaceRequest {
                branch: "feature/api".to_owned(),
                id: "api-platform".to_owned(),
                mission: "Build API agents".to_owned(),
                name: "API Platform".to_owned(),
                path: "D:\\work\\api-platform".to_owned(),
            },
        )
        .expect("workspace should persist");

        assert_eq!(snapshot.workspaces.len(), 3);
        assert!(snapshot
            .workspaces
            .iter()
            .any(|workspace| workspace.id == "api-platform"));

        let snapshot = update_workspace_git_context_at_path(
            &path,
            UpdateWorkspaceGitContextRequest {
                branch: "feature/manual".to_owned(),
                path: "D:\\manual".to_owned(),
                workspace_id: "api-platform".to_owned(),
            },
        )
        .expect("workspace git context should persist");

        let workspace = snapshot
            .workspaces
            .iter()
            .find(|workspace| workspace.id == "api-platform")
            .expect("workspace should exist");
        assert_eq!(workspace.branch, "feature/manual");
        assert_eq!(workspace.path, "D:\\manual");
        let snapshot = refresh_workspace_git_status_at_path(
            &path,
            RefreshWorkspaceGitStatusRequest {
                workspace_id: "api-platform".to_owned(),
            },
        )
        .expect("workspace git status should refresh");
        let workspace = snapshot
            .workspaces
            .iter()
            .find(|workspace| workspace.id == "api-platform")
            .expect("workspace should exist");
        assert!(workspace.git_status.last_refreshed_at.is_some());
        assert!(workspace.git_status.last_error.is_some());
        let snapshot = update_workspace_loadout_at_path(
            &path,
            UpdateWorkspaceLoadoutRequest {
                agent_template_id: Some("developer-pi".to_owned()),
                harness_profile_id: Some("pi-execution-discipline".to_owned()),
                workspace_id: "api-platform".to_owned(),
            },
        )
        .expect("workspace loadout should persist");

        let workspace = snapshot
            .workspaces
            .iter()
            .find(|workspace| workspace.id == "api-platform")
            .expect("workspace should exist");
        assert_eq!(
            workspace.selected_agent_template_id,
            Some("developer-pi".to_owned())
        );
        assert_eq!(
            workspace.selected_harness_profile_id,
            Some("pi-execution-discipline".to_owned())
        );
        assert_eq!(
            snapshot,
            workspace_snapshot_at_path(&path).expect("snapshot should load")
        );
    }

    #[test]
    fn run_commands_persist_queued_run_and_events() {
        let path = test_path("run_commands_persist_queued_run_and_events", "state.json");
        let workspace_path = test_path("run_commands_persist_queued_run_and_events", "workspace");

        update_workspace_git_context_at_path(
            &path,
            UpdateWorkspaceGitContextRequest {
                branch: "dev".to_owned(),
                path: workspace_path.display().to_string(),
                workspace_id: "fullstack-app".to_owned(),
            },
        )
        .expect("workspace path should update");

        let snapshot = start_run_at_path(
            &path,
            StartRunRequest {
                agent_template_id: Some("developer-pi".to_owned()),
                harness_profile_id: Some("pi-execution-discipline".to_owned()),
                id: "run-1".to_owned(),
                model_id: None,
                provider_id: None,
                reasoning_effort: None,
                skill_routes: vec!["agenticcrew://skills/superpowers/planning".to_owned()],
                participants: Vec::new(),
                task: " Build Workbench run queue ".to_owned(),
                workspace_id: "fullstack-app".to_owned(),
            },
        )
        .expect("run should persist");

        assert_eq!(snapshot.active_run_id, Some("run-1".to_owned()));
        assert_eq!(snapshot.runs.len(), 1);
        assert_eq!(snapshot.runs[0].task, "Build Workbench run queue");
        assert_eq!(
            snapshot.runs[0].skill_routes,
            vec!["agenticcrew://skills/superpowers/planning".to_owned()]
        );
        assert!(snapshot.runs[0]
            .manifest_path
            .ends_with("run-manifest.json"));
        let manifest_json =
            fs::read_to_string(&snapshot.runs[0].manifest_path).expect("run manifest should exist");
        let manifest: serde_json::Value =
            serde_json::from_str(&manifest_json).expect("manifest should be valid json");
        assert_eq!(manifest["runId"], "run-1");
        assert_eq!(manifest["workspaceId"], "fullstack-app");
        assert_eq!(manifest["providerId"], "openai");
        assert_eq!(manifest["modelId"], "gpt-5.4");
        assert_eq!(manifest["reasoningEffort"], "medium");
        assert_eq!(manifest["participants"][0]["id"], "developer");
        assert_eq!(manifest["participants"][0]["role"], "implementation");
        assert_eq!(
            manifest["skillRoutes"][0],
            "agenticcrew://skills/superpowers/planning"
        );
        assert_eq!(snapshot.events.len(), 1);
        assert_eq!(
            snapshot,
            runs_snapshot_at_path(&path).expect("runs snapshot should load")
        );
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
    fn harness_studio_snapshot_command_reads_built_in_pi_profile() {
        let path = test_path(
            "harness_studio_snapshot_command_reads_built_in_pi_profile",
            "state.json",
        );

        let snapshot = harness_studio_snapshot_at_path(&path).expect("harness studio should load");

        assert_eq!(snapshot.active_profile_count, 1);
        assert_eq!(snapshot.profiles[0].id, "pi-execution-discipline");
        assert_eq!(
            snapshot.profiles[0].modules[0].source.route.as_deref(),
            Some("agenticcrew://harnesses/builtin-pi/pi-execution-discipline")
        );
    }

    #[test]
    fn harness_profile_commands_persist_local_profiles() {
        let path = test_path(
            "harness_profile_commands_persist_local_profiles",
            "state.json",
        );

        let snapshot = create_harness_profile_at_path(
            &path,
            CreateHarnessProfileRequest {
                active: false,
                base_policy: "Use review gates.".to_owned(),
                description: "Local review harness".to_owned(),
                id: "local-review".to_owned(),
                name: "Local Review".to_owned(),
                skill_routes: Vec::new(),
            },
        )
        .expect("local harness should persist");

        assert_eq!(snapshot.profiles.len(), 2);
        assert!(snapshot
            .profiles
            .iter()
            .any(|profile| profile.id == "local-review"));

        let snapshot = set_harness_profile_active_at_path(
            &path,
            SetHarnessProfileActiveRequest {
                active: true,
                profile_id: "local-review".to_owned(),
            },
        )
        .expect("local harness status should persist");

        assert_eq!(snapshot.active_profile_count, 2);
        let loaded = harness_studio_snapshot_at_path(&path).expect("snapshot should load");
        assert_eq!(snapshot, loaded);
    }

    #[test]
    fn update_harness_profile_command_persists_profile_guidance() {
        let path = test_path(
            "update_harness_profile_command_persists_profile_guidance",
            "state.json",
        );
        create_harness_profile_at_path(
            &path,
            CreateHarnessProfileRequest {
                active: true,
                base_policy: "Use review gates.".to_owned(),
                description: "Local review harness".to_owned(),
                id: "local-review".to_owned(),
                name: "Local Review".to_owned(),
                skill_routes: Vec::new(),
            },
        )
        .expect("local harness should persist");

        let snapshot = update_harness_profile_at_path(
            &path,
            UpdateHarnessProfileRequest {
                base_policy: "Require approval evidence.".to_owned(),
                description: "Updated review harness".to_owned(),
                name: "Review Harness".to_owned(),
                profile_id: "local-review".to_owned(),
                skill_routes: vec!["agenticcrew://skills/review".to_owned()],
            },
        )
        .expect("local harness should update");

        let profile = snapshot
            .profiles
            .iter()
            .find(|profile| profile.id == "local-review")
            .expect("updated profile should exist");
        assert_eq!(profile.name, "Review Harness");
        assert_eq!(profile.description, "Updated review harness");
        assert_eq!(profile.modules[0].content, "Require approval evidence.");
        assert_eq!(profile.skill_routes, vec!["agenticcrew://skills/review"]);
        assert_eq!(profile.version, "2");
        assert_eq!(
            snapshot,
            harness_studio_snapshot_at_path(&path).expect("snapshot should load")
        );
    }

    #[test]
    fn agent_studio_snapshot_command_reads_built_in_developer_agent() {
        let path = test_path(
            "agent_studio_snapshot_command_reads_built_in_developer_agent",
            "state.json",
        );

        let snapshot = agent_studio_snapshot_at_path(&path).expect("agent studio should load");

        assert_eq!(snapshot.active_template_count, 1);
        assert_eq!(snapshot.templates[0].id, "developer-pi");
        assert_eq!(
            snapshot.templates[0].harness_profile_id.as_deref(),
            Some("pi-execution-discipline")
        );
    }

    #[test]
    fn agent_template_commands_persist_local_agents() {
        let path = test_path("agent_template_commands_persist_local_agents", "state.json");

        let snapshot = create_agent_template_at_path(
            &path,
            CreateAgentTemplateRequest {
                active: true,
                budget_cents: 525,
                description: "Review local changes".to_owned(),
                harness_profile_id: Some("pi-execution-discipline".to_owned()),
                id: "review-agent".to_owned(),
                model_id: "gpt-5.2".to_owned(),
                name: "Review Agent".to_owned(),
                provider_id: "openai".to_owned(),
                reasoning_effort: ReasoningEffort::Medium,
                role: "reviewer".to_owned(),
                skill_routes: vec!["agenticcrew://skills/review".to_owned()],
            },
        )
        .expect("agent should persist");

        assert_eq!(snapshot.templates.len(), 2);
        assert_eq!(snapshot.active_template_count, 2);

        let snapshot = set_agent_template_active_at_path(
            &path,
            SetAgentTemplateActiveRequest {
                active: false,
                template_id: "review-agent".to_owned(),
            },
        )
        .expect("agent status should persist");

        assert_eq!(snapshot.active_template_count, 1);
        let loaded = agent_studio_snapshot_at_path(&path).expect("snapshot should load");
        assert_eq!(snapshot, loaded);
    }

    #[test]
    fn update_agent_template_command_persists_agent_guidance() {
        let path = test_path(
            "update_agent_template_command_persists_agent_guidance",
            "state.json",
        );
        create_agent_template_at_path(
            &path,
            CreateAgentTemplateRequest {
                active: true,
                budget_cents: 525,
                description: "Review local changes".to_owned(),
                harness_profile_id: Some("pi-execution-discipline".to_owned()),
                id: "review-agent".to_owned(),
                model_id: "gpt-5.2".to_owned(),
                name: "Review Agent".to_owned(),
                provider_id: "openai".to_owned(),
                reasoning_effort: ReasoningEffort::Medium,
                role: "reviewer".to_owned(),
                skill_routes: vec!["agenticcrew://skills/review".to_owned()],
            },
        )
        .expect("agent should persist");

        let snapshot = update_agent_template_at_path(
            &path,
            UpdateAgentTemplateRequest {
                budget_cents: 900,
                description: "Owns release review.".to_owned(),
                harness_profile_id: None,
                model_id: "gpt-5.1".to_owned(),
                name: "Release Reviewer".to_owned(),
                provider_id: "openai".to_owned(),
                reasoning_effort: ReasoningEffort::Medium,
                role: "release-reviewer".to_owned(),
                skill_routes: vec!["agenticcrew://skills/release".to_owned()],
                template_id: "review-agent".to_owned(),
            },
        )
        .expect("agent should update");

        let template = snapshot
            .templates
            .iter()
            .find(|template| template.id == "review-agent")
            .expect("updated template should exist");
        assert_eq!(template.name, "Release Reviewer");
        assert_eq!(template.description, "Owns release review.");
        assert_eq!(template.harness_profile_id, None);
        assert_eq!(template.skill_routes, vec!["agenticcrew://skills/release"]);
        assert_eq!(template.version, 2);
        assert_eq!(
            snapshot,
            agent_studio_snapshot_at_path(&path).expect("snapshot should load")
        );
    }

    #[test]
    fn promote_agent_training_run_command_persists_version() {
        let path = test_path(
            "promote_agent_training_run_command_persists_version",
            "state.json",
        );
        let store = JsonStateStore::new(&path);
        let mut state = AgentOsState::empty();
        state.agent_training_runs.push(AgentTrainingRun {
            agent_template_id: "developer-pi".to_owned(),
            critic_score: Some(97),
            dataset_id: "release-regression".to_owned(),
            id: "train-release".to_owned(),
            promoted_version: None,
            status: AgentTrainingStatus::Completed,
        });
        store.save(&state).expect("state should save");

        let snapshot = promote_agent_training_run_at_path(
            &path,
            PromoteAgentTrainingRunRequest {
                training_run_id: "train-release".to_owned(),
            },
        )
        .expect("training run should promote");

        assert_eq!(snapshot.templates[0].version, 2);
        assert_eq!(
            snapshot.training_runs[0].status,
            AgentTrainingStatus::Promoted
        );
        assert_eq!(snapshot.training_runs[0].promoted_version, Some(2));
        assert_eq!(
            snapshot,
            agent_studio_snapshot_at_path(&path).expect("snapshot should load")
        );
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

        let error = activate_skill_source_at_path(&path, "superpowers")
            .expect_err("validated source without approved permissions should not activate");
        assert_eq!(
            error.message,
            "invalid skill source: skill source permissions must be approved before activation"
        );

        let approved = approve_skill_source_permissions_at_path(
            &path,
            "superpowers",
            sample_permission_policy(),
        )
        .expect("skill source permissions should persist");
        assert!(approved.skill_sources[0].permission_gate.approved);

        let activated = activate_skill_source_at_path(&path, "superpowers")
            .expect("skill source should activate");
        let loaded = durable_state_snapshot_at_path(&path).expect("state should load");

        assert_eq!(activated, loaded);
        assert!(loaded.skill_sources[0].active);
    }

    #[test]
    fn record_skill_source_sync_success_command_persists_cache_metadata() {
        let path = test_path(
            "record_skill_source_sync_success_command_persists_cache_metadata",
            "state.json",
        );
        register_github_skill_source_at_path(&path, github_skill_source_request())
            .expect("github skill source should save");

        let synced = record_skill_source_sync_success_at_path(
            &path,
            "superpowers",
            "C:/AgenticCrew/cache/skills/superpowers".to_owned(),
            "abc123".to_owned(),
        )
        .expect("skill source sync should persist");
        let loaded = durable_state_snapshot_at_path(&path).expect("state should load");

        assert_eq!(synced, loaded);
        assert_eq!(
            loaded.skill_sources[0].local_cache_path,
            Some("C:/AgenticCrew/cache/skills/superpowers".to_owned())
        );
        assert_eq!(
            loaded.skill_sources[0].last_synced_commit,
            Some("abc123".to_owned())
        );
    }

    #[test]
    fn inspect_cached_skill_source_command_persists_discovered_manifests() {
        let path = test_path(
            "inspect_cached_skill_source_command_persists_discovered_manifests",
            "state.json",
        );
        let cache_path = test_path(
            "inspect_cached_skill_source_command_persists_discovered_manifests",
            "cache",
        );
        let skill_path = cache_path.join("skills/planning/SKILL.md");
        fs::create_dir_all(skill_path.parent().expect("skill parent")).expect("create skill dir");
        fs::write(
            &skill_path,
            "---\nname: planning\ndescription: Plan work safely\n---\n\nBody",
        )
        .expect("write skill manifest");
        register_github_skill_source_at_path(&path, github_skill_source_request())
            .expect("github skill source should save");
        record_skill_source_sync_success_at_path(
            &path,
            "superpowers",
            cache_path.display().to_string(),
            "abc123".to_owned(),
        )
        .expect("sync metadata should save");

        let inspected = inspect_cached_skill_source_at_path(&path, "superpowers")
            .expect("cached skill source should inspect");

        assert_eq!(
            inspected.skill_sources[0].status,
            crate::core::skills::SkillSourceActivationStatus::Validated
        );
        assert_eq!(inspected.skill_sources[0].discovered_skills.len(), 1);
        assert_eq!(
            inspected.skill_sources[0].discovered_skills[0].id,
            "superpowers/planning"
        );
        assert!(!inspected.skill_sources[0].active);
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

    fn sample_permission_policy() -> ApprovedPermissionPolicy {
        ApprovedPermissionPolicy {
            file_system: vec![FileSystemPermissionScope {
                path: "workspaces/research".to_owned(),
                writable: true,
            }],
            git: true,
            docker: false,
            network: vec![NetworkPermissionScope {
                host: "api.github.com".to_owned(),
            }],
            commands: vec![CommandPermissionScope {
                command: "git".to_owned(),
            }],
        }
    }

    fn test_path(test_name: &str, file_name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        env::temp_dir()
            .join(format!(
                "agenticcrew_core_command_tests_{}_{}_{}",
                std::process::id(),
                test_name,
                unique
            ))
            .join(file_name)
    }
}
