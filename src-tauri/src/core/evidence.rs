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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandExitCodeEvidence {
    pub evidence_id: String,
    pub session_id: String,
    pub checkpoint_id: String,
    pub command: String,
    pub exit_code: i32,
    pub created_at: String,
    pub created_by: String,
}

impl Evidence {
    pub fn command_exit_code(params: CommandExitCodeEvidence) -> Self {
        Self {
            evidence_id: params.evidence_id,
            session_id: params.session_id,
            checkpoint_id: params.checkpoint_id,
            evidence_type: EvidenceType::CommandExitCode,
            command: params.command,
            exit_code: params.exit_code,
            created_at: params.created_at,
            created_by: params.created_by,
        }
    }

    pub fn command_succeeded(&self) -> bool {
        self.evidence_type == EvidenceType::CommandExitCode && self.exit_code == 0
    }
}

#[cfg(test)]
mod tests {
    use super::{CommandExitCodeEvidence, Evidence, EvidenceType};

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

    #[test]
    fn command_exit_code_success_records_metadata_and_command_succeeded() {
        let evidence = Evidence::command_exit_code(CommandExitCodeEvidence {
            evidence_id: "ev_1042".to_owned(),
            session_id: "feat_todo_api".to_owned(),
            checkpoint_id: "tests_passing".to_owned(),
            command: "cargo test".to_owned(),
            exit_code: 0,
            created_at: "2026-05-28T15:04:22Z".to_owned(),
            created_by: "qa".to_owned(),
        });

        assert_eq!(evidence.evidence_id, "ev_1042");
        assert_eq!(evidence.session_id, "feat_todo_api");
        assert_eq!(evidence.checkpoint_id, "tests_passing");
        assert_eq!(evidence.evidence_type, EvidenceType::CommandExitCode);
        assert_eq!(evidence.command, "cargo test");
        assert_eq!(evidence.exit_code, 0);
        assert_eq!(evidence.created_by, "qa");
        assert_eq!(evidence.created_at, "2026-05-28T15:04:22Z");
        assert!(evidence.command_succeeded());
    }

    #[test]
    fn command_exit_code_failure_is_valid_evidence_but_not_success() {
        let evidence = Evidence::command_exit_code(CommandExitCodeEvidence {
            evidence_id: "ev_1043".to_owned(),
            session_id: "feat_todo_api".to_owned(),
            checkpoint_id: "tests_passing".to_owned(),
            command: "cargo test".to_owned(),
            exit_code: 101,
            created_at: "2026-05-28T15:05:00Z".to_owned(),
            created_by: "qa".to_owned(),
        });

        assert_eq!(evidence.evidence_type, EvidenceType::CommandExitCode);
        assert_eq!(evidence.exit_code, 101);
        assert!(!evidence.command_succeeded());
    }

    #[test]
    fn command_exit_code_evidence_type_serializes_as_stable_snake_case() {
        let serialized = serde_json::to_string(&EvidenceType::CommandExitCode).unwrap();

        assert_eq!(serialized, "\"command_exit_code\"");
    }
}
