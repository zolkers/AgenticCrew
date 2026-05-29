use std::{
    env,
    io::{Read, Write},
    path::PathBuf,
    process::{self, Command, Stdio},
};

use agenticcrew_core::{
    activate_skill_source_at_path, agent_studio_snapshot_at_path,
    approve_skill_source_permissions_at_path,
    core::agents::{
        CreateAgentTemplateRequest, PromoteAgentTrainingRunRequest, SetAgentTemplateActiveRequest,
        UpdateAgentTemplateRequest,
    },
    core::costs::RecordModelCallEstimateRequest,
    core::harnesses::{
        CreateHarnessProfileRequest, SetHarnessProfileActiveRequest, UpdateHarnessProfileRequest,
    },
    core::permissions::ApprovedPermissionPolicy,
    core::pi_extensions::{ImportPiExtensionRequest, SetPiExtensionActiveRequest},
    core::runs::StartRunRequest,
    core::settings::{
        AiModelRecord, ProviderModelCatalog, ProviderModelCatalogError, SyncProviderModelsRequest,
        UpdateAiProviderSettingsRequest,
    },
    core::skills::RegisterGitHubSkillSourceRequest,
    core::workspaces::{
        CreateWorkspaceRequest, RefreshWorkspaceGitStatusRequest, UpdateWorkspaceGitContextRequest,
        UpdateWorkspaceLoadoutRequest,
    },
    create_agent_template_at_path, create_harness_profile_at_path, create_workspace_at_path,
    harness_studio_snapshot_at_path, import_pi_extension_at_path,
    inspect_cached_skill_source_at_path, mission_control_snapshot_at_path,
    promote_agent_training_run_at_path, record_model_call_estimate_at_path,
    refresh_workspace_git_status_at_path, register_github_skill_source_at_path,
    runs_snapshot_at_path, set_agent_template_active_at_path, set_harness_profile_active_at_path,
    set_pi_extension_active_at_path, settings_snapshot_at_path, skill_sources_snapshot_at_path,
    start_run_at_path, sync_github_skill_source_at_path, sync_provider_models_at_path_with_catalog,
    update_agent_template_at_path, update_ai_provider_settings_at_path,
    update_harness_profile_at_path, update_workspace_git_context_at_path,
    update_workspace_loadout_at_path, workspace_snapshot_at_path, DesktopCommandError,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SidecarError {
    message: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SourceIdArgs {
    source_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegisterGitHubSkillSourceArgs {
    request: RegisterGitHubSkillSourceRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApprovePermissionsArgs {
    source_id: String,
    policy: ApprovedPermissionPolicy,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSettingsArgs {
    request: UpdateAiProviderSettingsRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncProviderModelsArgs {
    request: SyncProviderModelsRequest,
}

#[derive(Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[derive(Deserialize)]
struct OpenAiModel {
    id: String,
}

struct OpenAiHttpModelCatalog;

impl ProviderModelCatalog for OpenAiHttpModelCatalog {
    fn load_models(
        &self,
        request: &SyncProviderModelsRequest,
    ) -> Result<Vec<AiModelRecord>, ProviderModelCatalogError> {
        let api_key = request
            .api_key
            .as_deref()
            .map(str::trim)
            .filter(|key| !key.is_empty())
            .map(str::to_owned)
            .or_else(|| env::var("OPENAI_API_KEY").ok())
            .ok_or(ProviderModelCatalogError::MissingApiKey)?;
        let output = openai_models_response(&api_key)?;
        let payload = serde_json::from_slice::<OpenAiModelsResponse>(&output)
            .map_err(|error| ProviderModelCatalogError::FetchFailed(error.to_string()))?;

        Ok(payload
            .data
            .into_iter()
            .filter(|model| is_openai_chat_model(&model.id))
            .map(|model| AiModelRecord {
                label: model.id.clone(),
                id: model.id,
                provider_id: "openai".to_owned(),
            })
            .collect())
    }
}

fn openai_models_response(api_key: &str) -> Result<Vec<u8>, ProviderModelCatalogError> {
    let mut child = Command::new("curl")
        .args([
            "--fail",
            "--silent",
            "--show-error",
            "--config",
            "-",
            "https://api.openai.com/v1/models",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| ProviderModelCatalogError::FetchFailed(error.to_string()))?;

    if let Some(mut stdin) = child.stdin.take() {
        writeln!(stdin, "header = \"Authorization: Bearer {api_key}\"")
            .map_err(|error| ProviderModelCatalogError::FetchFailed(error.to_string()))?;
        writeln!(stdin, "header = \"Accept: application/json\"")
            .map_err(|error| ProviderModelCatalogError::FetchFailed(error.to_string()))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| ProviderModelCatalogError::FetchFailed(error.to_string()))?;
    if output.status.success() {
        return Ok(output.stdout);
    }

    let status = output.status.code().unwrap_or_default();
    Err(ProviderModelCatalogError::FetchFailed(format!(
        "HTTP {status}"
    )))
}

fn is_openai_chat_model(model_id: &str) -> bool {
    model_id.starts_with("gpt-")
        || model_id.starts_with("o1")
        || model_id.starts_with("o3")
        || model_id.starts_with("o4")
        || model_id.starts_with("o5")
        || model_id.starts_with("chatgpt-")
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateHarnessProfileArgs {
    request: CreateHarnessProfileRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetHarnessProfileActiveArgs {
    request: SetHarnessProfileActiveRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateHarnessProfileArgs {
    request: UpdateHarnessProfileRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportPiExtensionArgs {
    request: ImportPiExtensionRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetPiExtensionActiveArgs {
    request: SetPiExtensionActiveRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateAgentTemplateArgs {
    request: CreateAgentTemplateRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetAgentTemplateActiveArgs {
    request: SetAgentTemplateActiveRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateAgentTemplateArgs {
    request: UpdateAgentTemplateRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PromoteAgentTrainingRunArgs {
    request: PromoteAgentTrainingRunRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecordModelCallEstimateArgs {
    request: RecordModelCallEstimateRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateWorkspaceArgs {
    request: CreateWorkspaceRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateWorkspaceGitContextArgs {
    request: UpdateWorkspaceGitContextRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RefreshWorkspaceGitStatusArgs {
    request: RefreshWorkspaceGitStatusRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateWorkspaceLoadoutArgs {
    request: UpdateWorkspaceLoadoutRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartRunArgs {
    request: StartRunRequest,
}

fn main() {
    if let Err(error) = run() {
        print_error(error);
        process::exit(1);
    }
}

fn run() -> Result<(), DesktopCommandError> {
    let mut args = env::args().skip(1);
    let state_path = match args.next().as_deref() {
        Some("--state-path") => args
            .next()
            .map(PathBuf::from)
            .ok_or_else(|| DesktopCommandError::public("missing state path"))?,
        _ => return Err(DesktopCommandError::public("expected --state-path <path>")),
    };
    let command = args
        .next()
        .ok_or_else(|| DesktopCommandError::public("missing command"))?;
    let mut args_json = "{}".to_owned();
    let mut cache_root = None;

    while let Some(flag) = args.next() {
        match flag.as_str() {
            "--args-json" => {
                args_json = args
                    .next()
                    .ok_or_else(|| DesktopCommandError::public("missing --args-json value"))?;
            }
            "--args-stdin" => {
                args_json.clear();
                std::io::stdin()
                    .read_to_string(&mut args_json)
                    .map_err(|error| {
                        DesktopCommandError::public(format!("failed to read sidecar args: {error}"))
                    })?;
            }
            "--cache-root" => {
                cache_root = Some(PathBuf::from(args.next().ok_or_else(|| {
                    DesktopCommandError::public("missing --cache-root value")
                })?));
            }
            _ => {
                return Err(DesktopCommandError::public(format!(
                    "unknown sidecar option '{flag}'"
                )));
            }
        }
    }

    match command.as_str() {
        "mission_control_snapshot" => print_json(&mission_control_snapshot_at_path(state_path)?),
        "record_model_call_estimate" => {
            let args = parse_args::<RecordModelCallEstimateArgs>(&args_json)?;

            print_json(&record_model_call_estimate_at_path(
                state_path,
                args.request,
            )?)
        }
        "workspace_snapshot" => print_json(&workspace_snapshot_at_path(state_path)?),
        "create_workspace" => {
            let args = parse_args::<CreateWorkspaceArgs>(&args_json)?;

            print_json(&create_workspace_at_path(state_path, args.request)?)
        }
        "update_workspace_git_context" => {
            let args = parse_args::<UpdateWorkspaceGitContextArgs>(&args_json)?;

            print_json(&update_workspace_git_context_at_path(
                state_path,
                args.request,
            )?)
        }
        "refresh_workspace_git_status" => {
            let args = parse_args::<RefreshWorkspaceGitStatusArgs>(&args_json)?;

            print_json(&refresh_workspace_git_status_at_path(
                state_path,
                args.request,
            )?)
        }
        "update_workspace_loadout" => {
            let args = parse_args::<UpdateWorkspaceLoadoutArgs>(&args_json)?;

            print_json(&update_workspace_loadout_at_path(state_path, args.request)?)
        }
        "runs_snapshot" => print_json(&runs_snapshot_at_path(state_path)?),
        "start_run" => {
            let args = parse_args::<StartRunArgs>(&args_json)?;

            print_json(&start_run_at_path(state_path, args.request)?)
        }
        "skill_sources_snapshot" => print_json(&skill_sources_snapshot_at_path(state_path)?),
        "harness_studio_snapshot" => print_json(&harness_studio_snapshot_at_path(state_path)?),
        "create_harness_profile" => {
            let args = parse_args::<CreateHarnessProfileArgs>(&args_json)?;

            print_json(&create_harness_profile_at_path(state_path, args.request)?)
        }
        "set_harness_profile_active" => {
            let args = parse_args::<SetHarnessProfileActiveArgs>(&args_json)?;

            print_json(&set_harness_profile_active_at_path(
                state_path,
                args.request,
            )?)
        }
        "update_harness_profile" => {
            let args = parse_args::<UpdateHarnessProfileArgs>(&args_json)?;

            print_json(&update_harness_profile_at_path(state_path, args.request)?)
        }
        "import_pi_extension" => {
            let args = parse_args::<ImportPiExtensionArgs>(&args_json)?;

            print_json(&import_pi_extension_at_path(state_path, args.request)?)
        }
        "set_pi_extension_active" => {
            let args = parse_args::<SetPiExtensionActiveArgs>(&args_json)?;

            print_json(&set_pi_extension_active_at_path(state_path, args.request)?)
        }
        "agent_studio_snapshot" => print_json(&agent_studio_snapshot_at_path(state_path)?),
        "create_agent_template" => {
            let args = parse_args::<CreateAgentTemplateArgs>(&args_json)?;

            print_json(&create_agent_template_at_path(state_path, args.request)?)
        }
        "set_agent_template_active" => {
            let args = parse_args::<SetAgentTemplateActiveArgs>(&args_json)?;

            print_json(&set_agent_template_active_at_path(
                state_path,
                args.request,
            )?)
        }
        "update_agent_template" => {
            let args = parse_args::<UpdateAgentTemplateArgs>(&args_json)?;

            print_json(&update_agent_template_at_path(state_path, args.request)?)
        }
        "promote_agent_training_run" => {
            let args = parse_args::<PromoteAgentTrainingRunArgs>(&args_json)?;

            print_json(&promote_agent_training_run_at_path(
                state_path,
                args.request,
            )?)
        }
        "settings_snapshot" => print_json(&settings_snapshot_at_path(state_path)?),
        "register_github_skill_source" => {
            let args = parse_args::<RegisterGitHubSkillSourceArgs>(&args_json)?;

            print_json(&register_github_skill_source_at_path(
                state_path,
                args.request,
            )?)
        }
        "sync_github_skill_source" => {
            let args = parse_args::<SourceIdArgs>(&args_json)?;
            let cache_root = cache_root
                .ok_or_else(|| DesktopCommandError::public("missing cache root for skill sync"))?;

            print_json(&sync_github_skill_source_at_path(
                state_path,
                cache_root,
                &args.source_id,
            )?)
        }
        "inspect_cached_skill_source" => {
            let args = parse_args::<SourceIdArgs>(&args_json)?;

            print_json(&inspect_cached_skill_source_at_path(
                state_path,
                &args.source_id,
            )?)
        }
        "approve_skill_source_permissions" => {
            let args = parse_args::<ApprovePermissionsArgs>(&args_json)?;

            print_json(&approve_skill_source_permissions_at_path(
                state_path,
                &args.source_id,
                args.policy,
            )?)
        }
        "activate_skill_source" => {
            let args = parse_args::<SourceIdArgs>(&args_json)?;

            print_json(&activate_skill_source_at_path(state_path, &args.source_id)?)
        }
        "update_ai_provider_settings" => {
            let args = parse_args::<UpdateSettingsArgs>(&args_json)?;

            print_json(&update_ai_provider_settings_at_path(
                state_path,
                args.request,
            )?)
        }
        "sync_provider_models" => {
            let args = parse_args::<SyncProviderModelsArgs>(&args_json)?;

            print_json(&sync_provider_models_at_path_with_catalog(
                state_path,
                args.request,
                &OpenAiHttpModelCatalog,
            )?)
        }
        _ => Err(DesktopCommandError::public(format!(
            "unknown sidecar command '{command}'"
        ))),
    }
}

fn parse_args<T: DeserializeOwned>(payload: &str) -> Result<T, DesktopCommandError> {
    serde_json::from_str(payload)
        .map_err(|error| DesktopCommandError::public(format!("invalid sidecar args: {error}")))
}

fn print_json(value: &impl Serialize) -> Result<(), DesktopCommandError> {
    let payload = serde_json::to_string(value)
        .map_err(|error| DesktopCommandError::public(error.to_string()))?;
    println!("{payload}");
    Ok(())
}

fn print_error(error: DesktopCommandError) {
    let payload = serde_json::to_string(&SidecarError {
        message: error.message,
    })
    .unwrap_or_else(|_| "{\"message\":\"sidecar error\"}".to_owned());
    eprintln!("{payload}");
}
