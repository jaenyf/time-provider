import type { IScheduledHandle } from "@time-provider/core";

/** Adds `scheduler.animation` and optional native-shaped animation aliases. */
export type WithAnimationFrameApi<TDate> = {
  scheduler: {
    /** Schedules work before the next frame. */
    animation: IAnimationFrameScheduler<TDate>;
  };
  /** Optional native-shaped animation aliases. */
  compat?: {
    requestAnimationFrame(callback: () => void): IScheduledHandle;
    cancelAnimationFrame(handle: IScheduledHandle): void;
  };
};

/** Animation-frame API exposed by the addon. */
// Kept generic over TDate for symmetry with WithAnimationFrameApi<TDate>, even though no member
// here happens to reference it.
// oxlint-disable-next-line no-unused-vars
export interface IAnimationFrameScheduler<TDate> {
  /** Schedules `callback` once before the next frame. */
  scheduleFrame(callback: () => void): IScheduledHandle;
}
