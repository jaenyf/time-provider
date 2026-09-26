import type { IAddon, IAddonBuilder } from "../builders/builders.ts";

/** Base class for addon builders; `typeHint` enables `TDate` inference. */
export abstract class AddonBuilderBase<
  TDate,
  TAddon extends IAddon<TDate>,
> implements IAddonBuilder<TAddon> {
  /** `typeHint` exists only for `TDate` inference. */
  constructor(_typeHint?: TDate) {}

  abstract create(): TAddon;
}
