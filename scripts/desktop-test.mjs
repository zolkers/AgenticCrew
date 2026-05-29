import { accessSync, constants, existsSync, readdirSync } from "node:fs";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const desktopRoot = repoRoot;

function commandOutput(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform !== "win32",
    ...options
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

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: desktopRoot,
    env,
    shell: false,
    stdio: "inherit"
  });

  return result.status ?? 1;
}

function runDefaultCargoTest() {
  return run("cargo", ["test"]);
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
    (process.env.ProgramFiles === undefined
      ? undefined
      : join(process.env.ProgramFiles, "JetBrains"));
  const candidates = jetbrainsRoot !== undefined && existsSync(jetbrainsRoot)
    ? readdirSync(jetbrainsRoot)
        .filter((entry) => entry.startsWith("CLion"))
        .sort()
        .reverse()
        .map((entry) => join(jetbrainsRoot, entry, "bin", "mingw", "bin"))
    : [];

  return candidates.find((candidate) => canExecute(join(candidate, "gcc.exe")));
}

function runWindowsCargoTest() {
  if (findMsvcLink() !== undefined) {
    return runDefaultCargoTest();
  }

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
  const clionMingwBin = findClionMingwBin();
  const cargoTargetBin = fileURLToPath(new URL("../target/debug", import.meta.url));
  const toolPaths = existingPaths([clionMingwBin, selfContainedBin, cargoTargetBin]);

  if (!existsSync(gnuToolchain) || toolPaths.length === 0) {
    console.error(
      [
        "Windows desktop tests require either MSVC Build Tools with link.exe,",
        "or the Rust GNU toolchain plus MinGW binutils.",
        "Install one of:",
        "- Visual Studio Build Tools with Desktop development with C++",
        "- rustup toolchain install stable-x86_64-pc-windows-gnu and MinGW binutils"
      ].join("\n")
    );
    return 1;
  }

  return run("cargo", ["+stable-x86_64-pc-windows-gnu", "test"], {
    ...process.env,
    PATH: `${toolPaths.join(delimiter)}${delimiter}${process.env.PATH ?? ""}`
  });
}

process.chdir(repoRoot);
const exitCode = process.platform === "win32" ? runWindowsCargoTest() : runDefaultCargoTest();
process.exit(exitCode);
