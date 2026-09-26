/**
 * The Idle addon for Time-Provider's deterministic runtimes: idle callbacks run when the
 * test drains them.
 *
 * @module
 */
import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import { DeterministicIdleScheduler } from "./deterministic-idle-scheduler.ts";
import type { WithDeterministicIdleApi } from "./types.ts";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";

export type {
  IIdleApi,
  WithIdleApi,
  IDeterministicIdleApi,
  WithDeterministicIdleApi,
} from "./types.ts";
export { DeterministicIdleScheduler } from "./deterministic-idle-scheduler.ts";

type DeterministicIdleAddon<TDate> = WithDeterministicIdleApi & IDeterministicAddon<TDate>;

class DeterministicIdleAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  DeterministicIdleAddon<TDate>
> {
  create(): DeterministicIdleAddon<TDate> {
    return new DeterministicIdleScheduler<TDate>() as unknown as DeterministicIdleAddon<TDate>;
  }
}

/**
 * The idle addon-builder for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `idle` property backed by the runtime's
 * own tagged-timer index, drained on demand via `timeProvider.scheduler.idle.drain()` rather than the
 * runtime's own clock.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<DeterministicIdleAddon<TDate>> {
  return new DeterministicIdleAddonBuilder<TDate>(typeHint);
}
export default addon;
