import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const compose = readFileSync("docker-compose.yml", "utf8");

const expectedScripts = {
  "docker:desktop:test": "docker compose run --rm desktop-test",
  "docker:down": "docker compose down",
  "docker:frontend": "docker compose up --build frontend",
  "docker:logs": "docker compose logs -f frontend",
  "docker:ps": "docker compose ps",
  "docker:quality": "docker compose run --rm quality",
  "docker:up": "docker compose up --build -d frontend",
  "docker:verify": "node scripts/verify-docker-config.mjs"
};

for (const [name, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[name] !== command) {
    throw new Error(`package.json script '${name}' must be '${command}'`);
  }
}

for (const requiredFragment of [
  "dockerfile: docker/Dockerfile",
  "target: dev",
  ".:/workspace",
  "/workspace/node_modules",
  "/workspace/frontend/node_modules",
  "/workspace/target",
  "desktop-test:",
  "find node_modules frontend/node_modules",
  "healthcheck:",
  "npm ci",
  "npm run desktop:test",
  "quality:"
]) {
  if (!compose.includes(requiredFragment)) {
    throw new Error(`docker-compose.yml must include '${requiredFragment}'`);
  }
}

console.log("docker config ok");
