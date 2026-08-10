import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { AddonHelper } from "@time-provider/core";
import { DeterministicIdleScheduler } from "./deterministic-idle-scheduler.ts";
import { type WithIdleApi } from "./types.ts";

export type { IdleHandle, IIdleApi, WithIdleApi } from "./types.ts";
export { DeterministicIdleScheduler } from "./deterministic-idle-scheduler.ts";

/**
 * Extra builder method contributed by the deterministic idle addon when composed via
 * `createTimeProvider.for(plugin).use(addon)`.
 */
export interface IIdleBuilderExtra {
  /**
   * Sets the simulated idle delay driving `requestIdleCallback` on the resulting Time-Provider's
   * `idle` API. Defaults to 1ms - see {@link DeterministicIdleScheduler.idleDelay}.
   * @param delayMilliseconds how far the runtime's clock must move forward before an idle
   * callback runs, in milliseconds.
   * @returns self, for chaining with the rest of the builder.
   */
  withIdleDelay<TBuilder>(this: TBuilder, delayMilliseconds: number): TBuilder;
}

/**
 * Creates a new instance of the deterministic idle addon. Most consumers should use the
 * {@link addon} singleton instead; call this directly only when a fresh, independently
 * configured instance is needed (e.g. to compose it with two different Time-Providers using
 * different {@link IIdleBuilderExtra.withIdleDelay} settings).
 */
export function createAddon<TDate>(): IDeterministicAddon<TDate, WithIdleApi> & IIdleBuilderExtra {
  let idleDelay: number | undefined;
  return {
    applyToRuntime(runtime) {
      const scheduler = new DeterministicIdleScheduler(runtime.scheduler);
      if (idleDelay !== undefined) {
        scheduler.idleDelay = idleDelay;
      }
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "idle",
        scheduler,
        undefined as unknown as WithIdleApi,
      );
    },
    withIdleDelay<TBuilder>(this: TBuilder, delayMilliseconds: number): TBuilder {
      idleDelay = delayMilliseconds;
      return this;
    },
    clone(): IDeterministicAddon<TDate, WithIdleApi> {
      const cloned = createAddon<TDate>();
      if (idleDelay !== undefined) {
        cloned.withIdleDelay(idleDelay);
      }
      return cloned;
    },
  };
}

/**
 * The idle addon for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `idle` property backed by the runtime's
 * own simulated clock instead of the host's native idle periods.
 */
export const addon: IDeterministicAddon<unknown, WithIdleApi> & IIdleBuilderExtra = createAddon();
export default addon;
