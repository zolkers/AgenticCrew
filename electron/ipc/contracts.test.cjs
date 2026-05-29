const assert = require("node:assert/strict");
const test = require("node:test");
const { assertCommand } = require("./contracts.cjs");

test("accepts known snapshot commands", () => {
  assert.doesNotThrow(() => {
    assertCommand("mission_control_snapshot");
    assertCommand("skill_sources_snapshot");
    assertCommand("harness_studio_snapshot");
    assertCommand("agent_studio_snapshot");
    assertCommand("sync_github_skill_source");
  });
});

test("rejects unknown commands", () => {
  assert.throws(() => assertCommand("delete_everything"), /Unsupported AgenticCrew command/u);
});
