import type {
  CreateHarnessProfileRequest,
  HarnessStudioSnapshot,
  SetHarnessProfileActiveRequest,
  UpdateHarnessProfileRequest
} from "../types/core";

export type HarnessStudioCommand =
  | "create_harness_profile"
  | "harness_studio_snapshot"
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
