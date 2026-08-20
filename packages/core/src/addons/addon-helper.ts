import type { IRuntime } from "../types/types.ts";
import type { IAddon } from "../builders/builders.ts";

/**
 * Utilities for addon authors to extend a runtime with additional, addon-specific commodities.
 */
export class AddonHelper {
  /**
   * Defines a new entry on the runtime facade.
   * It has to be called before the builder freezes the runtime.
   * @param runtime the runtime instance to extend.
   * @param newPropertyName the name of the property to add to `runtime`.
   * @param addon the value of the new property.
   * @param _typeOf unused at runtime; only carries `TProperty` so it can be inferred at the call site.
   * @returns `runtime`, typed as extended with the new property.
   */
  static extendRuntimeWithProperty<
    TDate,
    TRuntime extends IRuntime<TDate>,
    TAddon extends IAddon,
    TAddonType extends object,
  >(
    runtime: TRuntime,
    newPropertyName: string,
    addon: TAddon,
    _typeOf?: TAddonType,
  ): TRuntime & TAddonType {
    Object.defineProperty(runtime, newPropertyName, {
      value: addon,
      enumerable: true,
      configurable: false,
      writable: false,
    });
    runtime.registerAddon(addon);
    return runtime as TRuntime & TAddonType;
  }
}
