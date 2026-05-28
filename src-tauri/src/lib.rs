pub mod core;

pub fn app_name() -> &'static str {
    "AgentOS"
}

#[cfg(feature = "desktop-shell")]
mod commands {
    #[tauri::command]
    pub fn mission_control_snapshot() -> crate::core::mission_control::MissionControlSnapshot {
        crate::core::mission_control::initial_mission_control_snapshot()
    }
}

#[cfg(feature = "desktop-shell")]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::mission_control_snapshot])
        .run(tauri::generate_context!())
        .expect("failed to run AgentOS desktop shell");
}

#[cfg(not(feature = "desktop-shell"))]
pub fn run() {
    panic!("AgentOS desktop shell requires the desktop-shell Cargo feature");
}

#[cfg(test)]
mod tests {
    use super::app_name;

    #[test]
    fn app_name_is_agentos() {
        assert_eq!(app_name(), "AgentOS");
    }

    #[cfg(feature = "desktop-shell")]
    #[test]
    fn mission_control_command_delegates_to_initial_snapshot() {
        use super::{commands, core::mission_control::initial_mission_control_snapshot};

        assert_eq!(
            commands::mission_control_snapshot(),
            initial_mission_control_snapshot()
        );
    }
}
