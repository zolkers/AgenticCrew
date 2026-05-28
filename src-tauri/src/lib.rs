pub mod core;

pub fn app_name() -> &'static str {
    "AgentOS"
}

#[tauri::command]
pub fn mission_control_snapshot() -> core::mission_control::MissionControlSnapshot {
    core::mission_control::initial_mission_control_snapshot()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![mission_control_snapshot])
        .run(tauri::generate_context!())
        .expect("failed to run AgentOS desktop shell");
}

#[cfg(test)]
mod tests {
    use super::app_name;

    #[test]
    fn app_name_is_agentos() {
        assert_eq!(app_name(), "AgentOS");
    }
}
