import {
  AddonHelper,
  type IAddon,
  type IRuntime,
  type IScheduledHandle,
} from "@time-provider/core";
import type { IIdleApi } from "./types.ts";

export function applyIdleApi<TDate>(
  runtime: IRuntime<TDate>,
  addon: IAddon<TDate>,
  facade: object,
  request: IIdleApi["request"],
): void {
  AddonHelper.extendRuntimeWithProperty(runtime, "scheduler.idle", facade, addon);
  // The native-shaped aliases, added only when the compat addon is composed before this one.
  AddonHelper.extendRuntimeWithProperty(
    runtime,
    "compat.requestIdleCallback",
    request,
    addon,
    true,
  );
  AddonHelper.extendRuntimeWithProperty(
    runtime,
    "compat.cancelIdleCallback",
    (handle: IScheduledHandle) => handle.dispose(),
    addon,
    true,
  );
}
