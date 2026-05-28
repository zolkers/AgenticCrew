# AgentOS

Local-first desktop cockpit for designing, running, validating, and reviewing agentic feature sessions.

## Scope

The current slice includes:

- React Mission Control shell with i18n resources.
- Rust-owned core domain for sessions, evidence, costs, and harness policy seeds.
- Optional Python worker package for future model/tool adapters.
- SonarLint workspace recommendation and strict local quality gates.

## Local Evidence Commands

Install dependencies:

```bash
npm ci
python -m pip install -e "workers/python[dev]"
```

Run quality gates:

```bash
npm run quality
npm run desktop:test
```

Run specific gates:

```bash
npm run frontend:quality
npm run worker:quality
npm run worker:test
npm run worker:lint
npm run worker:typecheck
```

## Platform Tooling Notes

- AgentOS Core state is owned by Rust under `src-tauri/src/core`.
- Python lives under `workers/python` and must not own sessions, checkpoints, audit, costs, or gates.
- Python 3.12 is required for optional workers.
- Rust/Tauri on Windows requires Visual Studio Build Tools with the C++ workload so `link.exe` is available.
- Rust/Tauri on Linux requires WebKitGTK/GTK system packages. The GitHub Actions workflow installs the Ubuntu packages before running `cargo test`.
- Rust/Tauri on macOS requires Xcode command line tools.
- SonarLint for VS Code is recommended through `.vscode/extensions.json`.
