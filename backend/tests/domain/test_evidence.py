from datetime import UTC, datetime

from agentos_core.domain.evidence import Evidence


def test_evidence_records_command_result() -> None:
    created_at = datetime(2026, 5, 28, 15, 4, 22, tzinfo=UTC)

    evidence = Evidence(
        evidence_id="ev_1042",
        session_id="feat_todo_api",
        checkpoint_id="tests_passing",
        type="command_exit_code",
        command="pytest",
        exit_code=0,
        created_at=created_at,
        created_by="qa",
    )

    assert evidence.exit_code == 0
    assert evidence.created_at == created_at
