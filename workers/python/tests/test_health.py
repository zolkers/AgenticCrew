from agentos_worker.health import worker_health


def test_worker_health_returns_runtime_status() -> None:
    assert worker_health() == {"status": "ok", "runtime": "python-worker"}
