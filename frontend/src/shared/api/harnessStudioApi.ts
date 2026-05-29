import type {
  CreateHarnessProfileRequest,
  HarnessStudioSnapshot,
  ImportPiExtensionRequest,
  SetHarnessProfileActiveRequest,
  SetPiExtensionActiveRequest,
  UpdateHarnessProfileRequest
} from "../types/core";

export type HarnessStudioCommand =
  | "create_harness_profile"
  | "harness_studio_snapshot"
  | "import_pi_extension"
  | "set_pi_extension_active"
  | "set_harness_profile_active"
  | "update_harness_profile";

export type InvokeHarnessStudio = (
  command: HarnessStudioCommand,
  args?: Record<string, unknown>
) => Promise<HarnessStudioSnapshot>;

export async function loadHarnessStudioSnapshot(
  invoke: InvokeHarnessStudio
): Promise<HarnessStudioSnapshot> {
  return invoke("harness_studio_snapshot");
}

export async function createHarnessProfile(
  invoke: InvokeHarnessStudio,
  request: CreateHarnessProfileRequest
): Promise<HarnessStudioSnapshot> {
  return invoke("create_harness_profile", { request });
}

export async function setHarnessProfileActive(
  invoke: InvokeHarnessStudio,
  request: SetHarnessProfileActiveRequest
): Promise<HarnessStudioSnapshot> {
  return invoke("set_harness_profile_active", { request });
}

export async function updateHarnessProfile(
  invoke: InvokeHarnessStudio,
  request: UpdateHarnessProfileRequest
): Promise<HarnessStudioSnapshot> {
  return invoke("update_harness_profile", { request });
}

export async function importPiExtension(
  invoke: InvokeHarnessStudio,
  request: ImportPiExtensionRequest
): Promise<HarnessStudioSnapshot> {
  return invoke("import_pi_extension", { request });
}

export async function setPiExtensionActive(
  invoke: InvokeHarnessStudio,
  request: SetPiExtensionActiveRequest
): Promise<HarnessStudioSnapshot> {
  return invoke("set_pi_extension_active", { request });
}
