import type { IAddon, IAddonBuilder } from "../builders/builders.ts";

/**
 * Shared base for every addon-builder class - the builder-side counterpart to {@link AddonBase}.
 * An addon package's `addon()` factory constructs one of these and returns it as `IAddonBuilder`;
 * `.use()` calls {@link create} once, at Time-Provider creation time - not when composed - so a
 * subclass can accumulate configuration (e.g. the animation-frame addon's `withHostFramesRate`)
 * between `.use()` and `.create()`.
 *
 * `typeHint` is never read - it exists purely so TypeScript can infer a still-generic
 * `<TDate>(typeHint?: TDate) => IAddonBuilder<SomeAddon<TDate>>` factory's `TDate` from this
 * constructor parameter, the same way it infers `T` for `identity<T>(x: T): T` from a call's
 * argument. `.use()` receives that factory *by reference*, not called - reading `TDate` back out
 * of the addon-builder it eventually produces instead (without this parameter) is a different,
 * unsupported kind of inference that collapses `TDate` to `unknown`. See `AddonBuilderFactory` in
 * `../builders/builders.ts`.
 */
export abstract class AddonBuilderBase<
  TDate,
  TAddon extends IAddon<TDate>,
> implements IAddonBuilder<TAddon> {
  constructor(_typeHint?: TDate) {}

  abstract create(): TAddon;
}
