import type { HarnessStudioSnapshot } from "../types/core";

export type InvokeHarnessStudio = (command: "harness_studio_snapshot") => Promise<HarnessStudioSnapshot>;

export async function loadHarnessStudioSnapshot(
  invoke: InvokeHarnessStudio
): Promise<HarnessStudioSnapshot> {
  return invoke("harness_studio_snapshot");
}
