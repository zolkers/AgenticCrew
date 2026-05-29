# AgenticCrew

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

Run desktop Rust tests in Docker when local Windows MSVC/MinGW prerequisites are not installed:

```bash
npm run docker:desktop:test
```

Run the frontend quickly in Docker:

```bash
npm run docker:frontend
```

Docker Desktop or a Docker-compatible daemon must be running. Then open `http://localhost:5173`. This launches the React frontend preview; the native Tauri desktop shell still runs on the host OS because it needs the platform WebView.

Run Linux quality gates in Docker:

```bash
npm run docker:quality
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

- AgenticCrew Core state is owned by Rust under `src-tauri/src/core`.
- Python lives under `workers/python` and must not own sessions, checkpoints, audit, costs, or gates.
- Python 3.12 is required for optional workers.
- Rust/Tauri on Windows requires Microsoft C++ Build Tools and the Windows SDK. Install the Visual Studio Build Tools "Desktop development with C++" workload, including MSVC v143 x64/x86 build tools and a Windows 10 or Windows 11 SDK, so `link.exe` and Windows import libraries such as `kernel32.lib` are available. `rust-lld` alone is not enough for the MSVC target in this workspace because it still needs those SDK import libraries.
- If MSVC is not available on Windows, `npm run desktop:test` falls back to the Rust GNU toolchain for core tests. Install it with `rustup toolchain install stable-x86_64-pc-windows-gnu`; MinGW binutils must also be available on `PATH` or through CLion's bundled MinGW.
- Rust/Tauri on Linux requires WebKitGTK/GTK system packages. The GitHub Actions workflow installs the Ubuntu packages before running `cargo test`.
- Rust/Tauri on macOS requires Xcode command line tools.
- SonarLint for VS Code is recommended through `.vscode/extensions.json`.
