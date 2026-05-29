import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const compose = readFileSync("docker-compose.yml", "utf8");

const expectedScripts = {
  "docker:desktop:test": "docker compose run --rm desktop-test",
  "docker:frontend": "docker compose up --build frontend",
  "docker:quality": "docker compose run --rm quality"
};

for (const [name, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[name] !== command) {
    throw new Error(`package.json script '${name}' must be '${command}'`);
  }
}

for (const requiredFragment of [
  "dockerfile: docker/Dockerfile",
  "desktop-test:",
  "command: npm run desktop:test",
  "quality:"
]) {
  if (!compose.includes(requiredFragment)) {
    throw new Error(`docker-compose.yml must include '${requiredFragment}'`);
  }
}

console.log("docker config ok");
