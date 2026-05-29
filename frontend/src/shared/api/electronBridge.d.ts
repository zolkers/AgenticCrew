import type { ElectronCommandMap } from "../types/core";

declare global {
  interface Window {
    agenticcrew?: {
      invoke<Command extends keyof ElectronCommandMap>(
        command: Command,
        args?: Record<string, unknown>
      ): Promise<ElectronCommandMap[Command]>;
    };
  }
}

export {};
