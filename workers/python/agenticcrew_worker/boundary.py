"""Architecture guard for the Python worker boundary."""

from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent

RESERVED_CORE_STATE_MODULES = frozenset(
    {
        "core",
        "costs",
        "evidence",
        "library",
        "mission_control",
        "session_store",
        "sessions",
        "state",
        "store",
    },
)

DURABLE_PERSISTENCE_MARKERS = frozenset(
    {
        "duckdb",
        "redis",
        "shelve",
        "sqlalchemy",
        "sqlite3",
    },
)


def find_worker_boundary_violations(worker_root: Path = PACKAGE_ROOT) -> list[str]:
    violations: list[str] = []

    for path in sorted(worker_root.rglob("*.py")):
        if path.name == "boundary.py":
            continue

        relative_path = path.relative_to(worker_root).as_posix()

        if path.stem in RESERVED_CORE_STATE_MODULES:
            violations.append(
                f"{relative_path} uses reserved core-state module name '{path.stem}'",
            )

        content = path.read_text(encoding="utf-8").lower()
        violations.extend(
            f"{relative_path} references durable persistence marker '{marker}'"
            for marker in sorted(DURABLE_PERSISTENCE_MARKERS)
            if marker in content
        )

    return violations


def assert_worker_boundary(worker_root: Path = PACKAGE_ROOT) -> None:
    violations = find_worker_boundary_violations(worker_root)
    if violations:
        details = "\n".join(f"- {violation}" for violation in violations)
        message = f"Python worker boundary violations:\n{details}"
        raise AssertionError(message)
