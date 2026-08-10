import { AddonHelper, type ISystemAddon } from "@time-provider/core";
import { type WithIdleApi } from "./types.ts";
import { SystemIdleScheduler } from "./system-idle-scheduler.ts";

export type { IdleHandle, IIdleApi, WithIdleApi } from "./types.ts";
export { SystemIdleScheduler } from "./system-idle-scheduler.ts";

function createAddon<TDate>(): ISystemAddon<TDate, WithIdleApi> {
  return {
    applyToRuntime(runtime) {
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "idle",
        new SystemIdleScheduler(),
        undefined as unknown as WithIdleApi,
      );
    },
    clone(): ISystemAddon<TDate, WithIdleApi> {
      return createAddon<TDate>();
    },
  };
}

/** The idle addon for a system (real time) Time-Provider. */
export const addon: ISystemAddon<unknown, WithIdleApi> = createAddon();
export default addon;
