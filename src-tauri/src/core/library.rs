pub const PI_EXECUTION_DISCIPLINE: &str =
    include_str!("library/pi_execution_discipline.md");

#[cfg(test)]
mod tests {
    use super::PI_EXECUTION_DISCIPLINE;

    #[test]
    fn pi_harness_seed_defines_execution_discipline() {
        assert!(PI_EXECUTION_DISCIPLINE.contains("id: pi_execution_discipline"));
        assert!(PI_EXECUTION_DISCIPLINE.contains("type: harness_policy"));
        assert!(PI_EXECUTION_DISCIPLINE.contains("targeted inspection"));
        assert!(PI_EXECUTION_DISCIPLINE.contains("precise edits"));
        assert!(PI_EXECUTION_DISCIPLINE.contains("parallel independent inspection"));
        assert!(PI_EXECUTION_DISCIPLINE.contains("validate before final claims"));
    }
}
