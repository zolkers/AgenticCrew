const assert = require("node:assert/strict");
const test = require("node:test");
const { assertCommand } = require("./contracts.cjs");

test("accepts known snapshot commands", () => {
  assert.doesNotThrow(() => {
    assertCommand("mission_control_snapshot");
    assertCommand("workspace_snapshot");
    assertCommand("create_workspace");
    assertCommand("update_workspace_git_context");
    assertCommand("refresh_workspace_git_status");
    assertCommand("update_workspace_loadout");
    assertCommand("skill_sources_snapshot");
    assertCommand("harness_studio_snapshot");
    assertCommand("create_harness_profile");
    assertCommand("set_harness_profile_active");
    assertCommand("update_harness_profile");
    assertCommand("import_pi_extension");
    assertCommand("set_pi_extension_active");
    assertCommand("agent_studio_snapshot");
    assertCommand("create_agent_template");
    assertCommand("set_agent_template_active");
    assertCommand("update_agent_template");
    assertCommand("promote_agent_training_run");
    assertCommand("settings_snapshot");
    assertCommand("sync_github_skill_source");
    assertCommand("sync_provider_models");
    assertCommand("update_ai_provider_settings");
  });
});

test("rejects unknown commands", () => {
  assert.throws(() => assertCommand("delete_everything"), /Unsupported AgenticCrew command/u);
});
