const COMMANDS = new Set([
  "mission_control_snapshot",
  "skill_sources_snapshot",
  "harness_studio_snapshot",
  "agent_studio_snapshot",
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
