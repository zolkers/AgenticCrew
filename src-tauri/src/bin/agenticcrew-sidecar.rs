use std::{env, path::PathBuf, process};

use agenticcrew_desktop::{
    agent_studio_snapshot_at_path, approve_skill_source_permissions_at_path,
    core::permissions::ApprovedPermissionPolicy, harness_studio_snapshot_at_path,
    core::settings::UpdateAiProviderSettingsRequest, inspect_cached_skill_source_at_path,
    mission_control_snapshot_at_path, settings_snapshot_at_path, skill_sources_snapshot_at_path,
    sync_github_skill_source_at_path, update_ai_provider_settings_at_path, DesktopCommandError,
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
struct ApprovePermissionsArgs {
    source_id: String,
    policy: ApprovedPermissionPolicy,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSettingsArgs {
    request: UpdateAiProviderSettingsRequest,
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
            "--cache-root" => {
                cache_root = Some(PathBuf::from(
                    args.next()
                        .ok_or_else(|| DesktopCommandError::public("missing --cache-root value"))?,
                ));
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
        "skill_sources_snapshot" => print_json(&skill_sources_snapshot_at_path(state_path)?),
        "harness_studio_snapshot" => print_json(&harness_studio_snapshot_at_path(state_path)?),
        "agent_studio_snapshot" => print_json(&agent_studio_snapshot_at_path(state_path)?),
        "settings_snapshot" => print_json(&settings_snapshot_at_path(state_path)?),
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
        "update_ai_provider_settings" => {
            let args = parse_args::<UpdateSettingsArgs>(&args_json)?;

            print_json(&update_ai_provider_settings_at_path(state_path, args.request)?)
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
