from pathlib import Path

import pytest

from agentos_worker.boundary import assert_worker_boundary, find_worker_boundary_violations


def test_worker_package_respects_boundary() -> None:
    assert_worker_boundary()


def test_boundary_guard_flags_core_state_modules(tmp_path: Path) -> None:
    worker_root = tmp_path / "agentos_worker"
    worker_root.mkdir()
    (worker_root / "state.py").write_text("OWNER = 'python'\n", encoding="utf-8")

    assert find_worker_boundary_violations(worker_root) == [
        "state.py uses reserved core-state module name 'state'",
    ]


def test_boundary_guard_flags_durable_persistence(tmp_path: Path) -> None:
    worker_root = tmp_path / "agentos_worker"
    worker_root.mkdir()
    (worker_root / "adapter.py").write_text("import sqlite3\n", encoding="utf-8")

    with pytest.raises(AssertionError, match="Python worker boundary violations"):
        assert_worker_boundary(worker_root)
