from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

EvidenceType = Literal[
    "file_exists",
    "file_modified",
    "command_exit_code",
    "command_output_contains",
    "git_diff_contains",
    "docker_service_healthy",
    "tool_call_succeeded",
    "reviewer_approved",
    "human_approved",
]


class Evidence(BaseModel):
    model_config = ConfigDict(frozen=True)

    evidence_id: str
    session_id: str
    checkpoint_id: str
    type: EvidenceType
    command: str
    exit_code: int
    created_at: datetime
    created_by: str
