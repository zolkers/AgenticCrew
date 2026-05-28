# AgentOS

Local-first desktop cockpit for designing, running, validating, and reviewing agentic feature sessions.

## Scope

The current slice includes:

- React Mission Control shell with i18n resources.
- FastAPI core health route and typed session/evidence/cost domain models.
- Pi-inspired harness policy seed in the Markdown library.
- SonarLint workspace recommendation and strict local quality gates.

## Local Evidence Commands

```powershell
npm run quality
```

```powershell
& "C:\Users\riege\Documents\perso\agentos\backend\.venv\Scripts\python.exe" -m pytest tests -q
& "C:\Users\riege\Documents\perso\agentos\backend\.venv\Scripts\python.exe" -m ruff check .
& "C:\Users\riege\Documents\perso\agentos\backend\.venv\Scripts\python.exe" -m mypy agentos_core
```

```powershell
cd src-tauri
cargo test
```

## Windows Tooling Notes

- Python 3.12 is required for the backend.
- Rust/Tauri on Windows requires Visual Studio Build Tools with the C++ workload so `link.exe` is available.
- SonarLint for VS Code is recommended through `.vscode/extensions.json`.
