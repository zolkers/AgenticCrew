use std::{env, path::PathBuf, process};

use agenticcrew_desktop::{
    agent_studio_snapshot_at_path, harness_studio_snapshot_at_path, mission_control_snapshot_at_path,
    skill_sources_snapshot_at_path, DesktopCommandError,
};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SidecarError {
    message: String,
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

    match command.as_str() {
        "mission_control_snapshot" => print_json(&mission_control_snapshot_at_path(state_path)?),
        "skill_sources_snapshot" => print_json(&skill_sources_snapshot_at_path(state_path)?),
        "harness_studio_snapshot" => print_json(&harness_studio_snapshot_at_path(state_path)?),
        "agent_studio_snapshot" => print_json(&agent_studio_snapshot_at_path(state_path)?),
        _ => Err(DesktopCommandError::public(format!(
            "unknown sidecar command '{command}'"
        ))),
    }
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
