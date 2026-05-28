pub mod core;

pub fn app_name() -> &'static str {
    "AgentOS"
}

pub fn durable_state_snapshot() -> core::state::AgentOsState {
    core::state::AgentOsState::empty()
}

#[cfg(feature = "desktop-shell")]
mod commands {
    #[tauri::command]
    pub fn mission_control_snapshot() -> crate::core::mission_control::MissionControlSnapshot {
        crate::core::mission_control::initial_mission_control_snapshot()
    }

    #[tauri::command]
    pub fn durable_state_snapshot() -> crate::core::state::AgentOsState {
        crate::durable_state_snapshot()
    }
}

#[cfg(feature = "desktop-shell")]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::mission_control_snapshot,
            commands::durable_state_snapshot
        ])
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

    #[test]
    fn durable_state_snapshot_returns_empty_state() {
        use super::{core::state::AgentOsState, durable_state_snapshot};

        assert_eq!(durable_state_snapshot(), AgentOsState::empty());
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

    #[cfg(feature = "desktop-shell")]
    #[test]
    fn durable_state_command_delegates_to_snapshot() {
        use super::{commands, core::state::AgentOsState};

        assert_eq!(commands::durable_state_snapshot(), AgentOsState::empty());
    }
}
