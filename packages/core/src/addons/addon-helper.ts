/**
 * Utilities for addon authors to extend a runtime with additional, addon-specific commodities.
 */
export class AddonHelper {
  /**
   * Defines a new entry on the runtime facade.
   * It has to be called before the builder freezes the runtime.
   * @param runtime the runtime instance to extend.
   * @param newPropertyName the name of the property to add to `runtime`.
   * @param newProperty the value of the new property.
   * @param _typeOf unused at runtime; only carries `TProperty` so it can be inferred at the call site.
   * @returns `runtime`, typed as extended with the new property.
   */
  static extendRuntimeWithProperty<
    TRuntime extends object,
    TPropertyValue extends object,
    TProperty extends object,
  >(
    runtime: TRuntime,
    newPropertyName: string,
    newProperty: TPropertyValue,
    _typeOf?: TProperty,
  ): TRuntime & TProperty {
    Object.defineProperty(runtime, newPropertyName, {
      value: newProperty,
      enumerable: true,
      configurable: false,
      writable: false,
    });
    return runtime as TRuntime & TProperty;
  }
}
