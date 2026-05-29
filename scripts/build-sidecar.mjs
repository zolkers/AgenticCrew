import { accessSync, constants, copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const sidecarPackage = "agenticcrew-sidecar";
const sidecarExecutable = process.platform === "win32" ? "agenticcrew-sidecar.exe" : "agenticcrew-sidecar";

function commandOutput(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform !== "win32"
  });
}

function canExecute(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function existingPaths(paths) {
  return paths.filter((path) => path !== undefined && existsSync(path));
}

function runCargo(args, env = process.env) {
  return spawnSync("cargo", args, {
    cwd: repoRoot,
    env,
    shell: false,
    stdio: "inherit"
  }).status ?? 1;
}

function findMsvcLink() {
  if (process.platform !== "win32") {
    return undefined;
  }

  const result = commandOutput("where", ["link.exe"]);
  if (result.status !== 0 || result.stdout.trim().length === 0) {
    return undefined;
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((path) => path.trim())
    .find((path) => {
      const normalized = path.toLowerCase();
      return normalized.includes("\\microsoft visual studio\\") && normalized.includes("\\vc\\tools\\msvc\\");
    });
}

function findClionMingwBin() {
  if (process.platform !== "win32") {
    return undefined;
  }

  const jetbrainsRoot =
    process.env.JETBRAINS_ROOT ??
    (process.env.ProgramFiles === undefined ? undefined : join(process.env.ProgramFiles, "JetBrains"));
  const candidates =
    jetbrainsRoot !== undefined && existsSync(jetbrainsRoot)
      ? readdirSync(jetbrainsRoot)
          .filter((entry) => entry.startsWith("CLion"))
          .sort()
          .reverse()
          .map((entry) => join(jetbrainsRoot, entry, "bin", "mingw", "bin"))
      : [];

  return candidates.find((candidate) => canExecute(join(candidate, "gcc.exe")));
}

function copyBuiltSidecar(sourcePath) {
  const destinationPath = join(repoRoot, "target", "release", sidecarExecutable);
  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
}

function buildWithDefaultToolchain() {
  return runCargo(["build", "-p", sidecarPackage, "--release"]);
}

function buildWindowsGnu() {
  const rustupHome = process.env.RUSTUP_HOME ?? join(process.env.USERPROFILE ?? "", ".rustup");
  const gnuToolchain = join(rustupHome, "toolchains", "stable-x86_64-pc-windows-gnu");
  const selfContainedBin = join(
    gnuToolchain,
    "lib",
    "rustlib",
    "x86_64-pc-windows-gnu",
    "bin",
    "self-contained"
  );
  const toolPaths = existingPaths([findClionMingwBin(), selfContainedBin]);

  if (!existsSync(gnuToolchain) || toolPaths.length === 0) {
    console.error(
      [
        "Windows sidecar builds require either MSVC Build Tools with link.exe,",
        "or the Rust GNU toolchain plus MinGW binutils.",
        "Install one of:",
        "- Visual Studio Build Tools with Desktop development with C++",
        "- rustup toolchain install stable-x86_64-pc-windows-gnu and MinGW binutils"
      ].join("\n")
    );
    return 1;
  }

  const status = runCargo(["+stable-x86_64-pc-windows-gnu", "build", "-p", sidecarPackage, "--release"], {
    ...process.env,
    PATH: `${toolPaths.join(delimiter)}${delimiter}${process.env.PATH ?? ""}`
  });

  if (status !== 0) {
    return status;
  }

  const targetTriplePath = join(repoRoot, "target", "x86_64-pc-windows-gnu", "release", sidecarExecutable);
  const defaultReleasePath = join(repoRoot, "target", "release", sidecarExecutable);

  if (existsSync(targetTriplePath)) {
    copyBuiltSidecar(targetTriplePath);
  } else if (!existsSync(defaultReleasePath)) {
    console.error(`sidecar build succeeded but '${sidecarExecutable}' was not found`);
    return 1;
  }

  return 0;
}

const exitCode = process.platform === "win32" && findMsvcLink() === undefined ? buildWindowsGnu() : buildWithDefaultToolchain();
process.exit(exitCode);
