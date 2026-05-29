const assert = require("node:assert/strict");
const test = require("node:test");
const { assertCommand } = require("./contracts.cjs");

test("accepts known snapshot commands", () => {
  assert.doesNotThrow(() => {
    assertCommand("mission_control_snapshot");
    assertCommand("skill_sources_snapshot");
    assertCommand("harness_studio_snapshot");
    assertCommand("create_harness_profile");
    assertCommand("set_harness_profile_active");
    assertCommand("agent_studio_snapshot");
    assertCommand("create_agent_template");
    assertCommand("set_agent_template_active");
    assertCommand("settings_snapshot");
    assertCommand("sync_github_skill_source");
    assertCommand("update_ai_provider_settings");
  });
});

test("rejects unknown commands", () => {
  assert.throws(() => assertCommand("delete_everything"), /Unsupported AgenticCrew command/u);
});
