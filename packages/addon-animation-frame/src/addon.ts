import type { IAddonBuilder } from "@time-provider/core";
import { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

/**
 * The animation-frame addon-builder for a system (real time) Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `animation` property backed by the
 * host's real `requestAnimationFrame`.
 */
export function addon<TDate>(): IAddonBuilder<SystemAnimationFrameScheduler<TDate>> {
  return { create: () => new SystemAnimationFrameScheduler<TDate>() };
}
