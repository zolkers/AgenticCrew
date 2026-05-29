const COMMANDS = new Set([
  "mission_control_snapshot",
  "skill_sources_snapshot",
  "harness_studio_snapshot",
  "create_harness_profile",
  "set_harness_profile_active",
  "update_harness_profile",
  "agent_studio_snapshot",
  "create_agent_template",
  "set_agent_template_active",
  "update_agent_template",
  "settings_snapshot",
  "approve_skill_source_permissions",
  "inspect_cached_skill_source",
  "sync_github_skill_source",
  "update_ai_provider_settings"
]);

function assertCommand(command) {
  if (!COMMANDS.has(command)) {
    throw new Error(`Unsupported AgenticCrew command: ${command}`);
  }
}

module.exports = {
  COMMANDS,
  assertCommand
};
