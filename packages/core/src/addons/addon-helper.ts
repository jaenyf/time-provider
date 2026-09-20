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
   * @param newPropertyPath where to add the property, relative to `runtime`. A bare name
   * (`"eta"`) puts it at the root; a dotted path walks the facets first, so an addon that
   * schedules callbacks passes `"scheduler.cron"` and lands beside `timers` and `microtasks`
   * rather than at the root. Every segment but the last must already exist on `runtime`.
   * @param facade the value of the new property - the addon's public-facing surface, not the
   * addon instance itself: an addon also carries lifecycle members (`.runtime`,
   * `.applyToRuntime`, `.dispose`, ...) that a consumer reaching `runtime.<newPropertyPath>` has
   * no business calling, so those shouldn't come along for the ride.
   * @param addon the addon instance itself - registered with `runtime` so it gets disposed when
   * `runtime` does, independently of whatever `facade` exposes.
   * @param onlyIfPathExists what to do when a segment of `newPropertyPath` is missing, which
   * happens when the property belongs to another addon's facade and that addon was not composed
   * (or was composed after this one). `false`, the default, throws: the host is expected to be
   * there. `true` makes the whole call a no-op instead - for a property an addon contributes to
   * another's facade as a bonus, such as the native-shaped aliases the animation and idle addons
   * add to `compat`. Declare such a property optional (`compat?:`) in the addon's public type,
   * since it is only there when both addons are composed.
   * @returns `runtime`, typed as extended with the new property.
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
