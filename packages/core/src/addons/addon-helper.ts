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
   * @returns `runtime`, typed as extended with the new property.
   */
  static extendRuntimeWithProperty<TDate, TAddonType>(
    runtime: IRuntime<TDate>,
    newPropertyName: string,
    addon: IAddon<TDate>,
  ): IRuntime<TDate> & TAddonType {
    Object.defineProperty(runtime, newPropertyName, {
      value: addon,
      enumerable: true,
      configurable: false,
      writable: false,
    });
    runtime.registerAddon(addon);
    return runtime as IRuntime<TDate> & TAddonType;
  }
}
