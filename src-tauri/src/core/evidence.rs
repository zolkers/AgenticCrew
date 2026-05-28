use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceType {
    FileExists,
    FileModified,
    CommandExitCode,
    CommandOutputContains,
    GitDiffContains,
    DockerServiceHealthy,
    ToolCallSucceeded,
    ReviewerApproved,
    HumanApproved,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct Evidence {
    pub evidence_id: String,
    pub session_id: String,
    pub checkpoint_id: String,
    pub evidence_type: EvidenceType,
    pub command: String,
    pub exit_code: i32,
    pub created_at: String,
    pub created_by: String,
}

#[cfg(test)]
mod tests {
    use super::{Evidence, EvidenceType};

    #[test]
    fn evidence_records_command_result() {
        let evidence = Evidence {
            evidence_id: "ev_1042".to_owned(),
            session_id: "feat_todo_api".to_owned(),
            checkpoint_id: "tests_passing".to_owned(),
            evidence_type: EvidenceType::CommandExitCode,
            command: "cargo test".to_owned(),
            exit_code: 0,
            created_at: "2026-05-28T15:04:22Z".to_owned(),
            created_by: "qa".to_owned(),
        };

        assert_eq!(evidence.exit_code, 0);
        assert_eq!(evidence.evidence_type, EvidenceType::CommandExitCode);
    }
}
