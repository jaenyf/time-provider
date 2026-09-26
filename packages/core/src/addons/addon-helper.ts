import type { IRuntime } from "../types/types.ts";
import type { IAddon } from "../builders/builders.ts";

/** Utilities for extending a runtime with addon-specific properties. */
export class AddonHelper {
  /**
   * Adds a property to the runtime facade.
   * @param runtime The runtime to extend.
   * @param newPropertyPath The property path.
   * @param facade The public property value.
   * @param addon The addon instance.
   * @param onlyIfPathExists No-op when a path segment is missing.
   * @returns The extended runtime.
   * @throws If a path segment is missing and `onlyIfPathExists` is `false`.
   */
  static extendRuntimeWithProperty<TDate, TAddonType>(
    runtime: IRuntime<TDate>,
    newPropertyPath: string,
    facade: unknown,
    addon: IAddon<TDate>,
    onlyIfPathExists = false,
  ): IRuntime<TDate> & TAddonType {
    const segments = newPropertyPath.split(".");
    const newPropertyName = segments.pop()!;
    let host: object = runtime;
    for (const segment of segments) {
      const nextHost = (host as Record<string, object | undefined>)[segment];
      if (nextHost === undefined) {
        if (onlyIfPathExists) {
          return runtime as IRuntime<TDate> & TAddonType;
        }
        throw new Error(
          `Cannot define '${newPropertyPath}' on the runtime: '${segment}' does not exist. An addon that adds to another addon's facade has to be composed after it.`,
        );
      }
      host = nextHost;
    }
    Object.defineProperty(host, newPropertyName, {
      value: facade,
      enumerable: true,
      configurable: false,
      writable: false,
    });
    runtime.registerAddon(addon);
    return runtime as IRuntime<TDate> & TAddonType;
  }
}
