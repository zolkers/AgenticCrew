const COMMANDS = new Set([
  "mission_control_snapshot",
  "workspace_snapshot",
  "create_workspace",
  "update_workspace_git_context",
  "refresh_workspace_git_status",
  "update_workspace_loadout",
  "skill_sources_snapshot",
  "harness_studio_snapshot",
  "create_harness_profile",
  "set_harness_profile_active",
  "update_harness_profile",
  "import_pi_extension",
  "set_pi_extension_active",
  "agent_studio_snapshot",
  "create_agent_template",
  "set_agent_template_active",
  "update_agent_template",
  "promote_agent_training_run",
  "settings_snapshot",
  "approve_skill_source_permissions",
  "inspect_cached_skill_source",
  "sync_github_skill_source",
  "sync_provider_models",
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
