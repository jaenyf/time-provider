/** Deterministic Idle addon; idle callbacks run when explicitly drained.
 * @module */
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
 * Idle addon builder for deterministic Time-Providers. Adds `idle`, backed by the runtime's
 * tagged-timer index and drained on demand via `timeProvider.scheduler.idle.drain()`.
 * @param typeHint Unused; lets `.use()` infer `TDate`. See `AddonBuilderFactory`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<DeterministicIdleAddon<TDate>> {
  return new DeterministicIdleAddonBuilder<TDate>(typeHint);
}
export default addon;
