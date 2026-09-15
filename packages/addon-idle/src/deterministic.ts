import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { DeterministicIdleScheduler } from "./deterministic-idle-scheduler.ts";
import type { WithDeterministicIdleApi } from "./types.ts";

export type {
  IIdleApi,
  WithIdleApi,
  IDeterministicIdleApi,
  WithDeterministicIdleApi,
} from "./types.ts";
export { DeterministicIdleScheduler } from "./deterministic-idle-scheduler.ts";

type DeterministicIdleAddon<TDate> = WithDeterministicIdleApi & IAddon<TDate>;

/**
 * Extra builder method contributed by the deterministic idle addon-builder when composed via
 * `createTimeProvider.for(plugin).use(addon)`.
 */
export interface IIdleBuilderExtra {
  /**
   * Sets the simulated idle delay driving `request` on the resulting Time-Provider's
   * `idle` API. Defaults to 1ms - see {@link DeterministicIdleScheduler.idleDelay}.
   * @param delayMilliseconds how far the runtime's clock must move forward before an idle
   * callback runs, in milliseconds.
   * @returns self, for chaining with the rest of the builder.
   */
  withIdleDelay<TBuilder>(this: TBuilder, delayMilliseconds: number): TBuilder;
}

/**
 * The idle addon-builder for a deterministic Time-Provider - constructed by `addon()` below and
 * composed via `createTimeProvider.for(plugin).use(addon)`, adding an `idle` property backed by
 * the runtime's own simulated clock instead of the host's native idle periods.
 *
 * `withIdleDelay` is assigned in the constructor as a plain function expression, not a class
 * method: `.use()` splices it onto the runtime-builder chain by copying the reference, so it
 * actually runs with the runtime-builder as `this`, not this addon-builder - a class method would
 * only see the runtime-builder if called that way too. The delay it captures is read back in
 * {@link create} through `#getIdleDelay` rather than a class field, for the same reason a class
 * field wouldn't be reachable from that reassigned `this` either. It's exposed on the
 * runtime-builder's *type* via the `declare module` augmentation below, not via `.use()`'s own
 * generics: TypeScript can't simultaneously infer both the addon's `TDate` and an arbitrary extra
 * builder-chain shape from one addon-builder factory argument (see `AddonBuilderFactory` in
 * `@time-provider/core`), so `.use()` only ever resolves the former.
 */
class DeterministicIdleAddonBuilder<TDate>
  extends AddonBuilderBase<TDate, DeterministicIdleAddon<TDate>>
  implements IIdleBuilderExtra
{
  #getIdleDelay: () => number | undefined;

  withIdleDelay: <TBuilder>(this: TBuilder, delayMilliseconds: number) => TBuilder;

  constructor(typeHint?: TDate) {
    super(typeHint);
    let idleDelay: number | undefined;
    this.#getIdleDelay = () => idleDelay;
    this.withIdleDelay = function <TBuilder>(this: TBuilder, delayMilliseconds: number): TBuilder {
      idleDelay = delayMilliseconds;
      return this;
    };
  }

  create(): DeterministicIdleAddon<TDate> {
    const scheduler = new DeterministicIdleScheduler<TDate>();
    const idleDelay = this.#getIdleDelay();
    if (idleDelay !== undefined) {
      scheduler.idleDelay = idleDelay;
    }
    return scheduler as unknown as DeterministicIdleAddon<TDate>;
  }
}

/**
 * The idle addon-builder for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `idle` property backed by the runtime's
 * own simulated clock instead of the host's native idle periods.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(
  typeHint?: TDate,
): IAddonBuilder<DeterministicIdleAddon<TDate>> & IIdleBuilderExtra {
  return new DeterministicIdleAddonBuilder<TDate>(typeHint);
}
export default addon;

declare module "@time-provider/core/deterministic" {
  // biome-ignore lint/correctness/noUnusedVariables: TExtra isn't referenced by withIdleDelay
  // itself, but the augmented interface's own type-parameter list must match the original.
  interface IDeterministicPluggedRuntimeBuilder<TDate, TExtra = unknown> {
    /**
     * Sets the simulated idle delay driving `request` on the resulting Time-Provider's
     * `idle` API. Defaults to 1ms. Only meaningful once composed with this addon via `.use(addon)`;
     * declared here (rather than inferred through `.use()`) so TypeScript sees it as soon as this
     * module is imported.
     * @param delayMilliseconds how far the runtime's clock must move forward before an idle
     * callback runs, in milliseconds.
     * @returns self, for chaining with the rest of the builder.
     */
    withIdleDelay(delayMilliseconds: number): this;
  }

  // biome-ignore lint/correctness/noUnusedVariables: TExtra isn't referenced by withIdleDelay
  // itself, but the augmented interface's own type-parameter list must match the original.
  interface IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate, TExtra = unknown> {
    /** Same as {@link IDeterministicPluggedRuntimeBuilder.withIdleDelay}, for a UTC-only Time-Provider. */
    withIdleDelay(delayMilliseconds: number): this;
  }
}
