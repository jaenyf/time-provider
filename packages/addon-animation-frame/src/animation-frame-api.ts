import {
  AddonHelper,
  type IAddon,
  type IRuntime,
  type IScheduledHandle,
} from "@time-provider/core";
import type { IAnimationFrameScheduler } from "./types.ts";

export function applyAnimationFrameApi<TDate>(
  runtime: IRuntime<TDate>,
  addon: IAddon<TDate>,
  facade: object,
  scheduleFrame: IAnimationFrameScheduler<TDate>["scheduleFrame"],
): void {
  AddonHelper.extendRuntimeWithProperty(runtime, "scheduler.animation", facade, addon);
  // The native-shaped aliases, added only when the compat addon is composed before this one.
  AddonHelper.extendRuntimeWithProperty(
    runtime,
    "compat.requestAnimationFrame",
    scheduleFrame,
    addon,
    true,
  );
  AddonHelper.extendRuntimeWithProperty(
    runtime,
    "compat.cancelAnimationFrame",
    (handle: IScheduledHandle) => handle.dispose(),
    addon,
    true,
  );
}
