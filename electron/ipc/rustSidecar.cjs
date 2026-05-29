const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { app } = require("electron");
const { assertCommand } = require("./contracts.cjs");

const repoRoot = resolve(__dirname, "..", "..");
const statePath = join(app.getPath("userData"), "agenticcrew-state.json");

function invokeRust(command, args) {
  assertCommand(command);

  if (args !== undefined && Object.keys(args).length > 0) {
    throw new Error(`Command '${command}' does not accept arguments yet`);
  }

  return new Promise((resolveValue, reject) => {
    const child = spawn(resolveSidecarCommand(), resolveSidecarArgs(command), {
      cwd: repoRoot,
      shell: process.platform === "win32"
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(parseError(stderr)));
        return;
      }

      try {
        resolveValue(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Invalid sidecar response: ${error.message}`));
      }
    });
  });
}

function resolveSidecarCommand() {
  const executable = process.platform === "win32" ? "agenticcrew-sidecar.exe" : "agenticcrew-sidecar";
  const packagedPath = join(process.resourcesPath ?? "", executable);

  if (app.isPackaged && existsSync(packagedPath)) {
    return packagedPath;
  }

  return "cargo";
}

function resolveSidecarArgs(command) {
  if (resolveSidecarCommand() !== "cargo") {
    return ["--state-path", statePath, command];
  }

  return [
    "run",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--no-default-features",
    "--bin",
    "agenticcrew-sidecar",
    "--",
    "--state-path",
    statePath,
    command
  ];
}

function parseError(stderr) {
  const trimmed = stderr.trim();

  if (trimmed.length === 0) {
    return "AgenticCrew sidecar failed";
  }

  try {
    return JSON.parse(trimmed).message ?? trimmed;
  } catch {
    return trimmed;
  }
}

module.exports = {
  invokeRust
};
