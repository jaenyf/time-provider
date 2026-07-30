import type { IAnimationFrameScheduler } from "./types.ts";

export type WithAnimation = { animation: IAnimationFrameScheduler };

/**
 * Defines `.animation` as a non-writable, non-configurable own property -
 * called before the builder freezes the runtime (`Object.defineProperty`
 * requires an extensible, not-yet-frozen object).
 */
export function defineAnimationProperty<TRuntime extends object>(
  runtime: TRuntime,
  scheduler: IAnimationFrameScheduler,
): TRuntime & WithAnimation {
  Object.defineProperty(runtime, "animation", {
    value: scheduler,
    enumerable: true,
    configurable: false,
    writable: false,
  });
  return runtime as TRuntime & WithAnimation;
}
