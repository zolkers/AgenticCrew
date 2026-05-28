# AgentOS

Local-first desktop cockpit for designing, running, validating, and reviewing agentic feature sessions.

## Scope

The current slice includes:

- React Mission Control shell with i18n resources.
- FastAPI core health route and typed session/evidence/cost domain models.
- Pi-inspired harness policy seed in the Markdown library.
- SonarLint workspace recommendation and strict local quality gates.

## Local Evidence Commands

Install dependencies:

```bash
npm ci
python -m pip install -e "backend[dev]"
```

Run quality gates:

```bash
npm run quality
npm run desktop:test
```

Run specific gates:

```bash
npm run frontend:quality
npm run backend:quality
npm run backend:test
npm run backend:lint
npm run backend:typecheck
```

## Platform Tooling Notes

- Python 3.12 is required for the backend.
- Rust/Tauri on Windows requires Visual Studio Build Tools with the C++ workload so `link.exe` is available.
- Rust/Tauri on Linux requires WebKitGTK/GTK system packages. The GitHub Actions workflow installs the Ubuntu packages before running `cargo test`.
- Rust/Tauri on macOS requires Xcode command line tools.
- SonarLint for VS Code is recommended through `.vscode/extensions.json`.
