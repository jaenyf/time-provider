import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";
import type { WithAnimationFrameApi } from "./types.ts";

export type {
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";

/**
 * What `.use()` actually needs to type the composed runtime with: an `animation` property,
 * nothing more. `DeterministicAnimationFrameScheduler` itself no longer declares that property on
 * itself (it would otherwise have to point back at itself, since it's also what ends up *behind*
 * `.animation` - see `deterministic-animation-frame-scheduler.ts`), so it no longer structurally
 * satisfies this on its own; the cast in {@link DeterministicAnimationFrameAddonBuilder.create}
 * is what bridges the two, once, right here.
 */
type DeterministicAnimationFrameAddon<TDate> = WithAnimationFrameApi<TDate> & IAddon<TDate>;

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
 * runtime-builder's *type* via the `declare module` augmentation below, not via `.use()`'s own
 * generics: TypeScript can't simultaneously infer both the addon's `TDate` and an arbitrary extra
 * builder-chain shape from one addon-builder factory argument (see `AddonBuilderFactory` in
 * `@time-provider/core`), so `.use()` only ever resolves the former.
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

declare module "@time-provider/core/deterministic" {
  // biome-ignore lint/correctness/noUnusedVariables: TExtra isn't referenced by withHostFramesRate
  // itself, but the augmented interface's own type-parameter list must match the original.
  interface IDeterministicPluggedRuntimeBuilder<TDate, TExtra = unknown> {
    /**
     * Sets the simulated host display refresh rate (in Hz) driving `requestAnimationFrame` on the
     * resulting Time-Provider's `animation` API. Defaults to 60. Only meaningful once composed
     * with this addon via `.use(addon)`; declared here (rather than inferred through `.use()`) so
     * TypeScript sees it as soon as this module is imported.
     * @param rate the refresh rate in Hz.
     * @returns self, for chaining with the rest of the builder.
     */
    withHostFramesRate(rate: number): this;
  }

  // biome-ignore lint/correctness/noUnusedVariables: TExtra isn't referenced by withHostFramesRate
  // itself, but the augmented interface's own type-parameter list must match the original.
  interface IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate, TExtra = unknown> {
    /** Same as {@link IDeterministicPluggedRuntimeBuilder.withHostFramesRate}, for a UTC-only Time-Provider. */
    withHostFramesRate(rate: number): this;
  }
}
