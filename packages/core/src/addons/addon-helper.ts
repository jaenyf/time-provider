export class AddonHelper {
  /**
   * Defines a new entry on the runtime facade.
   * It has to be called before the builder freezes the runtime.
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
