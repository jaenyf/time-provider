/**
 * The Animation Frame addon for Time-Provider's deterministic runtimes: frames run as the
 * runtime's clock advances.
 *
 * @module
 */
import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";
import type { WithAnimationFrameApi } from "./types.ts";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";

export type {
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";

type DeterministicAnimationFrameAddon<TDate> = WithAnimationFrameApi<TDate> &
  IDeterministicAddon<TDate>;

/**
 * Extra builder method contributed by the deterministic animation-frame addon-builder when
 * composed via `createTimeProvider.for(plugin).use(addon)`.
 */
export interface IAnimationFrameBuilderExtra {
  /**
   * Sets the simulated host display refresh rate (in Hz) driving `requestAnimationFrame` on the
   * resulting Time-Provider's `animation` API. Defaults to 60.
   * @param rate the refresh rate in Hz.
   * @returns self, for chaining with the rest of the builder.
   */
  withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder;
}

/**
 * The animation-frame addon-builder for a deterministic Time-Provider - constructed by
 * `addon()` below and composed via `createTimeProvider.for(plugin).use(addon)`, adding an
 * `animation` property backed by the runtime's own simulated clock instead of the host's real
 * display refresh.
 *
 * `withHostFramesRate` is assigned in the constructor as a plain function expression, not a
 * class method: `.use()` splices it onto the runtime-builder chain by copying the reference, so
 * it actually runs with the runtime-builder as `this`, not this addon-builder - a class method
 * would only see the runtime-builder if called that way too. The rate it captures is read back in
 * {@link create} through `#getHostFramesRate` rather than a class field, for the same reason a
 * class field wouldn't be reachable from that reassigned `this` either. It's exposed on the
 * runtime-builder's *type* by {@link addon} below declaring it in its return type, which
 * `.use()` infers as its `TBuilderExtra` (see `AddonBuilderFactory` in `@time-provider/core`).
 * That binds the method to the builder chain the addon was actually composed into, so it isn't
 * offered on a chain that never used this addon - where calling it would throw.
 */
class DeterministicAnimationFrameAddonBuilder<TDate>
  extends AddonBuilderBase<TDate, DeterministicAnimationFrameAddon<TDate>>
  implements IAnimationFrameBuilderExtra
{
  #getHostFramesRate: () => number | undefined;

  withHostFramesRate: <TBuilder>(this: TBuilder, rate: number) => TBuilder;

  constructor(typeHint?: TDate) {
    super(typeHint);
    let hostFramesRate: number | undefined;
    this.#getHostFramesRate = () => hostFramesRate;
    this.withHostFramesRate = function <TBuilder>(this: TBuilder, rate: number): TBuilder {
      hostFramesRate = rate;
      return this;
    };
  }

  create(): DeterministicAnimationFrameAddon<TDate> {
    const scheduler = new DeterministicAnimationFrameScheduler<TDate>();
    const hostFramesRate = this.#getHostFramesRate();
    if (hostFramesRate !== undefined) {
      scheduler.hostFramesRate = hostFramesRate;
    }
    return scheduler as unknown as DeterministicAnimationFrameAddon<TDate>;
  }
}

/**
 * The animation-frame addon-builder for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `animation` property backed by the
 * runtime's own simulated clock instead of the host's real display refresh.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(
  typeHint?: TDate,
): IAddonBuilder<DeterministicAnimationFrameAddon<TDate>> & IAnimationFrameBuilderExtra {
  return new DeterministicAnimationFrameAddonBuilder<TDate>(typeHint);
}
export default addon;
