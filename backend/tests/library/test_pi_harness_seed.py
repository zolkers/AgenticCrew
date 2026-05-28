from pathlib import Path


def test_pi_harness_seed_defines_execution_discipline() -> None:
    seed = Path("agentos_core/library/seed/harness/pi_execution_discipline.md")

    content = seed.read_text(encoding="utf-8")

    assert "id: pi_execution_discipline" in content
    assert "type: harness_policy" in content
    assert "targeted inspection" in content
    assert "precise edits" in content
    assert "parallel independent inspection" in content
    assert "validate before final claims" in content
