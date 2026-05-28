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
    use serde::ser::{self, Impossible, Serializer};
    use serde::Serialize;

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
        let serialized = EvidenceType::CommandExitCode
            .serialize(UnitVariantSerializer)
            .unwrap();

        assert_eq!(serialized, "command_exit_code");
    }

    #[derive(Debug, PartialEq, Eq)]
    struct SerializationError;

    impl ser::Error for SerializationError {
        fn custom<T>(_message: T) -> Self
        where
            T: std::fmt::Display,
        {
            Self
        }
    }

    impl std::fmt::Display for SerializationError {
        fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("serialization error")
        }
    }

    impl std::error::Error for SerializationError {}

    struct UnitVariantSerializer;

    impl Serializer for UnitVariantSerializer {
        type Ok = &'static str;
        type Error = SerializationError;
        type SerializeSeq = Impossible<Self::Ok, Self::Error>;
        type SerializeTuple = Impossible<Self::Ok, Self::Error>;
        type SerializeTupleStruct = Impossible<Self::Ok, Self::Error>;
        type SerializeTupleVariant = Impossible<Self::Ok, Self::Error>;
        type SerializeMap = Impossible<Self::Ok, Self::Error>;
        type SerializeStruct = Impossible<Self::Ok, Self::Error>;
        type SerializeStructVariant = Impossible<Self::Ok, Self::Error>;

        fn serialize_unit_variant(
            self,
            _name: &'static str,
            _variant_index: u32,
            variant: &'static str,
        ) -> Result<Self::Ok, Self::Error> {
            Ok(variant)
        }

        fn serialize_bool(self, _value: bool) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_i8(self, _value: i8) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_i16(self, _value: i16) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_i32(self, _value: i32) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_i64(self, _value: i64) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_i128(self, _value: i128) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_u8(self, _value: u8) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_u16(self, _value: u16) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_u32(self, _value: u32) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_u64(self, _value: u64) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_u128(self, _value: u128) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_f32(self, _value: f32) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_f64(self, _value: f64) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_char(self, _value: char) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_str(self, _value: &str) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_bytes(self, _value: &[u8]) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_none(self) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_some<T>(self, _value: &T) -> Result<Self::Ok, Self::Error>
        where
            T: ?Sized + Serialize,
        {
            Err(SerializationError)
        }

        fn serialize_unit(self) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_unit_struct(self, _name: &'static str) -> Result<Self::Ok, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_newtype_struct<T>(
            self,
            _name: &'static str,
            _value: &T,
        ) -> Result<Self::Ok, Self::Error>
        where
            T: ?Sized + Serialize,
        {
            Err(SerializationError)
        }

        fn serialize_newtype_variant<T>(
            self,
            _name: &'static str,
            _variant_index: u32,
            _variant: &'static str,
            _value: &T,
        ) -> Result<Self::Ok, Self::Error>
        where
            T: ?Sized + Serialize,
        {
            Err(SerializationError)
        }

        fn serialize_seq(self, _len: Option<usize>) -> Result<Self::SerializeSeq, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_tuple(self, _len: usize) -> Result<Self::SerializeTuple, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_tuple_struct(
            self,
            _name: &'static str,
            _len: usize,
        ) -> Result<Self::SerializeTupleStruct, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_tuple_variant(
            self,
            _name: &'static str,
            _variant_index: u32,
            _variant: &'static str,
            _len: usize,
        ) -> Result<Self::SerializeTupleVariant, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_map(self, _len: Option<usize>) -> Result<Self::SerializeMap, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_struct(
            self,
            _name: &'static str,
            _len: usize,
        ) -> Result<Self::SerializeStruct, Self::Error> {
            Err(SerializationError)
        }

        fn serialize_struct_variant(
            self,
            _name: &'static str,
            _variant_index: u32,
            _variant: &'static str,
            _len: usize,
        ) -> Result<Self::SerializeStructVariant, Self::Error> {
            Err(SerializationError)
        }
    }
}
