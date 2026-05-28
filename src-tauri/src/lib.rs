pub fn app_name() -> &'static str {
    "AgentOS"
}

pub fn run() {
    tauri::Builder::default()
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
