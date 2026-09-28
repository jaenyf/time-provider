import type { IScheduledHandle, MonotonicMilliseconds } from "@time-provider/core";

/** Receives the frame time, on the `clock.monotonicNow()` timeline. */
export type AnimationFrameCallback = (time: MonotonicMilliseconds) => void;

/** Adds `scheduler.animation` and optional native-shaped animation aliases. */
export type WithAnimationFrameApi<TDate> = {
  scheduler: {
    /** Schedules work before the next frame. */
    animation: IAnimationFrameScheduler<TDate>;
  };
  /** Optional native-shaped animation aliases. */
  compat?: {
    requestAnimationFrame(callback: AnimationFrameCallback): IScheduledHandle;
    cancelAnimationFrame(handle: IScheduledHandle): void;
  };
};

/** Animation-frame API exposed by the addon. */
// Kept generic over TDate for symmetry with WithAnimationFrameApi<TDate>, even though no member
// here happens to reference it.
// oxlint-disable-next-line no-unused-vars
export interface IAnimationFrameScheduler<TDate> {
  /** Schedules `callback` once before the next frame. */
  scheduleFrame(callback: AnimationFrameCallback): IScheduledHandle;
}

/** Adds `scheduler.animation` for deterministic runtimes. */
export type WithDeterministicAnimationFrameApi<TDate> = WithAnimationFrameApi<TDate> & {
  scheduler: {
    animation: IDeterministicAnimationFrameScheduler<TDate>;
  };
};

/** {@link IAnimationFrameScheduler} for deterministic runtimes. */
export interface IDeterministicAnimationFrameScheduler<
  TDate,
> extends IAnimationFrameScheduler<TDate> {
  /** Number of pending frame callbacks. */
  readonly pendingCount: number;
}
